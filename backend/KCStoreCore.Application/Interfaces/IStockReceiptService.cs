using KCStoreCore.Application.DTOs.StockReceipts;

namespace KCStoreCore.Application.Interfaces;

public interface IStockReceiptService
{

    Task<IReadOnlyList<StockReceiptResponse>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<StockReceiptResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StockReceiptResponse>> GetByPurchaseOrderAsync(
        Guid purchaseOrderId,
        CancellationToken cancellationToken = default);

    Task<StockReceiptResponse> CreateAsync(
        CreateStockReceiptRequest request,
        CancellationToken cancellationToken = default);
}