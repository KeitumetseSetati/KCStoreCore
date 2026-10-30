namespace KCStoreCore.Application.DTOs.Reports;

public class DashboardSummaryResponse
{
    public int TotalProducts { get; set; }

    public int ActiveProducts { get; set; }

    public int TotalStores { get; set; }

    public int ActiveStores { get; set; }

    public int TotalSuppliers { get; set; }

    public long TotalUnitsInStock { get; set; }

    public decimal TotalInventoryValue { get; set; }

    public int LowStockItemCount { get; set; }

    public int PendingPurchaseOrders { get; set; }

    public int CompletedPurchaseOrders { get; set; }

    public int TotalPurchaseOrders { get; set; }

    public DateTime GeneratedAtUtc { get; set; }
}