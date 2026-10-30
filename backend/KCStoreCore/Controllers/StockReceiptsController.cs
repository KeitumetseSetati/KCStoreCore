using KCStoreCore.Application.DTOs.StockReceipts;
using KCStoreCore.Application.Interfaces;
using KCStoreCore.Application.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KCStoreCore.Controllers;

[ApiController]
[Route("api/stock-receipts")]
[Authorize(Policy = AuthorizationPolicies.InventoryAccess)]
public class StockReceiptsController : ControllerBase
{
    private readonly IStockReceiptService _stockReceiptService;

    public StockReceiptsController(
        IStockReceiptService stockReceiptService)
    {
        _stockReceiptService = stockReceiptService;
    }

    // =====================================================
    // GET ALL STOCK RECEIPTS
    // Administrator, Manager and Staff
    // =====================================================

    [HttpGet]
    [ProducesResponseType(
        typeof(IReadOnlyList<StockReceiptResponse>),
        StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        CancellationToken cancellationToken)
    {
        var receipts = await _stockReceiptService.GetAllAsync(
            cancellationToken);

        return Ok(receipts);
    }

    // =====================================================
    // GET STOCK RECEIPT BY ID
    // Administrator, Manager and Staff
    // =====================================================

    [HttpGet("{id:guid}")]
    [ProducesResponseType(
        typeof(StockReceiptResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var receipt = await _stockReceiptService.GetByIdAsync(
            id,
            cancellationToken);

        if (receipt is null)
        {
            return NotFound(new
            {
                message = "Stock receipt not found."
            });
        }

        return Ok(receipt);
    }

    // =====================================================
    // GET STOCK RECEIPTS BY PURCHASE ORDER
    // Administrator, Manager and Staff
    // =====================================================

    [HttpGet("purchase-orders/{purchaseOrderId:guid}")]
    [ProducesResponseType(
        typeof(IReadOnlyList<StockReceiptResponse>),
        StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByPurchaseOrder(
        Guid purchaseOrderId,
        CancellationToken cancellationToken)
    {
        var receipts =
            await _stockReceiptService.GetByPurchaseOrderAsync(
                purchaseOrderId,
                cancellationToken);

        return Ok(receipts);
    }

    // =====================================================
    // CREATE STOCK RECEIPT
    // Administrator, Manager and Staff
    // =====================================================

    [HttpPost]
    [ProducesResponseType(
        typeof(StockReceiptResponse),
        StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(
        [FromBody] CreateStockReceiptRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var receipt = await _stockReceiptService.CreateAsync(
                request,
                cancellationToken);

            return CreatedAtAction(
                nameof(GetById),
                new { id = receipt.Id },
                receipt);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new
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
}