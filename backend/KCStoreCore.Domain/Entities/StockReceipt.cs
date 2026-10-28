namespace KCStoreCore.Domain.Entities;

public class StockReceipt
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid PurchaseOrderId { get; set; }

    public string ReceiptNumber { get; set; } = string.Empty;

    public DateTime ReceivedAtUtc { get; set; } = DateTime.UtcNow;

    public string? Notes { get; set; }

    public PurchaseOrder PurchaseOrder { get; set; } = null!;

    public ICollection<StockReceiptItem> Items { get; set; }
        = new List<StockReceiptItem>();
}