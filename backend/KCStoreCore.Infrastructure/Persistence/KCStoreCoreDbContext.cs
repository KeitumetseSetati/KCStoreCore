using KCStoreCore.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace KCStoreCore.Infrastructure.Persistence;

public class KCStoreCoreDbContext : DbContext
{
    public KCStoreCoreDbContext(
        DbContextOptions<KCStoreCoreDbContext> options)
        : base(options)
    {
    }

    // Product management
    public DbSet<Product> Products => Set<Product>();

    public DbSet<Category> Categories => Set<Category>();

    // Store management and inventory
    public DbSet<Store> Stores => Set<Store>();

    public DbSet<StoreInventory> StoreInventories
        => Set<StoreInventory>();

    // Supplier management
    public DbSet<Supplier> Suppliers => Set<Supplier>();

    // Purchase order management
    public DbSet<PurchaseOrder> PurchaseOrders
        => Set<PurchaseOrder>();

    public DbSet<PurchaseOrderItem> PurchaseOrderItems
        => Set<PurchaseOrderItem>();

    // Stock receiving
    public DbSet<StockReceipt> StockReceipts
        => Set<StockReceipt>();

    public DbSet<StockReceiptItem> StockReceiptItems
        => Set<StockReceiptItem>();

    // Inventory audit history
    public DbSet<InventoryTransaction> InventoryTransactions
        => Set<InventoryTransaction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Entity relationships, indexes, and database constraints
        // will be configured in Phase 4, Step 4.
    }
}