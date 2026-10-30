namespace KCStoreCore.Application.DTOs.PurchaseOrders;

public class PurchaseOrderResponse
{
    public Guid Id { get; set; }

    public string OrderNumber { get; set; } = string.Empty;

    public Guid SupplierId { get; set; }

    public string SupplierName { get; set; } = string.Empty;

    public Guid StoreId { get; set; }

    public string StoreName { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public DateTime? OrderedAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }

    public decimal TotalAmount { get; set; }

    public List<PurchaseOrderItemResponse> Items { get; set; } = new();
}

public class PurchaseOrderItemResponse
{
    public Guid Id { get; set; }

    public Guid ProductId { get; set; }

    public string ProductSku { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public int QuantityOrdered { get; set; }

    public int QuantityReceived { get; set; }

    public int QuantityOutstanding { get; set; }

    public decimal UnitCost { get; set; }

    public decimal LineTotal { get; set; }
}