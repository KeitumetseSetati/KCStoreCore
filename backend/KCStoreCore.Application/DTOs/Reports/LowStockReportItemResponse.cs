namespace KCStoreCore.Application.DTOs.Reports;

public class LowStockReportItemResponse
{
    public Guid StoreId { get; set; }

    public string StoreName { get; set; } = string.Empty;

    public Guid ProductId { get; set; }

    public string ProductSku { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public int QuantityOnHand { get; set; }

    public int ReorderLevel { get; set; }

    public int SuggestedReorderQuantity { get; set; }

    public bool IsOutOfStock { get; set; }
}