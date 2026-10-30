namespace KCStoreCore.Application.DTOs.UserManagement;

public sealed class UserCreationResult
{
    public bool Succeeded { get; set; }

    public UserResponse? User { get; set; }

    public IReadOnlyList<string> Errors { get; set; } =
        Array.Empty<string>();
}