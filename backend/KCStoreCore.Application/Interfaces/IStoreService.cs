using KCStoreCore.Application.DTOs.Stores;

namespace KCStoreCore.Application.Interfaces;

public interface IStoreService
{
    Task<IReadOnlyList<StoreResponse>> GetAllAsync(
        bool includeInactive = false,
        CancellationToken cancellationToken = default);

    Task<StoreResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<StoreResponse> CreateAsync(
        CreateStoreRequest request,
        CancellationToken cancellationToken = default);

    Task<StoreResponse?> UpdateAsync(
        Guid id,
        UpdateStoreRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeactivateAsync(
        Guid id,
        CancellationToken cancellationToken = default);
}