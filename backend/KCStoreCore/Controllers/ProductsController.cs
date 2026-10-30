using KCStoreCore.Application.DTOs.Products;
using KCStoreCore.Application.Interfaces;
using KCStoreCore.Application.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KCStoreCore.Controllers;

[ApiController]
[Route("api/products")]
[Authorize(Policy = AuthorizationPolicies.InventoryAccess)]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    // =====================================================
    // GET ALL PRODUCTS
    // Administrator, Manager and Staff
    // =====================================================

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProductResponse>>> GetAll(
        [FromQuery] bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var products = await _productService.GetAllAsync(
            includeInactive,
            cancellationToken);

        return Ok(products);
    }

    // =====================================================
    // GET PRODUCT BY ID
    // Administrator, Manager and Staff
    // =====================================================

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProductResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var product = await _productService.GetByIdAsync(
            id,
            cancellationToken);

        if (product is null)
        {
            return NotFound(new
            {
                message = "Product not found."
            });
        }

        return Ok(product);
    }

    // =====================================================
    // CREATE PRODUCT
    // Administrator and Manager only
    // =====================================================

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.ManagementAccess)]
    public async Task<ActionResult<ProductResponse>> Create(
        [FromBody] CreateProductRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var product = await _productService.CreateAsync(
                request,
                cancellationToken);

            return CreatedAtAction(
                nameof(GetById),
                new { id = product.Id },
                product);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    // =====================================================
    // UPDATE PRODUCT
    // Administrator and Manager only
    // =====================================================

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.ManagementAccess)]
    public async Task<ActionResult<ProductResponse>> Update(
        Guid id,
        [FromBody] UpdateProductRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var product = await _productService.UpdateAsync(
                id,
                request,
                cancellationToken);

            if (product is null)
            {
                return NotFound(new
                {
                    message = "Product not found."
                });
            }

            return Ok(product);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    // =====================================================
    // DEACTIVATE PRODUCT
    // Administrator and Manager only
    // =====================================================

    [HttpPatch("{id:guid}/deactivate")]
    [Authorize(Policy = AuthorizationPolicies.ManagementAccess)]
    public async Task<IActionResult> Deactivate(
        Guid id,
        CancellationToken cancellationToken)
    {
        var deactivated = await _productService.DeactivateAsync(
            id,
            cancellationToken);

        if (!deactivated)
        {
            return NotFound(new
            {
                message = "Product not found."
            });
        }

        return NoContent();
    }
}