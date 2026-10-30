namespace KCStoreCore.Application.DTOs.StockReceipts;

public class StockReceiptItemResponse
{
    public Guid Id { get; set; }

    public Guid PurchaseOrderItemId { get; set; }

    public Guid ProductId { get; set; }

    public string ProductSku { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public int QuantityReceived { get; set; }

    public int TotalQuantityReceived { get; set; }

    public int QuantityOutstanding { get; set; }
}