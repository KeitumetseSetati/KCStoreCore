using KCStoreCore.Application.DTOs.Reports;

namespace KCStoreCore.Application.Interfaces;

public interface IReportService
{
    Task<DashboardSummaryResponse> GetDashboardSummaryAsync(
        Guid? storeId = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<InventoryReportItemResponse>> GetInventoryReportAsync(
        Guid? storeId = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<LowStockReportItemResponse>> GetLowStockReportAsync(
        Guid? storeId = null,
        CancellationToken cancellationToken = default);

    Task<PurchaseOrderReportResponse> GetPurchaseOrderReportAsync(
        Guid? storeId = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StockMovementReportItemResponse>> GetStockMovementReportAsync(
        Guid? storeId = null,
        DateTime? fromUtc = null,
        DateTime? toUtc = null,
        CancellationToken cancellationToken = default);
}