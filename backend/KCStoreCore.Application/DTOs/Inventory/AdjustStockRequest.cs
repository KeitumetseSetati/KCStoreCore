using System.ComponentModel.DataAnnotations;

namespace KCStoreCore.Application.DTOs.Inventory;

public class AdjustStockRequest
{
    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be greater than zero.")]
    public int Quantity { get; set; }

    [Required]
    public bool IsIncrease { get; set; }

    [MaxLength(100)]
    public string? ReferenceNumber { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}