namespace KCStoreCore.Application.DTOs.StockReceipts;

public class StockReceiptResponse
{
    public Guid Id { get; set; }

    public Guid PurchaseOrderId { get; set; }

    public string PurchaseOrderNumber { get; set; } = string.Empty;

    public string ReceiptNumber { get; set; } = string.Empty;

    public Guid StoreId { get; set; }

    public string StoreName { get; set; } = string.Empty;

    public string PurchaseOrderStatus { get; set; } = string.Empty;

    public DateTime ReceivedAtUtc { get; set; }

    public string? Notes { get; set; }

    public int TotalUnitsReceived { get; set; }

    public List<StockReceiptItemResponse> Items { get; set; } = new();
}