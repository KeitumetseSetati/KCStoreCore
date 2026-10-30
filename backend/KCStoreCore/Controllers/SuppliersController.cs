using KCStoreCore.Application.DTOs.Suppliers;
using KCStoreCore.Application.Interfaces;
using KCStoreCore.Application.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KCStoreCore.Controllers;

[ApiController]
[Route("api/suppliers")]
[Authorize(Policy = AuthorizationPolicies.InventoryAccess)]
public class SuppliersController : ControllerBase
{
    private readonly ISupplierService _supplierService;

    public SuppliersController(ISupplierService supplierService)
    {
        _supplierService = supplierService;
    }

    // =====================================================
    // GET ALL SUPPLIERS
    // Administrator, Manager and Staff
    // =====================================================

    // GET: api/suppliers
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SupplierResponse>>> GetAll(
        CancellationToken cancellationToken)
    {
        var suppliers = await _supplierService.GetAllAsync(
            cancellationToken);

        return Ok(suppliers);
    }

    // =====================================================
    // GET SUPPLIER BY ID
    // Administrator, Manager and Staff
    // =====================================================

    // GET: api/suppliers/{id}
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SupplierResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var supplier = await _supplierService.GetByIdAsync(
            id,
            cancellationToken);

        if (supplier is null)
        {
            return NotFound(new
            {
                message = "Supplier not found."
            });
        }

        return Ok(supplier);
    }

    // =====================================================
    // CREATE SUPPLIER
    // Administrator and Manager only
    // =====================================================

    // POST: api/suppliers
    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.ManagementAccess)]
    public async Task<ActionResult<SupplierResponse>> Create(
        [FromBody] CreateSupplierRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var supplier = await _supplierService.CreateAsync(
                request,
                cancellationToken);

            return CreatedAtAction(
                nameof(GetById),
                new { id = supplier.Id },
                supplier);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new
            {
                message = exception.Message
            });
        }
    }

    // =====================================================
    // UPDATE SUPPLIER
    // Administrator and Manager only
    // =====================================================

    // PUT: api/suppliers/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.ManagementAccess)]
    public async Task<ActionResult<SupplierResponse>> Update(
        Guid id,
        [FromBody] UpdateSupplierRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var supplier = await _supplierService.UpdateAsync(
                id,
                request,
                cancellationToken);

            if (supplier is null)
            {
                return NotFound(new
                {
                    message = "Supplier not found."
                });
            }

            return Ok(supplier);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new
            {
                message = exception.Message
            });
        }
    }

    // =====================================================
    // DEACTIVATE SUPPLIER
    // Administrator and Manager only
    // =====================================================

    // PATCH: api/suppliers/{id}/deactivate
    [HttpPatch("{id:guid}/deactivate")]
    [Authorize(Policy = AuthorizationPolicies.ManagementAccess)]
    public async Task<IActionResult> Deactivate(
        Guid id,
        CancellationToken cancellationToken)
    {
        var deactivated = await _supplierService.DeactivateAsync(
            id,
            cancellationToken);

        if (!deactivated)
        {
            return NotFound(new
            {
                message = "Supplier not found."
            });
        }

        return NoContent();
    }
}