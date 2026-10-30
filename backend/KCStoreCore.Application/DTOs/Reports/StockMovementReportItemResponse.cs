namespace KCStoreCore.Application.DTOs.Reports;

public class StockMovementReportItemResponse
{
    public Guid TransactionId { get; set; }

    public Guid StoreId { get; set; }

    public string StoreName { get; set; } = string.Empty;

    public Guid ProductId { get; set; }

    public string ProductSku { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string TransactionType { get; set; } = string.Empty;

    public int QuantityChange { get; set; }

    public int QuantityBefore { get; set; }

    public int QuantityAfter { get; set; }

    public string? ReferenceNumber { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}