using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using KCStoreCore.Application.Configuration;
using KCStoreCore.Application.DTOs.Authentication;
using KCStoreCore.Application.Interfaces;
using KCStoreCore.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace KCStoreCore.Infrastructure.Services;

public sealed class AuthenticationService : IAuthenticationService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly JwtSettings _jwtSettings;

    public AuthenticationService(
        UserManager<ApplicationUser> userManager,
        IOptions<JwtSettings> jwtOptions)
    {
        _userManager = userManager;
        _jwtSettings = jwtOptions.Value;
    }

    // =====================================================
    // AUTHENTICATE USER
    // =====================================================

    public async Task<LoginResponse?> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return null;
        }

        var user = await _userManager.FindByEmailAsync(
            request.Email.Trim());

        if (user is null)
        {
            return null;
        }

        if (!user.IsActive)
        {
            return null;
        }

        if (await _userManager.IsLockedOutAsync(user))
        {
            return null;
        }

        cancellationToken.ThrowIfCancellationRequested();

        var passwordValid = await _userManager.CheckPasswordAsync(
            user,
            request.Password);

        if (!passwordValid)
        {
            if (_userManager.SupportsUserLockout)
            {
                var failedResult =
                    await _userManager.AccessFailedAsync(user);

                if (!failedResult.Succeeded)
                {
                    return null;
                }
            }

            return null;
        }

        if (_userManager.SupportsUserLockout)
        {
            var resetResult =
                await _userManager.ResetAccessFailedCountAsync(user);

            if (!resetResult.Succeeded)
            {
                return null;
            }
        }

        cancellationToken.ThrowIfCancellationRequested();

        var roles = await _userManager.GetRolesAsync(user);

        var issuedAtUtc = DateTime.UtcNow;

        var expiresAtUtc = issuedAtUtc.AddMinutes(
            _jwtSettings.AccessTokenExpirationMinutes);

        var claims = new List<Claim>
        {
            new(
                JwtRegisteredClaimNames.Sub,
                user.Id.ToString()),

            new(
                JwtRegisteredClaimNames.Jti,
                Guid.NewGuid().ToString()),

            new(
                JwtRegisteredClaimNames.Email,
                user.Email ?? string.Empty),

            new(
                "name",
                user.UserName ?? user.Email ?? string.Empty),

            new(
                "first_name",
                user.FirstName),

            new(
                "last_name",
                user.LastName)
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim("role", role));
        }

        var signingKeyBytes = Convert.FromBase64String(
            _jwtSettings.SigningKey);

        var signingKey = new SymmetricSecurityKey(
            signingKeyBytes);

        var signingCredentials = new SigningCredentials(
            signingKey,
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            notBefore: issuedAtUtc,
            expires: expiresAtUtc,
            signingCredentials: signingCredentials);

        var tokenHandler = new JwtSecurityTokenHandler();

        var accessToken = tokenHandler.WriteToken(token);

        return new LoginResponse
        {
            AccessToken = accessToken,
            TokenType = "Bearer",
            ExpiresAtUtc = expiresAtUtc,
            UserId = user.Id,
            Email = user.Email ?? string.Empty,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Roles = roles.ToArray()
        };
    }

    // =====================================================
    // GET CURRENT AUTHENTICATED USER
    // =====================================================

    public async Task<CurrentUserResponse?> GetCurrentUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (userId == Guid.Empty)
        {
            return null;
        }

        // Retrieve the user directly from the database.
        var user = await _userManager.FindByIdAsync(
            userId.ToString());

        if (user is null)
        {
            return null;
        }

        // Inactive users cannot retrieve their profiles.
        if (!user.IsActive)
        {
            return null;
        }

        cancellationToken.ThrowIfCancellationRequested();

        // Retrieve the user's current roles from Identity.
        var roles = await _userManager.GetRolesAsync(user);

        return new CurrentUserResponse
        {
            UserId = user.Id,
            Email = user.Email ?? string.Empty,
            FirstName = user.FirstName,
            LastName = user.LastName,
            IsActive = user.IsActive,
            Roles = roles.ToArray()
        };
    }
}