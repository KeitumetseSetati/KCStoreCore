using KCStoreCore.Application.DTOs.PurchaseOrders;
using KCStoreCore.Application.Interfaces;
using KCStoreCore.Domain.Entities;
using KCStoreCore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KCStoreCore.Infrastructure.Services;

public class PurchaseOrderService : IPurchaseOrderService
{
    private readonly KCStoreCoreDbContext _context;

    public PurchaseOrderService(KCStoreCoreDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<PurchaseOrderResponse>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var orders = await _context.PurchaseOrders
            .AsNoTracking()
            .Include(x => x.Supplier)
            .Include(x => x.Store)
            .Include(x => x.Items)
                .ThenInclude(x => x.Product)
            .Include(x => x.Items)
                .ThenInclude(x => x.ReceiptItems)
            .AsSplitQuery()
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return orders.Select(MapToResponse).ToList();
    }

    public async Task<PurchaseOrderResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var order = await _context.PurchaseOrders
            .AsNoTracking()
            .Include(x => x.Supplier)
            .Include(x => x.Store)
            .Include(x => x.Items)
                .ThenInclude(x => x.Product)
            .Include(x => x.Items)
                .ThenInclude(x => x.ReceiptItems)
            .AsSplitQuery()
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        return order is null ? null : MapToResponse(order);
    }

    public async Task<PurchaseOrderResponse> CreateAsync(
        CreatePurchaseOrderRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var orderNumber = request.OrderNumber?.Trim();

        if (string.IsNullOrWhiteSpace(orderNumber) ||
            orderNumber.Length > 50)
        {
            throw new ArgumentException(
                "Order number must contain between 1 and 50 characters.");
        }

        if (request.Items is null || request.Items.Count == 0)
        {
            throw new ArgumentException(
                "A purchase order must contain at least one item.");
        }

        if (request.Items.Any(x => x is null))
        {
            throw new ArgumentException(
                "Purchase order items cannot be null.");
        }

        if (request.Items.Any(x =>
            x.ProductId == Guid.Empty ||
            x.QuantityOrdered <= 0 ||
            x.UnitCost < 0 ||
            decimal.Round(x.UnitCost, 2) != x.UnitCost))
        {
            throw new ArgumentException(
                "Each item must have a valid product, a positive quantity, " +
                "and a non-negative unit cost with at most two decimal places.");
        }

        var productIds = request.Items
            .Select(x => x.ProductId)
            .ToList();

        if (productIds.Distinct().Count() != productIds.Count)
        {
            throw new ArgumentException(
                "A purchase order cannot contain the same product more than once.");
        }

        var supplierExists = await _context.Suppliers
            .AsNoTracking()
            .AnyAsync(
                x => x.Id == request.SupplierId && x.IsActive,
                cancellationToken);

        if (!supplierExists)
        {
            throw new ArgumentException(
                "The selected supplier does not exist or is inactive.");
        }

        var storeExists = await _context.Stores
            .AsNoTracking()
            .AnyAsync(
                x => x.Id == request.StoreId && x.IsActive,
                cancellationToken);

        if (!storeExists)
        {
            throw new ArgumentException(
                "The selected store does not exist or is inactive.");
        }

        var activeProductIds = await _context.Products
            .AsNoTracking()
            .Where(x => productIds.Contains(x.Id) && x.IsActive)
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        if (activeProductIds.Count != productIds.Count)
        {
            throw new ArgumentException(
                "One or more selected products do not exist or are inactive.");
        }

        var orderNumberExists = await _context.PurchaseOrders
            .AsNoTracking()
            .AnyAsync(
                x => x.OrderNumber == orderNumber,
                cancellationToken);

        if (orderNumberExists)
        {
            throw new InvalidOperationException(
                "A purchase order with this order number already exists.");
        }

        var order = new PurchaseOrder
        {
            OrderNumber = orderNumber,
            SupplierId = request.SupplierId,
            StoreId = request.StoreId,
            Status = "Draft",
            Items = request.Items.Select(x => new PurchaseOrderItem
            {
                ProductId = x.ProductId,
                QuantityOrdered = x.QuantityOrdered,
                UnitCost = x.UnitCost
            }).ToList()
        };

        _context.PurchaseOrders.Add(order);

        await _context.SaveChangesAsync(cancellationToken);

        return await GetRequiredOrderAsync(order.Id, cancellationToken);
    }

    public async Task<PurchaseOrderResponse> PlaceOrderAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var order = await _context.PurchaseOrders
            .Include(x => x.Items)
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (order is null)
        {
            throw new KeyNotFoundException(
                "Purchase order not found.");
        }

        if (order.Status != "Draft")
        {
            throw new InvalidOperationException(
                "Only draft purchase orders can be placed.");
        }

        if (order.Items.Count == 0)
        {
            throw new InvalidOperationException(
                "Cannot place a purchase order without items.");
        }

        order.Status = "Ordered";
        order.OrderedAtUtc = DateTime.UtcNow;
        order.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return await GetRequiredOrderAsync(id, cancellationToken);
    }

    public async Task<PurchaseOrderResponse> CancelAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var order = await _context.PurchaseOrders
            .Include(x => x.Items)
                .ThenInclude(x => x.ReceiptItems)
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (order is null)
        {
            throw new KeyNotFoundException(
                "Purchase order not found.");
        }

        if (order.Status != "Draft" &&
            order.Status != "Ordered")
        {
            throw new InvalidOperationException(
                "Only draft or ordered purchase orders can be cancelled.");
        }

        var hasReceivedStock = order.Items.Any(x =>
            x.ReceiptItems.Any());

        if (hasReceivedStock)
        {
            throw new InvalidOperationException(
                "Cannot cancel a purchase order that has received stock.");
        }

        order.Status = "Cancelled";
        order.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return await GetRequiredOrderAsync(id, cancellationToken);
    }

    private async Task<PurchaseOrderResponse> GetRequiredOrderAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        return await GetByIdAsync(id, cancellationToken)
            ?? throw new InvalidOperationException(
                "The purchase order could not be retrieved.");
    }

    private static PurchaseOrderResponse MapToResponse(
        PurchaseOrder order)
    {
        var items = order.Items.Select(item =>
        {
            var quantityReceived = item.ReceiptItems
                .Sum(x => x.QuantityReceived);

            return new PurchaseOrderItemResponse
            {
                Id = item.Id,
                ProductId = item.ProductId,
                ProductSku = item.Product.Sku,
                ProductName = item.Product.Name,
                QuantityOrdered = item.QuantityOrdered,
                QuantityReceived = quantityReceived,
                QuantityOutstanding =
                    item.QuantityOrdered - quantityReceived,
                UnitCost = item.UnitCost,
                LineTotal = item.QuantityOrdered * item.UnitCost
            };
        }).ToList();

        return new PurchaseOrderResponse
        {
            Id = order.Id,
            OrderNumber = order.OrderNumber,
            SupplierId = order.SupplierId,
            SupplierName = order.Supplier.Name,
            StoreId = order.StoreId,
            StoreName = order.Store.Name,
            Status = order.Status,
            OrderedAtUtc = order.OrderedAtUtc,
            CreatedAtUtc = order.CreatedAtUtc,
            UpdatedAtUtc = order.UpdatedAtUtc,
            TotalAmount = items.Sum(x => x.LineTotal),
            Items = items
        };
    }
}