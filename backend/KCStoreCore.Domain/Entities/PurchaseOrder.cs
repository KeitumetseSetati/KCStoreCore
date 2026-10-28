namespace KCStoreCore.Domain.Entities;

public class PurchaseOrder
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string OrderNumber { get; set; } = string.Empty;

    public Guid SupplierId { get; set; }

    public Guid StoreId { get; set; }

    public string Status { get; set; } = "Draft";

    public DateTime? OrderedAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAtUtc { get; set; }

    public Supplier Supplier { get; set; } = null!;

    public Store Store { get; set; } = null!;

    public ICollection<PurchaseOrderItem> Items { get; set; }
        = new List<PurchaseOrderItem>();

    public ICollection<StockReceipt> Receipts { get; set; }
        = new List<StockReceipt>();
}