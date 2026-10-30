using System.ComponentModel.DataAnnotations;

namespace KCStoreCore.Application.DTOs.StockReceipts;

public class CreateStockReceiptRequest
{
    [Required]
    public Guid PurchaseOrderId { get; set; }

    [Required]
    [StringLength(
        50,
        MinimumLength = 1,
        ErrorMessage = "Receipt number must contain between 1 and 50 characters.")]
    public string ReceiptNumber { get; set; } = string.Empty;

    [StringLength(
        1000,
        ErrorMessage = "Notes cannot exceed 1000 characters.")]
    public string? Notes { get; set; }

    [Required]
    [MinLength(
        1,
        ErrorMessage = "A stock receipt must contain at least one item.")]
    public List<CreateStockReceiptItemRequest> Items { get; set; } = new();
}