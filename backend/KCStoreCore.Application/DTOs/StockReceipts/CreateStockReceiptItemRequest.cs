using System.ComponentModel.DataAnnotations;

namespace KCStoreCore.Application.DTOs.StockReceipts;

public class CreateStockReceiptItemRequest
{
    [Required]
    public Guid PurchaseOrderItemId { get; set; }

    [Range(
        1,
        int.MaxValue,
        ErrorMessage = "Quantity received must be greater than zero.")]
    public int QuantityReceived { get; set; }
}