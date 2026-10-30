using System.ComponentModel.DataAnnotations;

namespace KCStoreCore.Application.DTOs.PurchaseOrders;

public class CreatePurchaseOrderItemRequest
{
    [Required]
    public Guid ProductId { get; set; }

    [Range(1, int.MaxValue,
        ErrorMessage = "Quantity ordered must be greater than zero.")]
    public int QuantityOrdered { get; set; }

    [Range(typeof(decimal), "0", "9999999999999999.99",
        ErrorMessage = "Unit cost must be zero or greater.")]
    public decimal UnitCost { get; set; }
}