using KCStoreCore.Application.DTOs.PurchaseOrders;
using KCStoreCore.Application.Interfaces;
using KCStoreCore.Application.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KCStoreCore.Controllers;

[ApiController]
[Route("api/purchase-orders")]
[Authorize(Policy = AuthorizationPolicies.InventoryAccess)]
public class PurchaseOrdersController : ControllerBase
{
    private readonly IPurchaseOrderService _purchaseOrderService;

    public PurchaseOrdersController(IPurchaseOrderService purchaseOrderService)
    {
        _purchaseOrderService = purchaseOrderService;
    }

    // =====================================================
    // GET ALL PURCHASE ORDERS
    // Administrator, Manager and Staff
    // =====================================================

    // GET: api/purchase-orders
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PurchaseOrderResponse>>> GetAll(
        CancellationToken cancellationToken)
    {
        var orders = await _purchaseOrderService.GetAllAsync(
            cancellationToken);

        return Ok(orders);
    }

    // =====================================================
    // GET PURCHASE ORDER BY ID
    // Administrator, Manager and Staff
    // =====================================================

    // GET: api/purchase-orders/{id}
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PurchaseOrderResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var order = await _purchaseOrderService.GetByIdAsync(
            id,
            cancellationToken);

        if (order is null)
        {
            return NotFound(new
            {
                message = "Purchase order not found."
            });
        }

        return Ok(order);
    }

    // =====================================================
    // CREATE PURCHASE ORDER
    // Administrator and Manager only
    // =====================================================

    // POST: api/purchase-orders
    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.ManagementAccess)]
    public async Task<ActionResult<PurchaseOrderResponse>> Create(
        [FromBody] CreatePurchaseOrderRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var order = await _purchaseOrderService.CreateAsync(
                request,
                cancellationToken);

            return CreatedAtAction(
                nameof(GetById),
                new { id = order.Id },
                order);
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
    }

    // =====================================================
    // PLACE PURCHASE ORDER
    // Administrator and Manager only
    // =====================================================

    // POST: api/purchase-orders/{id}/place
    [HttpPost("{id:guid}/place")]
    [Authorize(Policy = AuthorizationPolicies.ManagementAccess)]
    public async Task<ActionResult<PurchaseOrderResponse>> PlaceOrder(
        Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var order = await _purchaseOrderService.PlaceOrderAsync(
                id,
                cancellationToken);

            return Ok(order);
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(new
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
    }

    // =====================================================
    // CANCEL PURCHASE ORDER
    // Administrator and Manager only
    // =====================================================

    // POST: api/purchase-orders/{id}/cancel
    [HttpPost("{id:guid}/cancel")]
    [Authorize(Policy = AuthorizationPolicies.ManagementAccess)]
    public async Task<ActionResult<PurchaseOrderResponse>> Cancel(
        Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var order = await _purchaseOrderService.CancelAsync(
                id,
                cancellationToken);

            return Ok(order);
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(new
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
    }
}