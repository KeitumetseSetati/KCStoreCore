using KCStoreCore.Application.DTOs.Products;

namespace KCStoreCore.Application.Interfaces;

public interface IProductService
{
    Task<IReadOnlyList<ProductResponse>> GetAllAsync(
        bool includeInactive = false,
        CancellationToken cancellationToken = default);

    Task<ProductResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<ProductResponse> CreateAsync(
        CreateProductRequest request,
        CancellationToken cancellationToken = default);

    Task<ProductResponse?> UpdateAsync(
        Guid id,
        UpdateProductRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeactivateAsync(
        Guid id,
        CancellationToken cancellationToken = default);
}