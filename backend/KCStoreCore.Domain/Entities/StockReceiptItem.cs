namespace KCStoreCore.Domain.Entities;

public class StockReceiptItem
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid StockReceiptId { get; set; }

    public Guid PurchaseOrderItemId { get; set; }

    public int QuantityReceived { get; set; }

    public StockReceipt StockReceipt { get; set; } = null!;

    public PurchaseOrderItem PurchaseOrderItem { get; set; } = null!;
}