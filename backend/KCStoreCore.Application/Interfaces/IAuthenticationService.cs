using KCStoreCore.Application.DTOs.Authentication;

namespace KCStoreCore.Application.Interfaces;

public interface IAuthenticationService
{
    // =====================================================
    // AUTHENTICATE USER
    // =====================================================

    Task<LoginResponse?> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken = default);

    // =====================================================
    // GET CURRENT AUTHENTICATED USER
    // =====================================================

    Task<CurrentUserResponse?> GetCurrentUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default);
}