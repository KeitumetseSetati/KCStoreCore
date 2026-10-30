using System.ComponentModel.DataAnnotations;

namespace KCStoreCore.Application.DTOs.Products;

public class UpdateProductRequest
{
    [Required(ErrorMessage = "Product SKU is required.")]
    [StringLength(50, MinimumLength = 2)]
    public string Sku { get; set; } = string.Empty;

    [Required(ErrorMessage = "Product name is required.")]
    [StringLength(150, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }

    [Required]
    public Guid CategoryId { get; set; }

    [Range(typeof(decimal), "0", "999999999999.99",
        ErrorMessage = "Unit price must be zero or greater.")]
    public decimal UnitPrice { get; set; }

    [Range(typeof(decimal), "0", "999999999999.99",
        ErrorMessage = "Cost price must be zero or greater.")]
    public decimal CostPrice { get; set; }

    public bool IsActive { get; set; } = true;
}