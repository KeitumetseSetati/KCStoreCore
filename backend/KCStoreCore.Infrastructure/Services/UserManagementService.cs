using System.Data;
using KCStoreCore.Application.DTOs.UserManagement;
using KCStoreCore.Application.Interfaces;
using KCStoreCore.Application.Security;
using KCStoreCore.Infrastructure.Identity;
using KCStoreCore.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace KCStoreCore.Infrastructure.Services;

public sealed class UserManagementService : IUserManagementService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly KCStoreCoreDbContext _dbContext;

    public UserManagementService(
        UserManager<ApplicationUser> userManager,
        KCStoreCoreDbContext dbContext)
    {
        _userManager = userManager;
        _dbContext = dbContext;
    }

    // =====================================================
    // GET ALL USERS
    // =====================================================

    public async Task<IReadOnlyList<UserResponse>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var users = await _userManager.Users
            .AsNoTracking()
            .OrderBy(user => user.FirstName)
            .ThenBy(user => user.LastName)
            .ToListAsync(cancellationToken);

        var responses = new List<UserResponse>();

        foreach (var user in users)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var roles = await _userManager.GetRolesAsync(user);

            responses.Add(MapToResponse(user, roles));
        }

        return responses;
    }

    // =====================================================
    // GET USER BY ID
    // =====================================================

    public async Task<UserResponse?> GetByIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var user = await _userManager.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(
                user => user.Id == userId,
                cancellationToken);

        if (user is null)
        {
            return null;
        }

        var roles = await _userManager.GetRolesAsync(user);

        return MapToResponse(user, roles);
    }

    // =====================================================
    // CREATE USER
    // =====================================================

    public async Task<UserCreationResult> CreateAsync(
        CreateUserRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        cancellationToken.ThrowIfCancellationRequested();

        // Only Manager and Staff accounts can be created
        // through this operation.
        if (request.Role != ApplicationRoles.Manager &&
            request.Role != ApplicationRoles.Staff)
        {
            return Failure(
                "Only Manager and Staff roles are allowed.");
        }

        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.FirstName) ||
            string.IsNullOrWhiteSpace(request.LastName) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return Failure(
                "Email, first name, last name and password are required.");
        }

        var email = request.Email.Trim();

        var existingUser = await _userManager.FindByEmailAsync(email);

        if (existingUser is not null)
        {
            return Failure(
                "A user with this email address already exists.");
        }

        cancellationToken.ThrowIfCancellationRequested();

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            IsActive = false,
            CreatedAtUtc = DateTime.UtcNow
        };

        // Identity validates and hashes the password.
        // The account remains inactive until its role
        // has been assigned successfully.
        var createResult = await _userManager.CreateAsync(
            user,
            request.Password);

        if (!createResult.Succeeded)
        {
            return Failure(
                createResult.Errors.Select(
                    error => error.Description).ToArray());
        }

        // Assign the requested role.
        var roleResult = await _userManager.AddToRoleAsync(
            user,
            request.Role);

        if (!roleResult.Succeeded)
        {
            // The user remains inactive if role assignment fails.
            // Attempt to remove the incomplete account.
            var deleteResult = await _userManager.DeleteAsync(user);

            var errors = roleResult.Errors
                .Select(error => error.Description)
                .ToList();

            if (!deleteResult.Succeeded)
            {
                errors.Add(
                    "The incomplete account could not be removed. " +
                    "Administrator intervention is required.");
            }

            return Failure(errors.ToArray());
        }

        cancellationToken.ThrowIfCancellationRequested();

        // Activate the account after successful role assignment.
        user.IsActive = true;
        user.UpdatedAtUtc = DateTime.UtcNow;

        var updateResult = await _userManager.UpdateAsync(user);

        if (!updateResult.Succeeded)
        {
            // Leave the account inactive and attempt cleanup.
            user.IsActive = false;

            var deleteResult = await _userManager.DeleteAsync(user);

            var errors = updateResult.Errors
                .Select(error => error.Description)
                .ToList();

            if (!deleteResult.Succeeded)
            {
                errors.Add(
                    "The incomplete account could not be removed. " +
                    "Administrator intervention is required.");
            }

            return Failure(errors.ToArray());
        }

        var roles = await _userManager.GetRolesAsync(user);

        return new UserCreationResult
        {
            Succeeded = true,
            User = MapToResponse(user, roles),
            Errors = Array.Empty<string>()
        };
    }

    // =====================================================
    // UPDATE USER ROLE - TRANSACTIONAL
    // =====================================================

    public async Task<UserRoleUpdateResult> UpdateRoleAsync(
        Guid userId,
        UpdateUserRoleRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        cancellationToken.ThrowIfCancellationRequested();

        // Only Manager and Staff are valid target roles.
        if (request.Role != ApplicationRoles.Manager &&
            request.Role != ApplicationRoles.Staff)
        {
            return RoleUpdateFailure(
                "Only Manager and Staff roles are allowed.");
        }

        if (userId == Guid.Empty)
        {
            return RoleUpdateNotFound();
        }

        try
        {
            // SERIALIZABLE provides the strongest standard
            // SQL Server transaction isolation level.
            //
            // Identity role operations use the same DbContext
            // registered in Program.cs.
            //
            // The transaction will be rolled back automatically
            // if it is disposed without being committed.
            await using var transaction =
                await _dbContext.Database.BeginTransactionAsync(
                    IsolationLevel.Serializable,
                    cancellationToken);

            // Read the user inside the transaction.
            var user = await _userManager.FindByIdAsync(
                userId.ToString());

            if (user is null)
            {
                return RoleUpdateNotFound();
            }

            cancellationToken.ThrowIfCancellationRequested();

            // Read existing roles inside the same transaction.
            var currentRoles = await _userManager.GetRolesAsync(user);

            // Administrator accounts are protected.
            if (currentRoles.Contains(
                ApplicationRoles.Administrator))
            {
                return RoleUpdateFailure(
                    "Administrator roles cannot be modified.");
            }

            // Require exactly one valid existing role.
            if (currentRoles.Count != 1 ||
                (currentRoles[0] != ApplicationRoles.Manager &&
                 currentRoles[0] != ApplicationRoles.Staff))
            {
                return RoleUpdateFailure(
                    "The user's current role configuration is invalid.");
            }

            var previousRole = currentRoles[0];

            // No role change is needed.
            if (previousRole == request.Role)
            {
                return new UserRoleUpdateResult
                {
                    Succeeded = true,
                    UserNotFound = false,
                    User = MapToResponse(user, currentRoles),
                    Errors = Array.Empty<string>()
                };
            }

            cancellationToken.ThrowIfCancellationRequested();

            // STEP 1: Add the requested role.
            //
            // Any changes made here remain part of
            // the uncommitted database transaction.
            var addResult = await _userManager.AddToRoleAsync(
                user,
                request.Role);

            if (!addResult.Succeeded)
            {
                return RoleUpdateFailure(
                    addResult.Errors
                        .Select(error => error.Description)
                        .ToArray());
            }

            cancellationToken.ThrowIfCancellationRequested();

            // STEP 2: Remove the previous role.
            //
            // If this operation fails, disposing the
            // transaction rolls back the new role too.
            var removeResult =
                await _userManager.RemoveFromRoleAsync(
                    user,
                    previousRole);

            if (!removeResult.Succeeded)
            {
                return RoleUpdateFailure(
                    removeResult.Errors
                        .Select(error => error.Description)
                        .ToArray());
            }

            cancellationToken.ThrowIfCancellationRequested();

            // STEP 3: Update the account timestamp.
            user.UpdatedAtUtc = DateTime.UtcNow;

            var updateResult = await _userManager.UpdateAsync(user);

            if (!updateResult.Succeeded)
            {
                return RoleUpdateFailure(
                    updateResult.Errors
                        .Select(error => error.Description)
                        .ToArray());
            }

            cancellationToken.ThrowIfCancellationRequested();

            // STEP 4: Verify the role configuration
            // before committing the transaction.
            var updatedRoles =
                await _userManager.GetRolesAsync(user);

            if (updatedRoles.Count != 1 ||
                updatedRoles[0] != request.Role)
            {
                return RoleUpdateFailure(
                    "The updated role configuration could not " +
                    "be verified. No changes were committed.");
            }

            // STEP 5: Commit all changes together.
            //
            // Until this succeeds, the database
            // transaction is not considered complete.
            await transaction.CommitAsync(cancellationToken);

            return new UserRoleUpdateResult
            {
                Succeeded = true,
                UserNotFound = false,
                User = MapToResponse(user, updatedRoles),
                Errors = Array.Empty<string>()
            };
        }
        catch (DbUpdateConcurrencyException)
        {
            // Another operation changed the data while
            // this request was being processed.
            return RoleUpdateFailure(
                "The user was modified by another operation. " +
                "Please refresh the user and try again.");
        }
        catch (DbUpdateException)
        {
            // Avoid exposing database details to API clients.
            return RoleUpdateFailure(
                "The role update could not be completed. " +
                "Please refresh the user and try again.");
        }
        catch (SqlException exception)
            when (exception.Number == 1205 ||
                  exception.Number == 1222 ||
                  exception.Number == 3960)
        {
            // SQL Server concurrency-related errors:
            //
            // 1205: Deadlock victim
            // 1222: Lock request timeout
            // 3960: Snapshot update conflict
            //
            // The transaction is not committed.
            return RoleUpdateFailure(
                "The role update encountered a database " +
                "concurrency conflict. Please try again.");
        }
    }

    // =====================================================
    // CREATE USER FAILURE RESULT
    // =====================================================

    private static UserCreationResult Failure(
        params string[] errors)
    {
        return new UserCreationResult
        {
            Succeeded = false,
            User = null,
            Errors = errors
        };
    }

    // =====================================================
    // CREATE ROLE UPDATE FAILURE RESULT
    // =====================================================

    private static UserRoleUpdateResult RoleUpdateFailure(
        params string[] errors)
    {
        return new UserRoleUpdateResult
        {
            Succeeded = false,
            UserNotFound = false,
            User = null,
            Errors = errors
        };
    }

    // =====================================================
    // CREATE ROLE UPDATE NOT FOUND RESULT
    // =====================================================

    private static UserRoleUpdateResult RoleUpdateNotFound()
    {
        return new UserRoleUpdateResult
        {
            Succeeded = false,
            UserNotFound = true,
            User = null,
            Errors = new[] { "User not found." }
        };
    }

    // =====================================================
    // MAP IDENTITY USER TO RESPONSE DTO
    // =====================================================

    private static UserResponse MapToResponse(
        ApplicationUser user,
        IList<string> roles)
    {
        return new UserResponse
        {
            UserId = user.Id,
            Email = user.Email ?? string.Empty,
            FirstName = user.FirstName,
            LastName = user.LastName,
            IsActive = user.IsActive,
            CreatedAtUtc = user.CreatedAtUtc,
            Roles = roles.ToArray()
        };
    }
}