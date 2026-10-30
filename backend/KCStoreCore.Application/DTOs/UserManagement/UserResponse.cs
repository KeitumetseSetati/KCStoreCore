namespace KCStoreCore.Application.DTOs.UserManagement;

public sealed class UserResponse
{
    public Guid UserId { get; set; }

    public string Email { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public IReadOnlyList<string> Roles { get; set; } =
        Array.Empty<string>();

    public DateTime CreatedAtUtc { get; set; }
}