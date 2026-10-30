using KCStoreCore.Application.DTOs.Stores;
using KCStoreCore.Application.Interfaces;
using KCStoreCore.Application.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KCStoreCore.Controllers;

[ApiController]
[Route("api/stores")]
[Authorize(Policy = AuthorizationPolicies.InventoryAccess)]
public class StoresController : ControllerBase
{
    private readonly IStoreService _storeService;

    public StoresController(IStoreService storeService)
    {
        _storeService = storeService;
    }

    // =====================================================
    // GET ALL STORES
    // Administrator, Manager and Staff
    // =====================================================

    // GET: api/stores
    // GET: api/stores?includeInactive=true
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StoreResponse>>> GetAll(
        [FromQuery] bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var stores = await _storeService.GetAllAsync(
            includeInactive,
            cancellationToken);

        return Ok(stores);
    }

    // =====================================================
    // GET STORE BY ID
    // Administrator, Manager and Staff
    // =====================================================

    // GET: api/stores/{id}
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<StoreResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var store = await _storeService.GetByIdAsync(
            id,
            cancellationToken);

        if (store is null)
        {
            return NotFound(new
            {
                message = "Store not found."
            });
        }

        return Ok(store);
    }

    // =====================================================
    // CREATE STORE
    // Administrator and Manager only
    // =====================================================

    // POST: api/stores
    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.ManagementAccess)]
    public async Task<ActionResult<StoreResponse>> Create(
        [FromBody] CreateStoreRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var store = await _storeService.CreateAsync(
                request,
                cancellationToken);

            return CreatedAtAction(
                nameof(GetById),
                new { id = store.Id },
                store);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                message = ex.Message
            });
        }
    }

    // =====================================================
    // UPDATE STORE
    // Administrator and Manager only
    // =====================================================

    // PUT: api/stores/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.ManagementAccess)]
    public async Task<ActionResult<StoreResponse>> Update(
        Guid id,
        [FromBody] UpdateStoreRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var store = await _storeService.UpdateAsync(
                id,
                request,
                cancellationToken);

            if (store is null)
            {
                return NotFound(new
                {
                    message = "Store not found."
                });
            }

            return Ok(store);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                message = ex.Message
            });
        }
    }

    // =====================================================
    // DEACTIVATE STORE
    // Administrator and Manager only
    // =====================================================

    // PATCH: api/stores/{id}/deactivate
    [HttpPatch("{id:guid}/deactivate")]
    [Authorize(Policy = AuthorizationPolicies.ManagementAccess)]
    public async Task<IActionResult> Deactivate(
        Guid id,
        CancellationToken cancellationToken)
    {
        var deactivated = await _storeService.DeactivateAsync(
            id,
            cancellationToken);

        if (!deactivated)
        {
            return NotFound(new
            {
                message = "Store not found."
            });
        }

        return NoContent();
    }
}