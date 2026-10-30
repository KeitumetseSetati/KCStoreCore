namespace KCStoreCore.Application.DTOs.Reports;

public class InventoryReportItemResponse
{
    public Guid StoreId { get; set; }

    public string StoreCode { get; set; } = string.Empty;

    public string StoreName { get; set; } = string.Empty;

    public Guid ProductId { get; set; }

    public string ProductSku { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public int QuantityOnHand { get; set; }

    public int ReorderLevel { get; set; }

    public decimal UnitCost { get; set; }

    public decimal InventoryValue { get; set; }

    public bool IsLowStock { get; set; }

    public DateTime? LastUpdatedAtUtc { get; set; }
}