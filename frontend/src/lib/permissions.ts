
/**
 * KCStoreCore frontend role-based permissions.
 *
 * These permissions reflect the ASP.NET Core authorization
 * policies defined in the backend.
 *
 * Important:
 * Frontend permissions control the user interface only.
 * The ASP.NET Core backend remains responsible for
 * enforcing authorization on protected API endpoints.
 */

export const APPLICATION_ROLES = {
  Administrator: "Administrator",
  Manager: "Manager",
  Staff: "Staff",
} as const;

export type ApplicationRole =
  (typeof APPLICATION_ROLES)[keyof typeof APPLICATION_ROLES];

export const AUTHORIZATION_POLICIES = {
  AdministratorOnly: "AdministratorOnly",
  ManagementAccess: "ManagementAccess",
  InventoryAccess: "InventoryAccess",
} as const;

export type AuthorizationPolicy =
  (typeof AUTHORIZATION_POLICIES)[keyof typeof AUTHORIZATION_POLICIES];

export const POLICY_ROLES: Record<
  AuthorizationPolicy,
  readonly ApplicationRole[]
> = {
  AdministratorOnly: [
    APPLICATION_ROLES.Administrator,
  ],

  ManagementAccess: [
    APPLICATION_ROLES.Administrator,
    APPLICATION_ROLES.Manager,
  ],

  InventoryAccess: [
    APPLICATION_ROLES.Administrator,
    APPLICATION_ROLES.Manager,
    APPLICATION_ROLES.Staff,
  ],
};

export const MODULE_NAMES = [
  "Dashboard",
  "Products",
  "Categories",
  "Inventory",
  "Stores",
  "Suppliers",
  "Purchase Orders",
  "Stock Receipts",
  "Reports",
  "Users",
  "Settings",
] as const;

export type ModuleName = (typeof MODULE_NAMES)[number];

/**
 * Minimum authorization policy required to display
 * each navigation module.
 *
 * Settings is currently a frontend placeholder.
 * Its specific operations will receive separate
 * permissions when implemented.
 */
export const MODULE_POLICIES: Record<
  ModuleName,
  AuthorizationPolicy
> = {
  Dashboard: AUTHORIZATION_POLICIES.InventoryAccess,

  Products: AUTHORIZATION_POLICIES.InventoryAccess,

  Categories: AUTHORIZATION_POLICIES.InventoryAccess,

  Inventory: AUTHORIZATION_POLICIES.InventoryAccess,

  Stores: AUTHORIZATION_POLICIES.InventoryAccess,

  Suppliers: AUTHORIZATION_POLICIES.InventoryAccess,

  "Purchase Orders": AUTHORIZATION_POLICIES.InventoryAccess,

  "Stock Receipts": AUTHORIZATION_POLICIES.InventoryAccess,

  Reports: AUTHORIZATION_POLICIES.ManagementAccess,

  Users: AUTHORIZATION_POLICIES.AdministratorOnly,

  Settings: AUTHORIZATION_POLICIES.InventoryAccess,
};

/**
 * Checks whether a user has at least one role
 * permitted by the specified authorization policy.
 */
export function hasPolicyAccess(
  userRoles: readonly string[],
  policy: AuthorizationPolicy,
): boolean {
  if (!Array.isArray(userRoles)) {
    return false;
  }

  return POLICY_ROLES[policy].some((allowedRole) =>
    userRoles.includes(allowedRole),
  );
}

/**
 * Checks whether a user may access a navigation module.
 */
export function canAccessModule(
  userRoles: readonly string[],
  module: ModuleName,
): boolean {
  return hasPolicyAccess(
    userRoles,
    MODULE_POLICIES[module],
  );
}

/**
 * Returns the navigation modules visible to the user.
 */
export function getAccessibleModules(
  userRoles: readonly string[],
): ModuleName[] {
  return MODULE_NAMES.filter((module) =>
    canAccessModule(userRoles, module),
  );
}

/**
 * Checks whether a user can perform operations
 * protected by the ManagementAccess policy.
 */
export function canManageInventory(
  userRoles: readonly string[],
): boolean {
  return hasPolicyAccess(
    userRoles,
    AUTHORIZATION_POLICIES.ManagementAccess,
  );
}

/**
 * Checks whether a user can access administrator-only
 * functionality, such as user management.
 */
export function isAdministrator(
  userRoles: readonly string[],
): boolean {
  return hasPolicyAccess(
    userRoles,
    AUTHORIZATION_POLICIES.AdministratorOnly,
  );
}
