"use client";

import { useState } from "react";

type ModuleKey =
  | "Dashboard"
  | "Products"
  | "Categories"
  | "Inventory"
  | "Stores"
  | "Suppliers"
  | "Purchase Orders"
  | "Stock Receipts"
  | "Reports"
  | "Users"
  | "Settings";

type NavigationItem = {
  label: ModuleKey;
  icon: string;
};

const mainNavigation: NavigationItem[] = [
  { label: "Dashboard", icon: "◫" },
  { label: "Products", icon: "▣" },
  { label: "Categories", icon: "▦" },
  { label: "Inventory", icon: "▤" },
  { label: "Stores", icon: "⌂" },
  { label: "Suppliers", icon: "◇" },
  { label: "Purchase Orders", icon: "▧" },
  { label: "Stock Receipts", icon: "⇩" },
];

const managementNavigation: NavigationItem[] = [
  { label: "Reports", icon: "▥" },
  { label: "Users", icon: "♙" },
  { label: "Settings", icon: "⚙" },
];

const stats = [
  {
    label: "Total Products",
    value: "1,248",
    icon: "▣",
    detail: "Sample product count",
  },
  {
    label: "Inventory Units",
    value: "24,580",
    icon: "▤",
    detail: "Sample stock quantity",
  },
  {
    label: "Low Stock Items",
    value: "18",
    icon: "!",
    detail: "Sample low-stock count",
  },
  {
    label: "Purchase Orders",
    value: "42",
    icon: "▧",
    detail: "Sample order count",
  },
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
        {item.icon}
      </span>
      <span className="nav-label">{item.label}</span>
    </button>
  );
}

function DashboardContent({
  onNavigate,
}: {
  onNavigate: (value: ModuleKey) => void;
}) {
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
          View Products →
        </button>
      </div>

      <div className="demo-banner" role="note">
        <strong>Frontend preview:</strong> The figures, products and activities
        shown below are demonstration data. They are not yet connected to the
        KCStoreCore backend or SQL Server database.
      </div>

      <div className="stats-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-top">
              <span className="stat-label">{stat.label}</span>
              <span className="stat-icon" aria-hidden="true">
                {stat.icon}
              </span>
            </div>

            <div className="stat-value">{stat.value}</div>
            <div className="stat-detail">{stat.detail}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title">Inventory Overview</h2>
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
                      <div className="product-name">{product.name}</div>
                      <div className="product-sku">{product.sku}</div>
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
              <h2 className="panel-title">Recent Activity</h2>
              <div className="panel-subtitle">
                Example operational events
              </div>
            </div>
          </div>

          <div className="activity-list">
            {sampleActivities.map((activity) => (
              <div className="activity-item" key={activity.title}>
                <span className="activity-dot" aria-hidden="true" />
                <div>
                  <div className="activity-title">{activity.title}</div>
                  <div className="activity-description">
                    {activity.description}
                  </div>
                  <div className="activity-time">{activity.time}</div>
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
  const [activeModule, setActiveModule] =
    useState<ModuleKey>("Dashboard");

  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  function toggleTheme() {
    const nextTheme = !darkMode;

    setDarkMode(nextTheme);

    document.documentElement.dataset.theme = nextTheme
      ? "dark"
      : "light";
  }

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""}`}
        aria-label="Application sidebar"
      >
        <div className="brand">
          <div className="brand-mark">KC</div>

          <div className="brand-details">
            <div className="brand-name">KCStoreCore</div>
            <div className="brand-caption">
              INVENTORY PLATFORM
            </div>
          </div>
        </div>

        <nav aria-label="Main navigation">
          <div className="nav-heading">WORKSPACE</div>

          {mainNavigation.map((item) => (
            <NavigationButton
              key={item.label}
              item={item}
              active={activeModule === item.label}
              collapsed={collapsed}
              onSelect={setActiveModule}
            />
          ))}

          <div className="nav-heading">MANAGEMENT</div>

          {managementNavigation.map((item) => (
            <NavigationButton
              key={item.label}
              item={item}
              active={activeModule === item.label}
              collapsed={collapsed}
              onSelect={setActiveModule}
            />
          ))}
        </nav>

        <div className="sidebar-bottom">
          {!collapsed && (
            <div className="sidebar-note">
              <strong>KCStoreCore Development</strong>
              <p>
                Frontend preview mode. Authentication and API
                integration will be added in upcoming stages.
              </p>
            </div>
          )}
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-button"
              onClick={() => setCollapsed((previous) => !previous)}
              aria-label={
                collapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              title="Toggle sidebar"
            >
              ☰
            </button>

            <div className="breadcrumb">
              Workspace / <strong>{activeModule}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="icon-button"
              onClick={toggleTheme}
              aria-label={
                darkMode ? "Switch to light mode" : "Switch to dark mode"
              }
              title={
                darkMode ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              {darkMode ? "☀" : "☾"}
            </button>

            <div className="profile-details">
              <div className="profile-name">Preview User</div>
              <div className="profile-role">Demo interface</div>
            </div>

            <div className="avatar" aria-label="Preview user">
              KC
            </div>
          </div>
        </header>

        <main className="content">
          {activeModule === "Dashboard" ? (
            <DashboardContent onNavigate={setActiveModule} />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">Workspace</div>
                  <h1 className="page-title">{activeModule}</h1>
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
                  ◈
                </div>

                <h2>{activeModule}</h2>

                <p>
                  This section is part of the planned KCStoreCore
                  frontend. Its interface and backend integration
                  will be implemented in an upcoming development stage.
                </p>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setActiveModule("Dashboard")}
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