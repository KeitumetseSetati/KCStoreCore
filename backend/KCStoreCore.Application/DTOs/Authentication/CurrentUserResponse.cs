namespace KCStoreCore.Application.DTOs.Authentication;

public sealed class CurrentUserResponse
{
    public Guid UserId { get; set; }

    public string Email { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public IReadOnlyList<string> Roles { get; set; } =
        Array.Empty<string>();
}