using System.Data;
using KCStoreCore.Application.DTOs.StockReceipts;
using KCStoreCore.Application.Interfaces;
using KCStoreCore.Domain.Entities;
using KCStoreCore.Domain.Enums;
using KCStoreCore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KCStoreCore.Infrastructure.Services;

public class StockReceiptService : IStockReceiptService
{
    private readonly KCStoreCoreDbContext _context;

    public StockReceiptService(KCStoreCoreDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<StockReceiptResponse>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var receipts = await ReceiptQuery()
            .OrderByDescending(x => x.ReceivedAtUtc)
            .ToListAsync(cancellationToken);

        return receipts.Select(MapToResponse).ToList();
    }

    public async Task<StockReceiptResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var receipt = await ReceiptQuery()
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        return receipt is null
            ? null
            : MapToResponse(receipt);
    }

    public async Task<IReadOnlyList<StockReceiptResponse>>
        GetByPurchaseOrderAsync(
            Guid purchaseOrderId,
            CancellationToken cancellationToken = default)
    {
        var receipts = await ReceiptQuery()
            .Where(x => x.PurchaseOrderId == purchaseOrderId)
            .OrderByDescending(x => x.ReceivedAtUtc)
            .ToListAsync(cancellationToken);

        return receipts.Select(MapToResponse).ToList();
    }

    public async Task<StockReceiptResponse> CreateAsync(
        CreateStockReceiptRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (request.PurchaseOrderId == Guid.Empty)
        {
            throw new ArgumentException(
                "A valid purchase order ID is required.");
        }

        var receiptNumber = request.ReceiptNumber?.Trim();

        if (string.IsNullOrWhiteSpace(receiptNumber) ||
            receiptNumber.Length > 50)
        {
            throw new ArgumentException(
                "Receipt number must contain between 1 and 50 characters.");
        }

        if (request.Notes?.Length > 1000)
        {
            throw new ArgumentException(
                "Notes cannot exceed 1000 characters.");
        }

        if (request.Items is null || request.Items.Count == 0)
        {
            throw new ArgumentException(
                "A stock receipt must contain at least one item.");
        }

        if (request.Items.Any(x => x is null))
        {
            throw new ArgumentException(
                "Stock receipt items cannot be null.");
        }

        if (request.Items.Any(x =>
            x.PurchaseOrderItemId == Guid.Empty ||
            x.QuantityReceived <= 0))
        {
            throw new ArgumentException(
                "Every receipt item must have a valid purchase order " +
                "item ID and a quantity greater than zero.");
        }

        var itemIds = request.Items
            .Select(x => x.PurchaseOrderItemId)
            .ToList();

        if (itemIds.Distinct().Count() != itemIds.Count)
        {
            throw new ArgumentException(
                "A purchase order item cannot appear more than once " +
                "in the same receipt.");
        }

        // Serializable isolation protects outstanding quantities
        // while the receipt is being validated and saved.
        await using var transaction =
            await _context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);

        var order = await _context.PurchaseOrders
            .Include(x => x.Items)
                .ThenInclude(x => x.ReceiptItems)
            .FirstOrDefaultAsync(
                x => x.Id == request.PurchaseOrderId,
                cancellationToken);

        if (order is null)
        {
            throw new KeyNotFoundException(
                "Purchase order not found.");
        }

        if (order.Status != "Ordered" &&
            order.Status != "Partially Received")
        {
            throw new InvalidOperationException(
                "Only ordered or partially received purchase orders " +
                "can receive stock.");
        }

        var duplicateReceiptNumber = await _context.StockReceipts
            .AnyAsync(
                x => x.ReceiptNumber == receiptNumber,
                cancellationToken);

        if (duplicateReceiptNumber)
        {
            throw new InvalidOperationException(
                "A stock receipt with this receipt number already exists.");
        }

        var orderItems = order.Items.ToDictionary(x => x.Id);

        foreach (var requestedItem in request.Items)
        {
            if (!orderItems.TryGetValue(
                requestedItem.PurchaseOrderItemId,
                out var orderItem))
            {
                throw new ArgumentException(
                    "A receipt item does not belong to the selected " +
                    "purchase order.");
            }

            var previouslyReceived = orderItem.ReceiptItems
                .Sum(x => (long)x.QuantityReceived);

            var outstanding =
                (long)orderItem.QuantityOrdered - previouslyReceived;

            if (outstanding < requestedItem.QuantityReceived)
            {
                throw new InvalidOperationException(
                    $"Cannot receive {requestedItem.QuantityReceived} " +
                    $"units for product {orderItem.ProductId}. " +
                    $"Only {outstanding} units remain outstanding.");
            }
        }

        var now = DateTime.UtcNow;

        var receipt = new StockReceipt
        {
            PurchaseOrderId = order.Id,
            ReceiptNumber = receiptNumber,
            ReceivedAtUtc = now,
            Notes = request.Notes?.Trim()
        };

        _context.StockReceipts.Add(receipt);

        foreach (var requestedItem in request.Items)
        {
            var orderItem = orderItems[
                requestedItem.PurchaseOrderItemId];

            var inventory = await _context.StoreInventories
                .FirstOrDefaultAsync(
                    x => x.StoreId == order.StoreId &&
                         x.ProductId == orderItem.ProductId,
                    cancellationToken);

            if (inventory is null)
            {
                inventory = new StoreInventory
                {
                    StoreId = order.StoreId,
                    ProductId = orderItem.ProductId,
                    QuantityOnHand = 0,
                    ReorderLevel = 0,
                    CreatedAtUtc = now
                };

                _context.StoreInventories.Add(inventory);
            }

            var quantityBefore = inventory.QuantityOnHand;

            if (requestedItem.QuantityReceived >
                int.MaxValue - quantityBefore)
            {
                throw new InvalidOperationException(
                    "Receiving this quantity would exceed the " +
                    "maximum supported inventory quantity.");
            }

            var quantityAfter =
                quantityBefore + requestedItem.QuantityReceived;

            inventory.QuantityOnHand = quantityAfter;
            inventory.UpdatedAtUtc = now;

            receipt.Items.Add(new StockReceiptItem
            {
                PurchaseOrderItemId = orderItem.Id,
                QuantityReceived = requestedItem.QuantityReceived
            });

            _context.InventoryTransactions.Add(
                new InventoryTransaction
                {
                    StoreId = order.StoreId,
                    ProductId = orderItem.ProductId,
                    TransactionType =
                        InventoryTransactionType.PurchaseReceipt,
                    QuantityChange = requestedItem.QuantityReceived,
                    QuantityBefore = quantityBefore,
                    QuantityAfter = quantityAfter,
                    ReferenceNumber = receiptNumber,
                    Notes = $"Stock received for purchase order " +
                            $"{order.OrderNumber}.",
                    CreatedAtUtc = now
                });
        }

        // Include both previous receipts and the current delivery
        // when determining the purchase order status.
        var receivedNow = request.Items.ToDictionary(
            x => x.PurchaseOrderItemId,
            x => x.QuantityReceived);

        var allItemsFullyReceived = order.Items.All(item =>
        {
            var previous = item.ReceiptItems
                .Sum(x => (long)x.QuantityReceived);

            var current = receivedNow.GetValueOrDefault(item.Id);

            return previous + current == item.QuantityOrdered;
        });

        order.Status = allItemsFullyReceived
            ? "Received"
            : "Partially Received";

        order.UpdatedAtUtc = now;

        // Save receipt, inventory balances, audit history,
        // and purchase order status atomically.
        await _context.SaveChangesAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        return await GetRequiredReceiptAsync(
            receipt.Id,
            cancellationToken);
    }

    private IQueryable<StockReceipt> ReceiptQuery()
    {
        return _context.StockReceipts
            .AsTracking()
            .Include(x => x.PurchaseOrder)
                .ThenInclude(x => x.Store)
            .Include(x => x.Items)
                .ThenInclude(x => x.PurchaseOrderItem)
                    .ThenInclude(x => x.Product)
            .Include(x => x.Items)
                .ThenInclude(x => x.PurchaseOrderItem)
                    .ThenInclude(x => x.ReceiptItems)
            .AsSplitQuery();
    }

    private async Task<StockReceiptResponse> GetRequiredReceiptAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        return await GetByIdAsync(id, cancellationToken)
            ?? throw new InvalidOperationException(
                "The stock receipt could not be retrieved.");
    }

    private static StockReceiptResponse MapToResponse(
        StockReceipt receipt)
    {
        var items = receipt.Items.Select(item =>
        {
            var orderItem = item.PurchaseOrderItem;

            var totalReceived = orderItem.ReceiptItems
                .Sum(x => (long)x.QuantityReceived);

            return new StockReceiptItemResponse
            {
                Id = item.Id,
                PurchaseOrderItemId = item.PurchaseOrderItemId,
                ProductId = orderItem.ProductId,
                ProductSku = orderItem.Product.Sku,
                ProductName = orderItem.Product.Name,
                QuantityReceived = item.QuantityReceived,
                TotalQuantityReceived = checked((int)totalReceived),
                QuantityOutstanding = checked(
                    (int)(orderItem.QuantityOrdered - totalReceived))
            };
        }).ToList();

        return new StockReceiptResponse
        {
            Id = receipt.Id,
            PurchaseOrderId = receipt.PurchaseOrderId,
            PurchaseOrderNumber =
                receipt.PurchaseOrder.OrderNumber,
            ReceiptNumber = receipt.ReceiptNumber,
            StoreId = receipt.PurchaseOrder.StoreId,
            StoreName = receipt.PurchaseOrder.Store.Name,
            PurchaseOrderStatus =
                receipt.PurchaseOrder.Status,
            ReceivedAtUtc = receipt.ReceivedAtUtc,
            Notes = receipt.Notes,
            TotalUnitsReceived = checked(
                (int)items.Sum(x => (long)x.QuantityReceived)),
            Items = items
        };
    }
}