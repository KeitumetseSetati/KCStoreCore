using KCStoreCore.Application.DTOs.UserManagement;

namespace KCStoreCore.Application.Interfaces;

public interface IUserManagementService
{
    // =====================================================
    // GET ALL USERS
    // =====================================================

    Task<IReadOnlyList<UserResponse>> GetAllAsync(
        CancellationToken cancellationToken = default);

    // =====================================================
    // GET USER BY ID
    // =====================================================

    Task<UserResponse?> GetByIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    // =====================================================
    // CREATE USER
    // =====================================================

    Task<UserCreationResult> CreateAsync(
        CreateUserRequest request,
        CancellationToken cancellationToken = default);

    // =====================================================
    // UPDATE USER ROLE
    // =====================================================

    Task<UserRoleUpdateResult> UpdateRoleAsync(
        Guid userId,
        UpdateUserRoleRequest request,
        CancellationToken cancellationToken = default);
}