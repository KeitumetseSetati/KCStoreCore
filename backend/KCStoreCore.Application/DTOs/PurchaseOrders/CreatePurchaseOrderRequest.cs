using System.ComponentModel.DataAnnotations;

namespace KCStoreCore.Application.DTOs.PurchaseOrders;

public class CreatePurchaseOrderRequest
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string OrderNumber { get; set; } = string.Empty;

    [Required]
    public Guid SupplierId { get; set; }

    [Required]
    public Guid StoreId { get; set; }

    [Required]
    [MinLength(1, ErrorMessage = "A purchase order must contain at least one item.")]
    public List<CreatePurchaseOrderItemRequest> Items { get; set; } = new();
}