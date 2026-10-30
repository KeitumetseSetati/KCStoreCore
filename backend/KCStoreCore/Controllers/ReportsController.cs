using KCStoreCore.Application.DTOs.Reports;
using KCStoreCore.Application.Interfaces;
using KCStoreCore.Application.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KCStoreCore.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Policy = AuthorizationPolicies.ManagementAccess)]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    // =====================================================
    // GET DASHBOARD SUMMARY
    // Administrator and Manager only
    // =====================================================

    [HttpGet("dashboard")]
    [ProducesResponseType(
        typeof(DashboardSummaryResponse),
        StatusCodes.Status200OK)]
    public async Task<ActionResult<DashboardSummaryResponse>> GetDashboard(
        [FromQuery] Guid? storeId,
        CancellationToken cancellationToken)
    {
        var result = await _reportService.GetDashboardSummaryAsync(
            storeId,
            cancellationToken);

        return Ok(result);
    }

    // =====================================================
    // GET INVENTORY REPORT
    // Administrator and Manager only
    // =====================================================

    [HttpGet("inventory")]
    [ProducesResponseType(
        typeof(IReadOnlyList<InventoryReportItemResponse>),
        StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<InventoryReportItemResponse>>> GetInventory(
        [FromQuery] Guid? storeId,
        CancellationToken cancellationToken)
    {
        var result = await _reportService.GetInventoryReportAsync(
            storeId,
            cancellationToken);

        return Ok(result);
    }

    // =====================================================
    // GET LOW-STOCK REPORT
    // Administrator and Manager only
    // =====================================================

    [HttpGet("low-stock")]
    [ProducesResponseType(
        typeof(IReadOnlyList<LowStockReportItemResponse>),
        StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<LowStockReportItemResponse>>> GetLowStock(
        [FromQuery] Guid? storeId,
        CancellationToken cancellationToken)
    {
        var result = await _reportService.GetLowStockReportAsync(
            storeId,
            cancellationToken);

        return Ok(result);
    }

    // =====================================================
    // GET PURCHASE ORDERS REPORT
    // Administrator and Manager only
    // =====================================================

    [HttpGet("purchase-orders")]
    [ProducesResponseType(
        typeof(PurchaseOrderReportResponse),
        StatusCodes.Status200OK)]
    public async Task<ActionResult<PurchaseOrderReportResponse>> GetPurchaseOrders(
        [FromQuery] Guid? storeId,
        CancellationToken cancellationToken)
    {
        var result = await _reportService.GetPurchaseOrderReportAsync(
            storeId,
            cancellationToken);

        return Ok(result);
    }

    // =====================================================
    // GET STOCK MOVEMENTS REPORT
    // Administrator and Manager only
    // =====================================================

    [HttpGet("stock-movements")]
    [ProducesResponseType(
        typeof(IReadOnlyList<StockMovementReportItemResponse>),
        StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<StockMovementReportItemResponse>>> GetStockMovements(
        [FromQuery] Guid? storeId,
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        CancellationToken cancellationToken)
    {
        if (fromUtc.HasValue &&
            toUtc.HasValue &&
            fromUtc.Value > toUtc.Value)
        {
            return BadRequest(new
            {
                message = "The start date cannot be later than the end date."
            });
        }

        var result = await _reportService.GetStockMovementReportAsync(
            storeId,
            fromUtc,
            toUtc,
            cancellationToken);

        return Ok(result);
    }
}