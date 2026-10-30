using KCStoreCore.Application.DTOs.Reports;
using KCStoreCore.Application.Interfaces;
using KCStoreCore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KCStoreCore.Infrastructure.Services;

public class ReportService : IReportService
{
    private readonly KCStoreCoreDbContext _context;

    public ReportService(KCStoreCoreDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardSummaryResponse> GetDashboardSummaryAsync(
        Guid? storeId = null,
        CancellationToken cancellationToken = default)
    {
        var inventoryReport = await GetInventoryReportAsync(
            storeId,
            cancellationToken);

        var purchaseOrderReport = await GetPurchaseOrderReportAsync(
            storeId,
            cancellationToken);

        var productsQuery = _context.Products.AsNoTracking();

        var storesQuery = _context.Stores.AsNoTracking();

        if (storeId.HasValue)
        {
            productsQuery = productsQuery.Where(
                x => x.StoreInventories.Any(
                    si => si.StoreId == storeId.Value));

            storesQuery = storesQuery.Where(
                x => x.Id == storeId.Value);
        }

        var totalProducts = await productsQuery.CountAsync(
            cancellationToken);

        var activeProducts = await productsQuery.CountAsync(
            x => x.IsActive,
            cancellationToken);

        var totalStores = await storesQuery.CountAsync(
            cancellationToken);

        var activeStores = await storesQuery.CountAsync(
            x => x.IsActive,
            cancellationToken);

        var totalSuppliers = await _context.Suppliers
            .AsNoTracking()
            .CountAsync(cancellationToken);

        return new DashboardSummaryResponse
        {
            TotalProducts = totalProducts,
            ActiveProducts = activeProducts,
            TotalStores = totalStores,
            ActiveStores = activeStores,
            TotalSuppliers = totalSuppliers,

            TotalUnitsInStock = inventoryReport.Sum(
                x => (long)x.QuantityOnHand),

            TotalInventoryValue = inventoryReport.Sum(
                x => x.InventoryValue),

            LowStockItemCount = inventoryReport.Count(
                x => x.IsLowStock),

            PendingPurchaseOrders =
                purchaseOrderReport.OrderedOrders +
                purchaseOrderReport.PartiallyReceivedOrders,

            CompletedPurchaseOrders =
                purchaseOrderReport.ReceivedOrders,

            TotalPurchaseOrders =
                purchaseOrderReport.TotalOrders,

            GeneratedAtUtc = DateTime.UtcNow
        };
    }

    public async Task<IReadOnlyList<InventoryReportItemResponse>>
        GetInventoryReportAsync(
            Guid? storeId = null,
            CancellationToken cancellationToken = default)
    {
        var query = _context.StoreInventories
            .AsNoTracking()
            .AsQueryable();

        if (storeId.HasValue)
        {
            query = query.Where(
                x => x.StoreId == storeId.Value);
        }

        var inventories = await query
            .Select(x => new
            {
                x.StoreId,
                StoreCode = x.Store.Code,
                StoreName = x.Store.Name,

                x.ProductId,
                ProductSku = x.Product.Sku,
                ProductName = x.Product.Name,

                x.QuantityOnHand,
                x.ReorderLevel,

                UnitCost = x.Product.CostPrice,

                x.UpdatedAtUtc
            })
            .OrderBy(x => x.StoreName)
            .ThenBy(x => x.ProductName)
            .ToListAsync(cancellationToken);

        return inventories
            .Select(x => new InventoryReportItemResponse
            {
                StoreId = x.StoreId,
                StoreCode = x.StoreCode,
                StoreName = x.StoreName,

                ProductId = x.ProductId,
                ProductSku = x.ProductSku,
                ProductName = x.ProductName,

                QuantityOnHand = x.QuantityOnHand,
                ReorderLevel = x.ReorderLevel,

                UnitCost = x.UnitCost,

                InventoryValue =
                    x.QuantityOnHand * x.UnitCost,

                IsLowStock =
                    x.QuantityOnHand <= x.ReorderLevel,

                LastUpdatedAtUtc = x.UpdatedAtUtc
            })
            .ToList();
    }

    public async Task<IReadOnlyList<LowStockReportItemResponse>>
        GetLowStockReportAsync(
            Guid? storeId = null,
            CancellationToken cancellationToken = default)
    {
        var query = _context.StoreInventories
            .AsNoTracking()
            .Where(x =>
                x.QuantityOnHand <= x.ReorderLevel &&
                x.Product.IsActive &&
                x.Store.IsActive);

        if (storeId.HasValue)
        {
            query = query.Where(
                x => x.StoreId == storeId.Value);
        }

        var lowStockItems = await query
            .Select(x => new
            {
                x.StoreId,
                StoreName = x.Store.Name,

                x.ProductId,
                ProductSku = x.Product.Sku,
                ProductName = x.Product.Name,

                x.QuantityOnHand,
                x.ReorderLevel
            })
            .OrderBy(x => x.StoreName)
            .ThenBy(x => x.ProductName)
            .ToListAsync(cancellationToken);

        return lowStockItems
            .Select(x => new LowStockReportItemResponse
            {
                StoreId = x.StoreId,
                StoreName = x.StoreName,

                ProductId = x.ProductId,
                ProductSku = x.ProductSku,
                ProductName = x.ProductName,

                QuantityOnHand = x.QuantityOnHand,
                ReorderLevel = x.ReorderLevel,

                SuggestedReorderQuantity = Math.Max(
                    0,
                    x.ReorderLevel - x.QuantityOnHand),

                IsOutOfStock = x.QuantityOnHand == 0
            })
            .ToList();
    }

    public async Task<PurchaseOrderReportResponse>
        GetPurchaseOrderReportAsync(
            Guid? storeId = null,
            CancellationToken cancellationToken = default)
    {
        var query = _context.PurchaseOrders
            .AsNoTracking()
            .AsQueryable();

        if (storeId.HasValue)
        {
            query = query.Where(
                x => x.StoreId == storeId.Value);
        }

        var orders = await query
            .Include(x => x.Items)
                .ThenInclude(x => x.ReceiptItems)
            .AsSplitQuery()
            .ToListAsync(cancellationToken);

        var allItems = orders
            .SelectMany(x => x.Items)
            .ToList();

        var totalUnitsOrdered = allItems.Sum(
            x => (long)x.QuantityOrdered);

        var totalUnitsReceived = allItems.Sum(
            x => x.ReceiptItems.Sum(
                r => (long)r.QuantityReceived));

        // Outstanding quantities only apply to orders that
        // have been placed and are not yet fully received.
        var totalUnitsOutstanding = orders
            .Where(x =>
                x.Status == "Ordered" ||
                x.Status == "Partially Received")
            .SelectMany(x => x.Items)
            .Sum(x =>
                (long)x.QuantityOrdered -
                x.ReceiptItems.Sum(
                    r => (long)r.QuantityReceived));

        var totalOrderValue = allItems.Sum(
            x => x.QuantityOrdered * x.UnitCost);

        return new PurchaseOrderReportResponse
        {
            TotalOrders = orders.Count,

            DraftOrders = orders.Count(
                x => x.Status == "Draft"),

            OrderedOrders = orders.Count(
                x => x.Status == "Ordered"),

            PartiallyReceivedOrders = orders.Count(
                x => x.Status == "Partially Received"),

            ReceivedOrders = orders.Count(
                x => x.Status == "Received"),

            CancelledOrders = orders.Count(
                x => x.Status == "Cancelled"),

            TotalUnitsOrdered = totalUnitsOrdered,
            TotalUnitsReceived = totalUnitsReceived,
            TotalUnitsOutstanding = totalUnitsOutstanding,

            TotalOrderValue = totalOrderValue,

            GeneratedAtUtc = DateTime.UtcNow
        };
    }

    public async Task<IReadOnlyList<StockMovementReportItemResponse>>
        GetStockMovementReportAsync(
            Guid? storeId = null,
            DateTime? fromUtc = null,
            DateTime? toUtc = null,
            CancellationToken cancellationToken = default)
    {
        if (fromUtc.HasValue &&
            toUtc.HasValue &&
            fromUtc.Value > toUtc.Value)
        {
            throw new ArgumentException(
                "The start date cannot be later than the end date.");
        }

        var query = _context.InventoryTransactions
            .AsNoTracking()
            .AsQueryable();

        if (storeId.HasValue)
        {
            query = query.Where(
                x => x.StoreId == storeId.Value);
        }

        if (fromUtc.HasValue)
        {
            query = query.Where(
                x => x.CreatedAtUtc >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            query = query.Where(
                x => x.CreatedAtUtc <= toUtc.Value);
        }

        var transactions = await query
            .Select(x => new
            {
                TransactionId = x.Id,

                x.StoreId,
                StoreName = x.Store.Name,

                x.ProductId,
                ProductSku = x.Product.Sku,
                ProductName = x.Product.Name,

                x.TransactionType,

                x.QuantityChange,
                x.QuantityBefore,
                x.QuantityAfter,

                x.ReferenceNumber,
                x.Notes,
                x.CreatedAtUtc
            })
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return transactions
            .Select(x => new StockMovementReportItemResponse
            {
                TransactionId = x.TransactionId,

                StoreId = x.StoreId,
                StoreName = x.StoreName,

                ProductId = x.ProductId,
                ProductSku = x.ProductSku,
                ProductName = x.ProductName,

                TransactionType =
                    x.TransactionType.ToString(),

                QuantityChange = x.QuantityChange,
                QuantityBefore = x.QuantityBefore,
                QuantityAfter = x.QuantityAfter,

                ReferenceNumber = x.ReferenceNumber,
                Notes = x.Notes,
                CreatedAtUtc = x.CreatedAtUtc
            })
            .ToList();
    }
}