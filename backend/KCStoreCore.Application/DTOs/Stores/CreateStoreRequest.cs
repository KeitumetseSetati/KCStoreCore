using System.ComponentModel.DataAnnotations;

namespace KCStoreCore.Application.DTOs.Stores;

public class CreateStoreRequest
{
    [Required(ErrorMessage = "Store code is required.")]
    [StringLength(30, MinimumLength = 2)]
    public string Code { get; set; } = string.Empty;

    [Required(ErrorMessage = "Store name is required.")]
    [StringLength(150, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(250)]
    public string? Address { get; set; }

    [StringLength(100)]
    public string? City { get; set; }
}