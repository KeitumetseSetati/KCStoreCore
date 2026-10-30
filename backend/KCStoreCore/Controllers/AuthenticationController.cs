using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using KCStoreCore.Application.DTOs.Authentication;
using KCStoreCore.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace KCStoreCore.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthenticationController : ControllerBase
{
    private readonly IAuthenticationService _authenticationService;

    public AuthenticationController(
        IAuthenticationService authenticationService)
    {
        _authenticationService = authenticationService;
    }

    // =====================================================
    // POST: /api/auth/login
    // =====================================================

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(
        typeof(LoginResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status400BadRequest)]
    [ProducesResponseType(
        StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authenticationService.LoginAsync(
            request,
            cancellationToken);

        if (result is null)
        {
            return Unauthorized(new
            {
                Message = "Invalid email or password."
            });
        }

        return Ok(result);
    }

    // =====================================================
    // GET: /api/auth/me
    // =====================================================

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(
        typeof(CurrentUserResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<CurrentUserResponse>> GetCurrentUser(
        CancellationToken cancellationToken)
    {
        // Read the user ID from the validated JWT.
        var userIdValue = User.FindFirstValue(
            JwtRegisteredClaimNames.Sub);

        // Reject requests without a valid user ID claim.
        if (!Guid.TryParse(userIdValue, out var userId))
        {
            return Unauthorized(new
            {
                Message = "Invalid authentication token."
            });
        }

        // Retrieve the current user from SQL Server.
        var currentUser = await _authenticationService.GetCurrentUserAsync(
            userId,
            cancellationToken);

        // Reject accounts that no longer exist or are inactive.
        if (currentUser is null)
        {
            return Unauthorized(new
            {
                Message = "User account is unavailable."
            });
        }

        return Ok(currentUser);
    }
}