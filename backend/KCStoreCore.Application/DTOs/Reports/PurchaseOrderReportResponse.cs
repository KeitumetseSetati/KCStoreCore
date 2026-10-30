namespace KCStoreCore.Application.DTOs.Reports;

public class PurchaseOrderReportResponse
{
    public int TotalOrders { get; set; }

    public int DraftOrders { get; set; }

    public int OrderedOrders { get; set; }

    public int PartiallyReceivedOrders { get; set; }

    public int ReceivedOrders { get; set; }

    public int CancelledOrders { get; set; }

    public long TotalUnitsOrdered { get; set; }

    public long TotalUnitsReceived { get; set; }

    public long TotalUnitsOutstanding { get; set; }

    public decimal TotalOrderValue { get; set; }

    public DateTime GeneratedAtUtc { get; set; }
}