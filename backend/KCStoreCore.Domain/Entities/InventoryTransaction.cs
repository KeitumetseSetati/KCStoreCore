using KCStoreCore.Domain.Enums;

namespace KCStoreCore.Domain.Entities;

public class InventoryTransaction
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid StoreId { get; set; }

    public Guid ProductId { get; set; }

    public InventoryTransactionType TransactionType { get; set; }

    public int QuantityChange { get; set; }

    public int QuantityBefore { get; set; }

    public int QuantityAfter { get; set; }

    public string? ReferenceNumber { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public Store Store { get; set; } = null!;

    public Product Product { get; set; } = null!;
}