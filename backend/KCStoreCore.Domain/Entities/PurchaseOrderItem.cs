namespace KCStoreCore.Domain.Entities;

public class PurchaseOrderItem
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid PurchaseOrderId { get; set; }

    public Guid ProductId { get; set; }

    public int QuantityOrdered { get; set; }

    public decimal UnitCost { get; set; }

    public PurchaseOrder PurchaseOrder { get; set; } = null!;

    public Product Product { get; set; } = null!;

    public ICollection<StockReceiptItem> ReceiptItems { get; set; }
        = new List<StockReceiptItem>();
}