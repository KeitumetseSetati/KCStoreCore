using KCStoreCore.Application.DTOs.Products;
using KCStoreCore.Application.Interfaces;
using KCStoreCore.Domain.Entities;
using KCStoreCore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KCStoreCore.Infrastructure.Services;

public class ProductService : IProductService
{
    private readonly KCStoreCoreDbContext _context;

    public ProductService(KCStoreCoreDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<ProductResponse>> GetAllAsync(
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Products.AsNoTracking();

        if (!includeInactive)
        {
            query = query.Where(product => product.IsActive);
        }

        return await query
            .OrderBy(product => product.Name)
            .Select(product => new ProductResponse
            {
                Id = product.Id,
                Sku = product.Sku,
                Name = product.Name,
                Description = product.Description,
                CategoryId = product.CategoryId,
                CategoryName = product.Category.Name,
                UnitPrice = product.UnitPrice,
                CostPrice = product.CostPrice,
                IsActive = product.IsActive,
                CreatedAtUtc = product.CreatedAtUtc,
                UpdatedAtUtc = product.UpdatedAtUtc
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<ProductResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await _context.Products
            .AsNoTracking()
            .Where(product => product.Id == id)
            .Select(product => new ProductResponse
            {
                Id = product.Id,
                Sku = product.Sku,
                Name = product.Name,
                Description = product.Description,
                CategoryId = product.CategoryId,
                CategoryName = product.Category.Name,
                UnitPrice = product.UnitPrice,
                CostPrice = product.CostPrice,
                IsActive = product.IsActive,
                CreatedAtUtc = product.CreatedAtUtc,
                UpdatedAtUtc = product.UpdatedAtUtc
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<ProductResponse> CreateAsync(
        CreateProductRequest request,
        CancellationToken cancellationToken = default)
    {
        var sku = request.Sku.Trim();
        var name = request.Name.Trim();

        ValidateProduct(sku, name, request.UnitPrice, request.CostPrice);

        await ValidateCategoryAsync(
            request.CategoryId,
            cancellationToken);

        await ValidateSkuAsync(
            sku,
            null,
            cancellationToken);

        var product = new Product
        {
            Sku = sku,
            Name = name,
            Description = request.Description?.Trim(),
            CategoryId = request.CategoryId,
            UnitPrice = request.UnitPrice,
            CostPrice = request.CostPrice,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Products.Add(product);

        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(product.Id, cancellationToken))!;
    }

    public async Task<ProductResponse?> UpdateAsync(
        Guid id,
        UpdateProductRequest request,
        CancellationToken cancellationToken = default)
    {
        var product = await _context.Products
            .FirstOrDefaultAsync(
                item => item.Id == id,
                cancellationToken);

        if (product is null)
        {
            return null;
        }

        var sku = request.Sku.Trim();
        var name = request.Name.Trim();

        ValidateProduct(sku, name, request.UnitPrice, request.CostPrice);

        await ValidateCategoryAsync(
            request.CategoryId,
            cancellationToken);

        await ValidateSkuAsync(
            sku,
            id,
            cancellationToken);

        product.Sku = sku;
        product.Name = name;
        product.Description = request.Description?.Trim();
        product.CategoryId = request.CategoryId;
        product.UnitPrice = request.UnitPrice;
        product.CostPrice = request.CostPrice;
        product.IsActive = request.IsActive;
        product.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<bool> DeactivateAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var product = await _context.Products
            .FirstOrDefaultAsync(
                item => item.Id == id,
                cancellationToken);

        if (product is null)
        {
            return false;
        }

        if (!product.IsActive)
        {
            return true;
        }

        product.IsActive = false;
        product.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    private async Task ValidateCategoryAsync(
        Guid categoryId,
        CancellationToken cancellationToken)
    {
        var categoryExists = await _context.Categories
            .AnyAsync(
                category => category.Id == categoryId
                    && category.IsActive,
                cancellationToken);

        if (!categoryExists)
        {
            throw new InvalidOperationException(
                "The selected category does not exist or is inactive.");
        }
    }

    private async Task ValidateSkuAsync(
        string sku,
        Guid? excludedProductId,
        CancellationToken cancellationToken)
    {
        var duplicateExists = await _context.Products
            .AnyAsync(
                product => product.Sku == sku
                    && (!excludedProductId.HasValue
                        || product.Id != excludedProductId.Value),
                cancellationToken);

        if (duplicateExists)
        {
            throw new InvalidOperationException(
                "A product with this SKU already exists.");
        }
    }

    private static void ValidateProduct(
        string sku,
        string name,
        decimal unitPrice,
        decimal costPrice)
    {
        if (string.IsNullOrWhiteSpace(sku))
        {
            throw new ArgumentException(
                "Product SKU is required.");
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException(
                "Product name is required.");
        }

        if (unitPrice < 0)
        {
            throw new ArgumentException(
                "Unit price cannot be negative.");
        }

        if (costPrice < 0)
        {
            throw new ArgumentException(
                "Cost price cannot be negative.");
        }
    }
}