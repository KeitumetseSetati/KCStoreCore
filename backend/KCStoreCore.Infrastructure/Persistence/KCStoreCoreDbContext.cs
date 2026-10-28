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

    // Stores and inventory
    public DbSet<Store> Stores => Set<Store>();
    public DbSet<StoreInventory> StoreInventories
        => Set<StoreInventory>();

    // Suppliers
    public DbSet<Supplier> Suppliers => Set<Supplier>();

    // Purchasing
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

        // =====================================================
        // CATEGORY
        // =====================================================

        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(x => x.Description)
                .HasMaxLength(500);

            entity.HasIndex(x => x.Name)
                .IsUnique();
        });

        // =====================================================
        // PRODUCT
        // =====================================================

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Sku)
                .IsRequired()
                .HasMaxLength(50);

            entity.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(x => x.Description)
                .HasMaxLength(1000);

            entity.Property(x => x.UnitPrice)
                .HasPrecision(18, 2);

            entity.Property(x => x.CostPrice)
                .HasPrecision(18, 2);

            entity.HasIndex(x => x.Sku)
                .IsUnique();

            entity.HasOne(x => x.Category)
                .WithMany(x => x.Products)
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.ToTable(table =>
            {
                table.HasCheckConstraint(
                    "CK_Products_UnitPrice",
                    "[UnitPrice] >= 0");

                table.HasCheckConstraint(
                    "CK_Products_CostPrice",
                    "[CostPrice] >= 0");
            });
        });

        // =====================================================
        // STORE
        // =====================================================

        modelBuilder.Entity<Store>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Code)
                .IsRequired()
                .HasMaxLength(30);

            entity.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(150);

            entity.Property(x => x.Address)
                .HasMaxLength(300);

            entity.Property(x => x.City)
                .HasMaxLength(100);

            entity.HasIndex(x => x.Code)
                .IsUnique();
        });

        // =====================================================
        // STORE INVENTORY
        // =====================================================

        modelBuilder.Entity<StoreInventory>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.HasIndex(x => new
            {
                x.StoreId,
                x.ProductId
            }).IsUnique();

            entity.HasOne(x => x.Store)
                .WithMany(x => x.StoreInventories)
                .HasForeignKey(x => x.StoreId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Product)
                .WithMany(x => x.StoreInventories)
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.Property(x => x.RowVersion)
                .IsRowVersion();

            entity.ToTable(table =>
            {
                table.HasCheckConstraint(
                    "CK_StoreInventories_QuantityOnHand",
                    "[QuantityOnHand] >= 0");

                table.HasCheckConstraint(
                    "CK_StoreInventories_ReorderLevel",
                    "[ReorderLevel] >= 0");
            });
        });

        // =====================================================
        // SUPPLIER
        // =====================================================

        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(x => x.ContactPerson)
                .HasMaxLength(150);

            entity.Property(x => x.Email)
                .HasMaxLength(254);

            entity.Property(x => x.PhoneNumber)
                .HasMaxLength(30);

            entity.Property(x => x.Address)
                .HasMaxLength(300);
        });

        // =====================================================
        // PURCHASE ORDER
        // =====================================================

        modelBuilder.Entity<PurchaseOrder>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.OrderNumber)
                .IsRequired()
                .HasMaxLength(50);

            entity.Property(x => x.Status)
                .IsRequired()
                .HasMaxLength(30);

            entity.HasIndex(x => x.OrderNumber)
                .IsUnique();

            entity.HasOne(x => x.Supplier)
                .WithMany()
                .HasForeignKey(x => x.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Store)
                .WithMany()
                .HasForeignKey(x => x.StoreId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =====================================================
        // PURCHASE ORDER ITEM
        // =====================================================

        modelBuilder.Entity<PurchaseOrderItem>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.UnitCost)
                .HasPrecision(18, 2);

            entity.HasOne(x => x.PurchaseOrder)
                .WithMany(x => x.Items)
                .HasForeignKey(x => x.PurchaseOrderId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Product)
                .WithMany()
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.ToTable(table =>
            {
                table.HasCheckConstraint(
                    "CK_PurchaseOrderItems_QuantityOrdered",
                    "[QuantityOrdered] > 0");

                table.HasCheckConstraint(
                    "CK_PurchaseOrderItems_UnitCost",
                    "[UnitCost] >= 0");
            });
        });

        // =====================================================
        // STOCK RECEIPT
        // =====================================================

        modelBuilder.Entity<StockReceipt>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.ReceiptNumber)
                .IsRequired()
                .HasMaxLength(50);

            entity.Property(x => x.Notes)
                .HasMaxLength(1000);

            entity.HasIndex(x => x.ReceiptNumber)
                .IsUnique();

            entity.HasOne(x => x.PurchaseOrder)
                .WithMany(x => x.Receipts)
                .HasForeignKey(x => x.PurchaseOrderId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =====================================================
        // STOCK RECEIPT ITEM
        // =====================================================

        modelBuilder.Entity<StockReceiptItem>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.HasOne(x => x.StockReceipt)
                .WithMany(x => x.Items)
                .HasForeignKey(x => x.StockReceiptId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.PurchaseOrderItem)
                .WithMany(x => x.ReceiptItems)
                .HasForeignKey(x => x.PurchaseOrderItemId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.ToTable(table =>
            {
                table.HasCheckConstraint(
                    "CK_StockReceiptItems_QuantityReceived",
                    "[QuantityReceived] > 0");
            });
        });

        // =====================================================
        // INVENTORY TRANSACTION
        // =====================================================

        modelBuilder.Entity<InventoryTransaction>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.TransactionType)
                .HasConversion<int>();

            entity.Property(x => x.ReferenceNumber)
                .HasMaxLength(100);

            entity.Property(x => x.Notes)
                .HasMaxLength(1000);

            entity.HasOne(x => x.Store)
                .WithMany()
                .HasForeignKey(x => x.StoreId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Product)
                .WithMany()
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.ToTable(table =>
            {
                table.HasCheckConstraint(
                    "CK_InventoryTransactions_QuantityBefore",
                    "[QuantityBefore] >= 0");

                table.HasCheckConstraint(
                    "CK_InventoryTransactions_QuantityAfter",
                    "[QuantityAfter] >= 0");

                table.HasCheckConstraint(
                    "CK_InventoryTransactions_QuantityChange",
                    "[QuantityChange] <> 0");

                table.HasCheckConstraint(
                    "CK_InventoryTransactions_QuantityBalance",
                    "[QuantityAfter] = [QuantityBefore] + [QuantityChange]");
            });
        });
    }
}