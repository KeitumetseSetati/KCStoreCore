using KCStoreCore.Application.DTOs.Suppliers;
using KCStoreCore.Application.Interfaces;
using KCStoreCore.Domain.Entities;
using KCStoreCore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KCStoreCore.Infrastructure.Services;

public class SupplierService : ISupplierService
{
    private readonly KCStoreCoreDbContext _context;

    public SupplierService(KCStoreCoreDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<SupplierResponse>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await _context.Suppliers
            .AsNoTracking()
            .Where(supplier => supplier.IsActive)
            .OrderBy(supplier => supplier.Name)
            .Select(supplier => new SupplierResponse
            {
                Id = supplier.Id,
                Name = supplier.Name,
                ContactPerson = supplier.ContactPerson,
                Email = supplier.Email,
                PhoneNumber = supplier.PhoneNumber,
                Address = supplier.Address,
                IsActive = supplier.IsActive,
                CreatedAtUtc = supplier.CreatedAtUtc,
                UpdatedAtUtc = supplier.UpdatedAtUtc
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<SupplierResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var supplier = await _context.Suppliers
            .AsNoTracking()
            .FirstOrDefaultAsync(
                supplier => supplier.Id == id,
                cancellationToken);

        return supplier is null ? null : MapToResponse(supplier);
    }

    public async Task<SupplierResponse> CreateAsync(
        CreateSupplierRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateSupplier(
            request.Name,
            request.Email);

        var supplier = new Supplier
        {
            Name = request.Name.Trim(),
            ContactPerson = NormalizeOptional(request.ContactPerson),
            Email = NormalizeOptional(request.Email),
            PhoneNumber = NormalizeOptional(request.PhoneNumber),
            Address = NormalizeOptional(request.Address)
        };

        _context.Suppliers.Add(supplier);

        await _context.SaveChangesAsync(cancellationToken);

        return MapToResponse(supplier);
    }

    public async Task<SupplierResponse?> UpdateAsync(
        Guid id,
        UpdateSupplierRequest request,
        CancellationToken cancellationToken = default)
    {
        var supplier = await _context.Suppliers
            .FirstOrDefaultAsync(
                supplier => supplier.Id == id,
                cancellationToken);

        if (supplier is null)
        {
            return null;
        }

        ValidateSupplier(
            request.Name,
            request.Email);

        supplier.Name = request.Name.Trim();
        supplier.ContactPerson = NormalizeOptional(request.ContactPerson);
        supplier.Email = NormalizeOptional(request.Email);
        supplier.PhoneNumber = NormalizeOptional(request.PhoneNumber);
        supplier.Address = NormalizeOptional(request.Address);
        supplier.IsActive = request.IsActive;
        supplier.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return MapToResponse(supplier);
    }

    public async Task<bool> DeactivateAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var supplier = await _context.Suppliers
            .FirstOrDefaultAsync(
                supplier => supplier.Id == id,
                cancellationToken);

        if (supplier is null)
        {
            return false;
        }

        if (!supplier.IsActive)
        {
            return true;
        }

        supplier.IsActive = false;
        supplier.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static SupplierResponse MapToResponse(Supplier supplier)
    {
        return new SupplierResponse
        {
            Id = supplier.Id,
            Name = supplier.Name,
            ContactPerson = supplier.ContactPerson,
            Email = supplier.Email,
            PhoneNumber = supplier.PhoneNumber,
            Address = supplier.Address,
            IsActive = supplier.IsActive,
            CreatedAtUtc = supplier.CreatedAtUtc,
            UpdatedAtUtc = supplier.UpdatedAtUtc
        };
    }

    private static void ValidateSupplier(
        string name,
        string? email)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException(
                "Supplier name is required.");
        }

        if (name.Trim().Length > 150)
        {
            throw new ArgumentException(
                "Supplier name cannot exceed 150 characters.");
        }

        if (!string.IsNullOrWhiteSpace(email))
        {
            var trimmedEmail = email.Trim();

            if (trimmedEmail.Length > 254 ||
                !System.Net.Mail.MailAddress.TryCreate(
                    trimmedEmail,
                    out var parsedEmail) ||
                !string.Equals(
                    parsedEmail.Address,
                    trimmedEmail,
                    StringComparison.OrdinalIgnoreCase))
            {
                throw new ArgumentException(
                    "A valid supplier email address is required.");
            }
        }
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}