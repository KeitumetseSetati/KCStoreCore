using KCStoreCore.Application.DTOs.Inventory;

namespace KCStoreCore.Application.Interfaces;

public interface IInventoryService
{
    Task<IReadOnlyList<StoreInventoryResponse>> GetByStoreAsync(
        Guid storeId,
        CancellationToken cancellationToken = default);

    Task<StoreInventoryResponse?> GetByStoreAndProductAsync(
        Guid storeId,
        Guid productId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StoreInventoryResponse>> GetLowStockAsync(
        Guid storeId,
        CancellationToken cancellationToken = default);

    Task<StoreInventoryResponse> UpdateReorderLevelAsync(
        Guid storeId,
        Guid productId,
        UpdateReorderLevelRequest request,
        CancellationToken cancellationToken = default);

    Task<StoreInventoryResponse> AdjustStockAsync(
        Guid storeId,
        Guid productId,
        AdjustStockRequest request,
        CancellationToken cancellationToken = default);
}