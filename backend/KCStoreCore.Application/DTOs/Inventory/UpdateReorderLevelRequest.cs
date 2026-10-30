using System.ComponentModel.DataAnnotations;

namespace KCStoreCore.Application.DTOs.Inventory;

public class UpdateReorderLevelRequest
{
    [Range(0, int.MaxValue, ErrorMessage = "Reorder level cannot be negative.")]
    public int ReorderLevel { get; set; }
}