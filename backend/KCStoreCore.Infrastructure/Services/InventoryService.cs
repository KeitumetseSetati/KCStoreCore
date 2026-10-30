using KCStoreCore.Application.DTOs.Inventory;
using KCStoreCore.Application.Interfaces;
using KCStoreCore.Domain.Entities;
using KCStoreCore.Domain.Enums;
using KCStoreCore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KCStoreCore.Infrastructure.Services;

public class InventoryService : IInventoryService
{
    private readonly KCStoreCoreDbContext _context;

    public InventoryService(KCStoreCoreDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<StoreInventoryResponse>> GetByStoreAsync(
        Guid storeId,
        CancellationToken cancellationToken = default)
    {
        await ValidateStoreAsync(storeId, cancellationToken);

        return await _context.StoreInventories
            .AsNoTracking()
            .Where(x => x.StoreId == storeId)
            .OrderBy(x => x.Product.Name)
            .Select(x => new StoreInventoryResponse
            {
                Id = x.Id,
                StoreId = x.StoreId,
                StoreCode = x.Store.Code,
                StoreName = x.Store.Name,
                ProductId = x.ProductId,
                ProductSku = x.Product.Sku,
                ProductName = x.Product.Name,
                QuantityOnHand = x.QuantityOnHand,
                ReorderLevel = x.ReorderLevel,
                IsLowStock = x.QuantityOnHand <= x.ReorderLevel,
                CreatedAtUtc = x.CreatedAtUtc,
                UpdatedAtUtc = x.UpdatedAtUtc
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<StoreInventoryResponse?> GetByStoreAndProductAsync(
        Guid storeId,
        Guid productId,
        CancellationToken cancellationToken = default)
    {
        return await _context.StoreInventories
            .AsNoTracking()
            .Where(x => x.StoreId == storeId && x.ProductId == productId)
            .Select(x => new StoreInventoryResponse
            {
                Id = x.Id,
                StoreId = x.StoreId,
                StoreCode = x.Store.Code,
                StoreName = x.Store.Name,
                ProductId = x.ProductId,
                ProductSku = x.Product.Sku,
                ProductName = x.Product.Name,
                QuantityOnHand = x.QuantityOnHand,
                ReorderLevel = x.ReorderLevel,
                IsLowStock = x.QuantityOnHand <= x.ReorderLevel,
                CreatedAtUtc = x.CreatedAtUtc,
                UpdatedAtUtc = x.UpdatedAtUtc
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<StoreInventoryResponse>> GetLowStockAsync(
        Guid storeId,
        CancellationToken cancellationToken = default)
    {
        await ValidateStoreAsync(storeId, cancellationToken);

        return await _context.StoreInventories
            .AsNoTracking()
            .Where(x =>
                x.StoreId == storeId &&
                x.QuantityOnHand <= x.ReorderLevel)
            .OrderBy(x => x.QuantityOnHand)
            .Select(x => new StoreInventoryResponse
            {
                Id = x.Id,
                StoreId = x.StoreId,
                StoreCode = x.Store.Code,
                StoreName = x.Store.Name,
                ProductId = x.ProductId,
                ProductSku = x.Product.Sku,
                ProductName = x.Product.Name,
                QuantityOnHand = x.QuantityOnHand,
                ReorderLevel = x.ReorderLevel,
                IsLowStock = true,
                CreatedAtUtc = x.CreatedAtUtc,
                UpdatedAtUtc = x.UpdatedAtUtc
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<StoreInventoryResponse> UpdateReorderLevelAsync(
        Guid storeId,
        Guid productId,
        UpdateReorderLevelRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            throw new ArgumentNullException(nameof(request));
        }

        if (request.ReorderLevel < 0)
        {
            throw new ArgumentException(
                "Reorder level cannot be negative.");
        }

        await ValidateStoreAndProductAsync(
            storeId,
            productId,
            cancellationToken);

        var inventory = await _context.StoreInventories
            .FirstOrDefaultAsync(
                x => x.StoreId == storeId &&
                     x.ProductId == productId,
                cancellationToken);

        if (inventory is null)
        {
            inventory = new StoreInventory
            {
                StoreId = storeId,
                ProductId = productId,
                QuantityOnHand = 0,
                ReorderLevel = request.ReorderLevel
            };

            _context.StoreInventories.Add(inventory);
        }
        else
        {
            inventory.ReorderLevel = request.ReorderLevel;
            inventory.UpdatedAtUtc = DateTime.UtcNow;
        }

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException exception)
        {
            throw new InvalidOperationException(
                "Inventory was modified by another request. Please retry.",
                exception);
        }

        return await GetRequiredInventoryResponseAsync(
            storeId,
            productId,
            cancellationToken);
    }

    public async Task<StoreInventoryResponse> AdjustStockAsync(
        Guid storeId,
        Guid productId,
        AdjustStockRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            throw new ArgumentNullException(nameof(request));
        }

        if (request.Quantity <= 0)
        {
            throw new ArgumentException(
                "Adjustment quantity must be greater than zero.");
        }

        await ValidateStoreAndProductAsync(
            storeId,
            productId,
            cancellationToken);

        await using var transaction =
            await _context.Database.BeginTransactionAsync(
                cancellationToken);

        try
        {
            var inventory = await _context.StoreInventories
                .FirstOrDefaultAsync(
                    x => x.StoreId == storeId &&
                         x.ProductId == productId,
                    cancellationToken);

            if (inventory is null)
            {
                if (!request.IsIncrease)
                {
                    throw new InvalidOperationException(
                        "Cannot decrease stock because no inventory record exists.");
                }

                inventory = new StoreInventory
                {
                    StoreId = storeId,
                    ProductId = productId,
                    QuantityOnHand = 0,
                    ReorderLevel = 0
                };

                _context.StoreInventories.Add(inventory);
            }

            var quantityBefore = inventory.QuantityOnHand;

            var quantityChange = request.IsIncrease
                ? request.Quantity
                : -request.Quantity;

            var quantityAfter = (long)quantityBefore + quantityChange;

            if (quantityAfter < 0)
            {
                throw new InvalidOperationException(
                    "Insufficient stock. The adjustment would result in a negative quantity.");
            }

            if (quantityAfter > int.MaxValue)
            {
                throw new InvalidOperationException(
                    "The resulting stock quantity exceeds the supported limit.");
            }

            inventory.QuantityOnHand = (int)quantityAfter;
            inventory.UpdatedAtUtc = DateTime.UtcNow;

            var inventoryTransaction = new InventoryTransaction
            {
                StoreId = storeId,
                ProductId = productId,
                TransactionType = request.IsIncrease
                    ? InventoryTransactionType.AdjustmentIncrease
                    : InventoryTransactionType.AdjustmentDecrease,
                QuantityChange = quantityChange,
                QuantityBefore = quantityBefore,
                QuantityAfter = (int)quantityAfter,
                ReferenceNumber = request.ReferenceNumber,
                Notes = request.Notes
            };

            _context.InventoryTransactions.Add(inventoryTransaction);

            await _context.SaveChangesAsync(cancellationToken);

            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException exception)
        {
            await transaction.RollbackAsync(cancellationToken);

            throw new InvalidOperationException(
                "Inventory was modified by another request. Please retry.",
                exception);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }

        return await GetRequiredInventoryResponseAsync(
            storeId,
            productId,
            cancellationToken);
    }

    private async Task ValidateStoreAsync(
        Guid storeId,
        CancellationToken cancellationToken)
    {
        var storeExists = await _context.Stores
            .AsNoTracking()
            .AnyAsync(
                x => x.Id == storeId && x.IsActive,
                cancellationToken);

        if (!storeExists)
        {
            throw new InvalidOperationException(
                "The selected store does not exist or is inactive.");
        }
    }

    private async Task ValidateStoreAndProductAsync(
        Guid storeId,
        Guid productId,
        CancellationToken cancellationToken)
    {
        await ValidateStoreAsync(storeId, cancellationToken);

        var productExists = await _context.Products
            .AsNoTracking()
            .AnyAsync(
                x => x.Id == productId && x.IsActive,
                cancellationToken);

        if (!productExists)
        {
            throw new InvalidOperationException(
                "The selected product does not exist or is inactive.");
        }
    }

    private async Task<StoreInventoryResponse> GetRequiredInventoryResponseAsync(
        Guid storeId,
        Guid productId,
        CancellationToken cancellationToken)
    {
        var response = await GetByStoreAndProductAsync(
            storeId,
            productId,
            cancellationToken);

        return response ?? throw new InvalidOperationException(
            "The inventory record could not be retrieved.");
    }
}