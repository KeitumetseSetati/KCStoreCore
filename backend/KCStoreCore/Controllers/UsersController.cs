using KCStoreCore.Application.DTOs.UserManagement;
using KCStoreCore.Application.Interfaces;
using KCStoreCore.Application.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KCStoreCore.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Policy = AuthorizationPolicies.AdministratorOnly)]
public sealed class UsersController : ControllerBase
{
    private readonly IUserManagementService _userManagementService;

    public UsersController(
        IUserManagementService userManagementService)
    {
        _userManagementService = userManagementService;
    }

    // =====================================================
    // GET ALL USERS
    // =====================================================

    [HttpGet]
    public async Task<IActionResult> GetAll(
        CancellationToken cancellationToken)
    {
        var users = await _userManagementService.GetAllAsync(
            cancellationToken);

        return Ok(users);
    }

    // =====================================================
    // GET USER BY ID
    // =====================================================

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var user = await _userManagementService.GetByIdAsync(
            id,
            cancellationToken);

        if (user is null)
        {
            return NotFound(new
            {
                Message = "User not found."
            });
        }

        return Ok(user);
    }

    // =====================================================
    // CREATE USER
    // =====================================================

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _userManagementService.CreateAsync(
            request,
            cancellationToken);

        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                Message = "User creation failed.",
                Errors = result.Errors
            });
        }

        if (result.User is null)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    Message = "User creation returned no user."
                });
        }

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.User.UserId },
            result.User);
    }

    // =====================================================
    // UPDATE USER ROLE
    // =====================================================

    [HttpPut("{id:guid}/role")]
    public async Task<IActionResult> UpdateRole(
        Guid id,
        [FromBody] UpdateUserRoleRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _userManagementService.UpdateRoleAsync(
            id,
            request,
            cancellationToken);

        if (result.UserNotFound)
        {
            return NotFound(new
            {
                Message = "User not found."
            });
        }

        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                Message = "User role update failed.",
                Errors = result.Errors
            });
        }

        if (result.User is null)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    Message = "User role update returned no user."
                });
        }

        return Ok(result.User);
    }
}