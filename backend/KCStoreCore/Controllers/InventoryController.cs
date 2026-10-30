using KCStoreCore.Application.DTOs.Inventory;
using KCStoreCore.Application.Interfaces;
using KCStoreCore.Application.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KCStoreCore.Controllers;

[ApiController]
[Route("api/inventory")]
[Authorize(Policy = AuthorizationPolicies.InventoryAccess)]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;

    public InventoryController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    // =====================================================
    // GET INVENTORY BY STORE
    // Administrator, Manager and Staff
    // =====================================================

    // GET: api/inventory/stores/{storeId}
    [HttpGet("stores/{storeId:guid}")]
    public async Task<ActionResult<IReadOnlyList<StoreInventoryResponse>>> GetByStore(
        Guid storeId,
        CancellationToken cancellationToken)
    {
        try
        {
            var inventory = await _inventoryService.GetByStoreAsync(
                storeId,
                cancellationToken);

            return Ok(inventory);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new
            {
                message = exception.Message
            });
        }
    }

    // =====================================================
    // GET INVENTORY BY STORE AND PRODUCT
    // Administrator, Manager and Staff
    // =====================================================

    // GET: api/inventory/stores/{storeId}/products/{productId}
    [HttpGet("stores/{storeId:guid}/products/{productId:guid}")]
    public async Task<ActionResult<StoreInventoryResponse>> GetByStoreAndProduct(
        Guid storeId,
        Guid productId,
        CancellationToken cancellationToken)
    {
        var inventory = await _inventoryService.GetByStoreAndProductAsync(
            storeId,
            productId,
            cancellationToken);

        if (inventory is null)
        {
            return NotFound(new
            {
                message = "Inventory record not found."
            });
        }

        return Ok(inventory);
    }

    // =====================================================
    // GET LOW-STOCK PRODUCTS
    // Administrator, Manager and Staff
    // =====================================================

    // GET: api/inventory/stores/{storeId}/low-stock
    [HttpGet("stores/{storeId:guid}/low-stock")]
    public async Task<ActionResult<IReadOnlyList<StoreInventoryResponse>>> GetLowStock(
        Guid storeId,
        CancellationToken cancellationToken)
    {
        try
        {
            var inventory = await _inventoryService.GetLowStockAsync(
                storeId,
                cancellationToken);

            return Ok(inventory);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new
            {
                message = exception.Message
            });
        }
    }

    // =====================================================
    // UPDATE REORDER LEVEL
    // Administrator and Manager only
    // =====================================================

    // PUT: api/inventory/stores/{storeId}/products/{productId}/reorder-level
    [HttpPut("stores/{storeId:guid}/products/{productId:guid}/reorder-level")]
    [Authorize(Policy = AuthorizationPolicies.ManagementAccess)]
    public async Task<ActionResult<StoreInventoryResponse>> UpdateReorderLevel(
        Guid storeId,
        Guid productId,
        [FromBody] UpdateReorderLevelRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var inventory = await _inventoryService.UpdateReorderLevelAsync(
                storeId,
                productId,
                request,
                cancellationToken);

            return Ok(inventory);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new
            {
                message = exception.Message
            });
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new
            {
                message = exception.Message
            });
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new
            {
                message = "Inventory was modified by another request. Please retry."
            });
        }
    }

    // =====================================================
    // ADJUST STOCK
    // Administrator, Manager and Staff
    // =====================================================

    // POST: api/inventory/stores/{storeId}/products/{productId}/adjust
    [HttpPost("stores/{storeId:guid}/products/{productId:guid}/adjust")]
    public async Task<ActionResult<StoreInventoryResponse>> AdjustStock(
        Guid storeId,
        Guid productId,
        [FromBody] AdjustStockRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var inventory = await _inventoryService.AdjustStockAsync(
                storeId,
                productId,
                request,
                cancellationToken);

            return Ok(inventory);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new
            {
                message = exception.Message
            });
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new
            {
                message = exception.Message
            });
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new
            {
                message = "Inventory was modified by another request. Please retry."
            });
        }
    }
}