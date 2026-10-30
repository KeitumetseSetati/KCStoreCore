namespace KCStoreCore.Application.DTOs.Inventory;

public class StoreInventoryResponse
{
    public Guid Id { get; set; }

    public Guid StoreId { get; set; }

    public string StoreCode { get; set; } = string.Empty;

    public string StoreName { get; set; } = string.Empty;

    public Guid ProductId { get; set; }

    public string ProductSku { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public int QuantityOnHand { get; set; }

    public int ReorderLevel { get; set; }

    public bool IsLowStock { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }
}