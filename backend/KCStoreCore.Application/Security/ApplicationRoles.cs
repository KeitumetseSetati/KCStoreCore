namespace KCStoreCore.Application.Security;

public static class ApplicationRoles
{
    public const string Administrator = "Administrator";

    public const string Manager = "Manager";

    public const string Staff = "Staff";

    public static readonly string[] All =
    [
        Administrator,
        Manager,
        Staff
    ];
}