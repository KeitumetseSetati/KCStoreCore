namespace KCStoreCore.Application.DTOs.UserManagement;

public sealed class UserRoleUpdateResult
{
    // Indicates whether the role update succeeded.
    public bool Succeeded { get; set; }

    // Indicates whether the requested user was found.
    public bool UserNotFound { get; set; }

    // Contains the updated user when successful.
    public UserResponse? User { get; set; }

    // Contains validation or Identity error messages.
    public IReadOnlyList<string> Errors { get; set; } =
        Array.Empty<string>();
}