using KCStoreCore.Application.DTOs.Categories;
using KCStoreCore.Application.Interfaces;
using KCStoreCore.Application.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KCStoreCore.Controllers;

[ApiController]
[Route("api/categories")]
[Authorize(Policy = AuthorizationPolicies.InventoryAccess)]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    // =====================================================
    // GET ALL CATEGORIES
    // Administrator, Manager and Staff
    // =====================================================

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CategoryResponse>>> GetAll(
        [FromQuery] bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var categories = await _categoryService.GetAllAsync(
            includeInactive,
            cancellationToken);

        return Ok(categories);
    }

    // =====================================================
    // GET CATEGORY BY ID
    // Administrator, Manager and Staff
    // =====================================================

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CategoryResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var category = await _categoryService.GetByIdAsync(
            id,
            cancellationToken);

        if (category is null)
        {
            return NotFound(new
            {
                message = "Category not found."
            });
        }

        return Ok(category);
    }

    // =====================================================
    // CREATE CATEGORY
    // Administrator and Manager only
    // =====================================================

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.ManagementAccess)]
    public async Task<ActionResult<CategoryResponse>> Create(
        [FromBody] CreateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var category = await _categoryService.CreateAsync(
                request,
                cancellationToken);

            return CreatedAtAction(
                nameof(GetById),
                new { id = category.Id },
                category);
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
    // UPDATE CATEGORY
    // Administrator and Manager only
    // =====================================================

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.ManagementAccess)]
    public async Task<ActionResult<CategoryResponse>> Update(
        Guid id,
        [FromBody] UpdateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var category = await _categoryService.UpdateAsync(
                id,
                request,
                cancellationToken);

            if (category is null)
            {
                return NotFound(new
                {
                    message = "Category not found."
                });
            }

            return Ok(category);
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
    // DEACTIVATE CATEGORY
    // Administrator and Manager only
    // =====================================================

    [HttpPatch("{id:guid}/deactivate")]
    [Authorize(Policy = AuthorizationPolicies.ManagementAccess)]
    public async Task<IActionResult> Deactivate(
        Guid id,
        CancellationToken cancellationToken)
    {
        var deactivated = await _categoryService.DeactivateAsync(
            id,
            cancellationToken);

        if (!deactivated)
        {
            return NotFound(new
            {
                message = "Category not found."
            });
        }

        return NoContent();
    }
}