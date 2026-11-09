
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Boxes,
  ChartColumn,
  Circle,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  PackageCheck,
  Settings,
  ShoppingCart,
  Store,
  Sun,
  Tags,
  TriangleAlert,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import ProductsView from "@/components/products/products-view";
import CategoriesView from "@/components/categories/categories-view";
import StoresView from "@/components/stores/stores-view";
import {
  canAccessModule,
  canManageInventory,
  type ModuleName,
} from "@/lib/permissions";

type ModuleKey = ModuleName;

type NavigationItem = {
  label: ModuleKey;
  icon: LucideIcon;
};

type CurrentUser = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles: string[];
};

type AuthenticationState =
  | "checking"
  | "authenticated"
  | "unavailable"
  | "signed-out";

type DashboardSummary = {
  totalProducts: number;
  activeProducts: number;
  totalStores: number;
  activeStores: number;
  totalSuppliers: number;
  totalUnitsInStock: number;
  totalInventoryValue: number;
  lowStockItemCount: number;
  pendingPurchaseOrders: number;
  completedPurchaseOrders: number;
  totalPurchaseOrders: number;
  generatedAtUtc: string;
};

type DashboardLoadState = "loading" | "ready" | "error";

const mainNavigation: NavigationItem[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Products", icon: Package },
  { label: "Categories", icon: Tags },
  { label: "Inventory", icon: Boxes },
  { label: "Stores", icon: Store },
  { label: "Suppliers", icon: Truck },
  { label: "Purchase Orders", icon: ShoppingCart },
  { label: "Stock Receipts", icon: PackageCheck },
];

const managementNavigation: NavigationItem[] = [
  { label: "Reports", icon: ChartColumn },
  { label: "Users", icon: Users },
  { label: "Settings", icon: Settings },
];

const sampleProducts = [
  {
    sku: "ELEC-001",
    name: "Wireless Mouse",
    category: "Electronics",
    stock: 145,
    status: "In Stock",
    statusClass: "good",
  },
  {
    sku: "ELEC-002",
    name: "Mechanical Keyboard",
    category: "Electronics",
    stock: 8,
    status: "Low Stock",
    statusClass: "low",
  },
  {
    sku: "OFF-003",
    name: "Office Desk Lamp",
    category: "Office Supplies",
    stock: 76,
    status: "In Stock",
    statusClass: "good",
  },
  {
    sku: "ACC-004",
    name: "USB-C Adapter",
    category: "Accessories",
    stock: 0,
    status: "Out of Stock",
    statusClass: "out",
  },
];

const sampleActivities = [
  {
    title: "Stock receipt recorded",
    description: "Sample activity for an incoming inventory delivery.",
    time: "Demonstration entry",
  },
  {
    title: "Purchase order created",
    description: "Sample activity for a new supplier order.",
    time: "Demonstration entry",
  },
  {
    title: "Product updated",
    description: "Sample activity for a product information change.",
    time: "Demonstration entry",
  },
];

function isDashboardSummary(value: unknown): value is DashboardSummary {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const summary = value as Record<string, unknown>;

  const numericFields = [
    "totalProducts",
    "activeProducts",
    "totalStores",
    "activeStores",
    "totalSuppliers",
    "totalUnitsInStock",
    "totalInventoryValue",
    "lowStockItemCount",
    "pendingPurchaseOrders",
    "completedPurchaseOrders",
    "totalPurchaseOrders",
  ];

  return (
    numericFields.every(
      (field) =>
        typeof summary[field] === "number" &&
        Number.isFinite(summary[field]) &&
        (summary[field] as number) >= 0,
    ) &&
    typeof summary.generatedAtUtc === "string" &&
    Number.isFinite(Date.parse(summary.generatedAtUtc))
  );
}

function NavigationButton({
  item,
  active,
  collapsed,
  onSelect,
}: {
  item: NavigationItem;
  active: boolean;
  collapsed: boolean;
  onSelect: (value: ModuleKey) => void;
}) {
  return (
    <button
      type="button"
      className={`nav-item ${active ? "active" : ""}`}
      onClick={() => onSelect(item.label)}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
    >
      <span className="nav-icon" aria-hidden="true">
        <item.icon size={18} strokeWidth={1.8} />
      </span>
      <span className="nav-label">{item.label}</span>
    </button>
  );
}

function DashboardContent({
  onNavigate,
  userRoles,
}: {
  onNavigate: (value: ModuleKey) => void;
  userRoles: readonly string[];
}) {
  const router = useRouter();

  const canViewReports = canManageInventory(userRoles);

  const [summary, setSummary] =
    useState<DashboardSummary | null>(null);

  const [loadState, setLoadState] =
    useState<DashboardLoadState>("loading");

  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!canViewReports) {
      return;
    }

    const controller = new AbortController();

    async function loadDashboard() {
      setLoadState("loading");
      setLoadError("");

      try {
        const response = await fetch("/api/reports/dashboard", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          const errorData = (await response.json().catch(
            () => null,
          )) as { message?: string } | null;

          throw new Error(
            errorData?.message ??
              "Unable to load dashboard statistics.",
          );
        }

        const data: unknown = await response.json();

        if (!isDashboardSummary(data)) {
          throw new Error(
            "The dashboard returned invalid statistics.",
          );
        }

        if (!controller.signal.aborted) {
          setSummary(data);
          setLoadState("ready");
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setSummary(null);

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load dashboard statistics.",
        );

        setLoadState("error");
      }
    }

    void loadDashboard();

    return () => controller.abort();
  }, [canViewReports, retryCount, router]);

  const stats: {
    label: string;
    value: number;
    icon: LucideIcon;
    detail: string;
  }[] = summary
    ? [
        {
          label: "Total Products",
          value: summary.totalProducts,
          icon: Package,
          detail: `${summary.activeProducts.toLocaleString()} active products`,
        },
        {
          label: "Inventory Units",
          value: summary.totalUnitsInStock,
          icon: Boxes,
          detail: "Units across store inventories",
        },
        {
          label: "Low Stock Items",
          value: summary.lowStockItemCount,
          icon: TriangleAlert,
          detail:
            "Store inventory records at reorder level or below",
        },
        {
          label: "Purchase Orders",
          value: summary.totalPurchaseOrders,
          icon: ClipboardList,
          detail: `${summary.pendingPurchaseOrders.toLocaleString()} pending orders`,
        },
      ]
    : [];

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Overview</div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Your inventory operations at a glance.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => onNavigate("Products")}
        >
          View Products
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="demo-banner" role="note">
        <strong>Data sources:</strong> Dashboard statistics
        are retrieved from the KCStoreCore backend for
        authorized users. The inventory overview table and
        recent activity below are demonstration data.
      </div>

      {!canViewReports ? (
        <section className="panel" role="status">
          <h2 className="panel-title">
            Management statistics unavailable
          </h2>
          <p className="page-subtitle">
            Your role does not permit access to management
            reports. You can continue using your authorized
            inventory modules.
          </p>
        </section>
      ) : loadState === "loading" ? (
        <section
          className="panel"
          role="status"
          aria-live="polite"
        >
          Loading live dashboard statistics...
        </section>
      ) : loadState === "error" ? (
        <section className="panel" role="alert">
          <h2 className="panel-title">
            Dashboard statistics unavailable
          </h2>

          <p className="page-subtitle">{loadError}</p>

          <button
            type="button"
            className="primary-button"
            style={{ marginTop: "16px" }}
            onClick={() =>
              setRetryCount((count) => count + 1)
            }
          >
            Retry statistics
          </button>
        </section>
      ) : (
        <>
          <div className="stats-grid">
            {stats.map((stat) => (
              <div className="stat-card" key={stat.label}>
                <div className="stat-top">
                  <span className="stat-label">
                    {stat.label}
                  </span>
                  <span
                    className="stat-icon"
                    aria-hidden="true"
                  >
                    <stat.icon
                      size={20}
                      strokeWidth={1.8}
                    />
                  </span>
                </div>

                <div className="stat-value">
                  {stat.value.toLocaleString()}
                </div>

                <div className="stat-detail">
                  {stat.detail}
                </div>
              </div>
            ))}
          </div>

          {summary && (
            <p
              className="page-subtitle"
              style={{ marginTop: "12px" }}
            >
              Statistics generated:{" "}
              {new Date(
                summary.generatedAtUtc,
              ).toLocaleString()}
            </p>
          )}
        </>
      )}

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title">
                Inventory Overview
              </h2>
              <div className="panel-subtitle">
                Example product stock information
              </div>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sampleProducts.map((product) => (
                  <tr key={product.sku}>
                    <td>
                      <div className="product-name">
                        {product.name}
                      </div>
                      <div className="product-sku">
                        {product.sku}
                      </div>
                    </td>

                    <td>{product.category}</td>
                    <td>{product.stock}</td>

                    <td>
                      <span
                        className={`status ${product.statusClass}`}
                      >
                        {product.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title">
                Recent Activity
              </h2>
              <div className="panel-subtitle">
                Example operational events
              </div>
            </div>
          </div>

          <div className="activity-list">
            {sampleActivities.map((activity) => (
              <div
                className="activity-item"
                key={activity.title}
              >
                <span
                  className="activity-dot"
                  aria-hidden="true"
                />

                <div>
                  <div className="activity-title">
                    {activity.title}
                  </div>

                  <div className="activity-description">
                    {activity.description}
                  </div>

                  <div className="activity-time">
                    {activity.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

export default function Home() {
  const router = useRouter();

  const [activeModule, setActiveModule] =
    useState<ModuleKey>("Dashboard");

  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [authenticationState, setAuthenticationState] =
    useState<AuthenticationState>("checking");

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const verifySession = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal,
        });

        if (signal?.aborted) {
          return;
        }

        if (response.status === 401) {
          setCurrentUser(null);
          setAuthenticationState("signed-out");
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          setAuthenticationState("unavailable");
          return;
        }

        const result = (await response.json()) as {
          user?: CurrentUser;
        };

        if (signal?.aborted) {
          return;
        }

        if (
          !result.user ||
          !result.user.isActive ||
          !Array.isArray(result.user.roles)
        ) {
          setCurrentUser(null);
          setAuthenticationState("unavailable");
          return;
        }

        setCurrentUser(result.user);
        setAuthenticationState("authenticated");
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        console.error(
          "Dashboard session verification failed:",
          error,
        );

        setAuthenticationState("unavailable");
      }
    },
    [router],
  );

  useEffect(() => {
    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      void verifySession(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [verifySession]);

  function retrySessionVerification() {
    setAuthenticationState("checking");
    void verifySession();
  }

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    setLogoutError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        setLogoutError(
          "Unable to sign out right now. Please try again.",
        );
        return;
      }

      setCurrentUser(null);
      setAuthenticationState("signed-out");

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout request failed:", error);

      setLogoutError(
        "A connection error occurred. Please try signing out again.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  function toggleTheme() {
    const nextTheme = !darkMode;

    setDarkMode(nextTheme);

    document.documentElement.dataset.theme = nextTheme
      ? "dark"
      : "light";
  }

  if (
    authenticationState === "checking" ||
    authenticationState === "signed-out"
  ) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
        }}
        aria-live="polite"
      >
        <div style={{ textAlign: "center" }}>
          <div
            className="brand-mark"
            style={{ margin: "0 auto 20px" }}
          >
            KC
          </div>

          <h1 className="page-title">
            KCStoreCore
          </h1>

          <p className="page-subtitle">
            {authenticationState === "signed-out"
              ? "Redirecting to login..."
              : "Verifying your session..."}
          </p>
        </div>
      </main>
    );
  }

  if (
    authenticationState === "unavailable" ||
    !currentUser
  ) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
        }}
      >
        <section
          className="panel"
          style={{
            width: "100%",
            maxWidth: "440px",
            textAlign: "center",
          }}
        >
          <div
            className="brand-mark"
            style={{ margin: "0 auto 20px" }}
          >
            KC
          </div>

          <h1 className="page-title">
            Connection unavailable
          </h1>

          <p
            className="page-subtitle"
            style={{ marginBottom: "24px" }}
          >
            We could not verify your session right now.
            Please check that the KCStoreCore backend
            is running and try again.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={retrySessionVerification}
          >
            Retry connection
          </button>
        </section>
      </main>
    );
  }

  const userRoles = currentUser.roles;

  const visibleMainNavigation = mainNavigation.filter(
    (item) => canAccessModule(userRoles, item.label),
  );

  const visibleManagementNavigation =
    managementNavigation.filter(
      (item) => canAccessModule(userRoles, item.label),
    );

  function handleModuleSelection(module: ModuleKey) {
    if (!canAccessModule(userRoles, module)) {
      return;
    }

    setActiveModule(module);
  }

  const hasDashboardAccess = canAccessModule(
    userRoles,
    "Dashboard",
  );

  if (!hasDashboardAccess) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
        }}
      >
        <section
          className="panel"
          style={{
            width: "100%",
            maxWidth: "440px",
            textAlign: "center",
          }}
        >
          <div
            className="brand-mark"
            style={{ margin: "0 auto 20px" }}
          >
            KC
          </div>

          <h1 className="page-title">
            Access denied
          </h1>

          <p className="page-subtitle">
            Your account does not have a recognized
            KCStoreCore inventory access role.
            Please contact an administrator.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            style={{ marginTop: "24px" }}
          >
            {isLoggingOut ? "Signing out..." : "Logout"}
          </button>

          {logoutError && (
            <p
              role="alert"
              style={{
                color: "#ef4444",
                marginTop: "16px",
              }}
            >
              {logoutError}
            </p>
          )}
        </section>
      </main>
    );
  }

  const selectedModule = canAccessModule(
    userRoles,
    activeModule,
  )
    ? activeModule
    : "Dashboard";

  const fullName = [
    currentUser.firstName,
    currentUser.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const displayName = fullName || currentUser.email;

  const primaryRole =
    currentUser.roles.length > 0
      ? currentUser.roles.join(", ")
      : "Authenticated user";

  const initials =
    `${currentUser.firstName.charAt(0)}${currentUser.lastName.charAt(0)}`
      .toUpperCase() || "KC";

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""}`}
        aria-label="Application sidebar"
      >
        <div className="brand">
          <div className="brand-mark">KC</div>

          <div className="brand-details">
            <div className="brand-name">
              KCStoreCore
            </div>

            <div className="brand-caption">
              INVENTORY PLATFORM
            </div>
          </div>
        </div>

        <nav aria-label="Main navigation">
          <div className="nav-heading">
            WORKSPACE
          </div>

          {visibleMainNavigation.map((item) => (
            <NavigationButton
              key={item.label}
              item={item}
              active={selectedModule === item.label}
              collapsed={collapsed}
              onSelect={handleModuleSelection}
            />
          ))}

          {visibleManagementNavigation.length > 0 && (
            <>
              <div className="nav-heading">
                MANAGEMENT
              </div>

              {visibleManagementNavigation.map((item) => (
                <NavigationButton
                  key={item.label}
                  item={item}
                  active={selectedModule === item.label}
                  collapsed={collapsed}
                  onSelect={handleModuleSelection}
                />
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-bottom">
          {!collapsed && (
            <div className="sidebar-note">
              <strong>
                KCStoreCore Development
              </strong>

              <p>
                Authentication, Products, Categories and Stores
                are connected to the backend. Dashboard
                statistics are live for management roles;
                other modules are being developed.
              </p>
            </div>
          )}

          {logoutError && (
            <p
              role="alert"
              style={{
                color: "#ef4444",
                fontSize: "12px",
                padding: "8px 12px",
              }}
            >
              {logoutError}
            </p>
          )}

          <button
            type="button"
            className="nav-item"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            aria-label={
              isLoggingOut ? "Signing out" : "Logout"
            }
            title={collapsed ? "Logout" : undefined}
            style={{
              width: "100%",
              marginTop: "12px",
              cursor: isLoggingOut ? "wait" : "pointer",
              opacity: isLoggingOut ? 0.6 : 1,
            }}
          >
            <span
              className="nav-icon"
              aria-hidden="true"
            >
              <LogOut size={18} strokeWidth={1.8} />
            </span>

            <span className="nav-label">
              {isLoggingOut
                ? "Signing out..."
                : "Logout"}
            </span>
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-button"
              onClick={() =>
                setCollapsed((previous) => !previous)
              }
              aria-label={
                collapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
            >
              <Menu size={20} />
            </button>

            <div className="breadcrumb">
              Workspace /{" "}
              <strong>{selectedModule}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="icon-button"
              onClick={toggleTheme}
              aria-label={
                darkMode
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              title={
                darkMode
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >
              {darkMode
                ? <Sun size={20} />
                : <Moon size={20} />}
            </button>

            <div className="profile-details">
              <div className="profile-name">
                {displayName}
              </div>

              <div className="profile-role">
                {primaryRole}
              </div>
            </div>

            <div
              className="avatar"
              aria-label={`Signed in as ${displayName}`}
              title={displayName}
            >
              {initials}
            </div>
          </div>
        </header>

        <main className="content">
          {selectedModule === "Dashboard" ? (
            <DashboardContent
              onNavigate={handleModuleSelection}
              userRoles={userRoles}
            />
          ) : selectedModule === "Products" ? (
            <ProductsView />
          ) : selectedModule === "Categories" ? (
            <CategoriesView />
          ) : selectedModule === "Stores" ? (
            <StoresView />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    Workspace
                  </div>

                  <h1 className="page-title">
                    {selectedModule}
                  </h1>

                  <p className="page-subtitle">
                    KCStoreCore management module
                  </p>
                </div>
              </div>

              <div className="panel empty-module">
                <div
                  className="empty-module-icon"
                  aria-hidden="true"
                >
                  <Circle
                    size={32}
                    strokeWidth={1.5}
                  />
                </div>

                <h2>{selectedModule}</h2>

                <p>
                  This section is part of the
                  planned KCStoreCore frontend.
                  Its interface and backend
                  integration will be implemented
                  in an upcoming development stage.
                </p>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    handleModuleSelection("Dashboard")
                  }
                >
                  Return to Dashboard
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
