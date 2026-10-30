namespace KCStoreCore.Application.Security;

public static class AuthorizationPolicies
{
    // Administrator only
    public const string AdministratorOnly = "AdministratorOnly";

    // Administrator and Manager
    public const string ManagementAccess = "ManagementAccess";

    // Administrator, Manager and Staff
    public const string InventoryAccess = "InventoryAccess";
}