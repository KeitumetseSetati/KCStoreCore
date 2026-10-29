using System.ComponentModel.DataAnnotations;

namespace KCStoreCore.Application.DTOs.Categories;

public class UpdateCategoryRequest
{
    [Required(ErrorMessage = "Category name is required.")]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;
}