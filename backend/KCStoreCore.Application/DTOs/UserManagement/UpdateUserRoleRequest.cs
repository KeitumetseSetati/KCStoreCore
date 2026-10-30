using System.ComponentModel.DataAnnotations;

namespace KCStoreCore.Application.DTOs.UserManagement;

public sealed class UpdateUserRoleRequest
{
    [Required(ErrorMessage = "A user role is required.")]
    public string Role { get; set; } = string.Empty;
}