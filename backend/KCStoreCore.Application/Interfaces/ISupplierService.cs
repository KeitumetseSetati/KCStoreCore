using KCStoreCore.Application.DTOs.Suppliers;

namespace KCStoreCore.Application.Interfaces;

public interface ISupplierService
{
    Task<IReadOnlyList<SupplierResponse>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<SupplierResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<SupplierResponse> CreateAsync(
        CreateSupplierRequest request,
        CancellationToken cancellationToken = default);

    Task<SupplierResponse?> UpdateAsync(
        Guid id,
        UpdateSupplierRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeactivateAsync(
        Guid id,
        CancellationToken cancellationToken = default);
}