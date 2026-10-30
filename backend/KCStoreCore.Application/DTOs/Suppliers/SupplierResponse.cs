namespace KCStoreCore.Application.DTOs.Suppliers;

public class SupplierResponse
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? ContactPerson { get; set; }

    public string? Email { get; set; }

    public string? PhoneNumber { get; set; }

    public string? Address { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }
}