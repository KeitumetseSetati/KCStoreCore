using KCStoreCore.Application.DTOs.PurchaseOrders;

namespace KCStoreCore.Application.Interfaces;

public interface IPurchaseOrderService
{
    Task<IReadOnlyList<PurchaseOrderResponse>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<PurchaseOrderResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<PurchaseOrderResponse> CreateAsync(
        CreatePurchaseOrderRequest request,
        CancellationToken cancellationToken = default);

    Task<PurchaseOrderResponse> PlaceOrderAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<PurchaseOrderResponse> CancelAsync(
        Guid id,
        CancellationToken cancellationToken = default);
}