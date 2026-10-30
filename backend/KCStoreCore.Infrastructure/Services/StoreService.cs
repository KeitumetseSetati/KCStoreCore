
using KCStoreCore.Application.DTOs.Stores;
using KCStoreCore.Application.Interfaces;
using KCStoreCore.Domain.Entities;
using KCStoreCore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KCStoreCore.Infrastructure.Services;

public class StoreService : IStoreService
{
    private readonly KCStoreCoreDbContext _context;

    public StoreService(KCStoreCoreDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<StoreResponse>> GetAllAsync(
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Stores.AsNoTracking();

        if (!includeInactive)
        {
            query = query.Where(store => store.IsActive);
        }

        return await query
            .OrderBy(store => store.Name)
            .Select(store => new StoreResponse
            {
                Id = store.Id,
                Code = store.Code,
                Name = store.Name,
                Address = store.Address,
                City = store.City,
                IsActive = store.IsActive,
                CreatedAtUtc = store.CreatedAtUtc,
                UpdatedAtUtc = store.UpdatedAtUtc
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<StoreResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await _context.Stores
            .AsNoTracking()
            .Where(store => store.Id == id)
            .Select(store => new StoreResponse
            {
                Id = store.Id,
                Code = store.Code,
                Name = store.Name,
                Address = store.Address,
                City = store.City,
                IsActive = store.IsActive,
                CreatedAtUtc = store.CreatedAtUtc,
                UpdatedAtUtc = store.UpdatedAtUtc
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<StoreResponse> CreateAsync(
        CreateStoreRequest request,
        CancellationToken cancellationToken = default)
    {
        var code = NormalizeRequired(request.Code, "Store code", 30);
        var name = NormalizeRequired(request.Name, "Store name", 150);
        var address = NormalizeOptional(request.Address, "Address", 250);
        var city = NormalizeOptional(request.City, "City", 100);

        await ValidateUniqueCodeAsync(
            code,
            null,
            cancellationToken);

        var store = new Store
        {
            Id = Guid.NewGuid(),
            Code = code,
            Name = name,
            Address = address,
            City = city,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Stores.Add(store);

        await _context.SaveChangesAsync(cancellationToken);

        return MapToResponse(store);
    }

    public async Task<StoreResponse?> UpdateAsync(
        Guid id,
        UpdateStoreRequest request,
        CancellationToken cancellationToken = default)
    {
        var store = await _context.Stores
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (store is null)
        {
            return null;
        }

        var code = NormalizeRequired(request.Code, "Store code", 30);
        var name = NormalizeRequired(request.Name, "Store name", 150);
        var address = NormalizeOptional(request.Address, "Address", 250);
        var city = NormalizeOptional(request.City, "City", 100);

        await ValidateUniqueCodeAsync(
            code,
            id,
            cancellationToken);

        store.Code = code;
        store.Name = name;
        store.Address = address;
        store.City = city;
        store.IsActive = request.IsActive;
        store.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return MapToResponse(store);
    }

    public async Task<bool> DeactivateAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var store = await _context.Stores
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (store is null)
        {
            return false;
        }

        if (!store.IsActive)
        {
            return true;
        }

        store.IsActive = false;
        store.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    private async Task ValidateUniqueCodeAsync(
        string code,
        Guid? excludedStoreId,
        CancellationToken cancellationToken)
    {
        var normalizedCode = code.ToUpperInvariant();

        var exists = await _context.Stores.AnyAsync(
            store =>
                store.Code.ToUpper() == normalizedCode &&
                (!excludedStoreId.HasValue ||
                 store.Id != excludedStoreId.Value),
            cancellationToken);

        if (exists)
        {
            throw new InvalidOperationException(
                $"A store with code '{code}' already exists.");
        }
    }

    private static string NormalizeRequired(
        string? value,
        string fieldName,
        int maximumLength)
    {
        var normalized = value?.Trim() ?? string.Empty;

        if (normalized.Length < 2)
        {
            throw new ArgumentException(
                $"{fieldName} must contain at least 2 characters.");
        }

        if (normalized.Length > maximumLength)
        {
            throw new ArgumentException(
                $"{fieldName} cannot exceed {maximumLength} characters.");
        }

        return normalized;
    }

    private static string? NormalizeOptional(
        string? value,
        string fieldName,
        int maximumLength)
    {
        var normalized = value?.Trim();

        if (string.IsNullOrEmpty(normalized))
        {
            return null;
        }

        if (normalized.Length > maximumLength)
        {
            throw new ArgumentException(
                $"{fieldName} cannot exceed {maximumLength} characters.");
        }

        return normalized;
    }

    private static StoreResponse MapToResponse(Store store)
    {
        return new StoreResponse
        {
            Id = store.Id,
            Code = store.Code,
            Name = store.Name,
            Address = store.Address,
            City = store.City,
            IsActive = store.IsActive,
            CreatedAtUtc = store.CreatedAtUtc,
            UpdatedAtUtc = store.UpdatedAtUtc
        };
    }
}
