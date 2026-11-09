"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import CreateSupplierForm from "@/components/suppliers/create-supplier-form";
import EditSupplierForm from "@/components/suppliers/edit-supplier-form";
import { canManageInventory } from "@/lib/permissions";
import type { Supplier, SupplierApiError } from "@/types/supplier";

type LoadState = "loading" | "success" | "error";
type ViewMode = "list" | "create" | "edit";

type CurrentUserResponse = {
  user: {
    roles: string[];
  };
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid var(--border, #334155)",
  background: "var(--surface, transparent)",
  color: "inherit",
  font: "inherit",
};

const actionButtonStyle = {
  padding: "8px 14px",
  borderRadius: "8px",
  border: "1px solid var(--border, #334155)",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  font: "inherit",
  fontSize: "13px",
  fontWeight: 600,
};

export default function SuppliersView() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedSupplier, setSelectedSupplier] =
    useState<Supplier | null>(null);

  const [supplierToDeactivate, setSupplierToDeactivate] =
    useState<Supplier | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivationError, setDeactivationError] = useState("");

  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");

  const canManageSuppliers = canManageInventory(userRoles);

  const loadSuppliers = useCallback(
    async (signal?: AbortSignal) => {
      setLoadState("loading");
      setErrorMessage("");

      try {
        const params = new URLSearchParams({
          includeInactive: String(includeInactive),
        });

        const response = await fetch(
          `/api/suppliers?${params.toString()}`,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            signal,
          },
        );

        if (signal?.aborted) {
          return;
        }

        if (!response.ok) {
          const errorData = (await response.json().catch(
            () => ({}),
          )) as SupplierApiError;

          if (signal?.aborted) {
            return;
          }

          if (response.status === 401) {
            setErrorMessage(
              "Your session has expired. Please sign in again.",
            );
          } else if (response.status === 403) {
            setErrorMessage(
              "You do not have permission to view suppliers.",
            );
          } else {
            setErrorMessage(
              errorData.message ??
                "Unable to retrieve suppliers. Please try again.",
            );
          }

          setSuppliers([]);
          setLoadState("error");
          return;
        }

        const result: unknown = await response.json();

        if (signal?.aborted) {
          return;
        }

        if (!Array.isArray(result)) {
          throw new Error("Invalid suppliers response.");
        }

        const validSuppliers = result.every(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            !Array.isArray(item) &&
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            typeof item.isActive === "boolean",
        );

        if (!validSuppliers) {
          throw new Error("Invalid supplier data.");
        }

        setSuppliers(result as Supplier[]);
        setLoadState("success");
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        console.error("Suppliers request failed:", error);
        setSuppliers([]);
        setErrorMessage(
          "Unable to connect to the suppliers service.",
        );
        setLoadState("error");
      }
    },
    [includeInactive],
  );

  useEffect(() => {
    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      void loadSuppliers(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [loadSuppliers]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCurrentUser() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          if (!controller.signal.aborted) {
            setUserRoles([]);
          }
          return;
        }

        const result =
          (await response.json()) as CurrentUserResponse;

        if (!controller.signal.aborted) {
          setUserRoles(
            Array.isArray(result.user?.roles)
              ? result.user.roles
              : [],
          );
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(
            "Unable to retrieve user roles:",
            error,
          );
          setUserRoles([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setRolesLoading(false);
        }
      }
    }

    const timeoutId = window.setTimeout(() => {
      void loadCurrentUser();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const filteredSuppliers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return suppliers;
    }

    return suppliers.filter((supplier) =>
      [
        supplier.name,
        supplier.contactPerson ?? "",
        supplier.email ?? "",
        supplier.phoneNumber ?? "",
        supplier.address ?? "",
      ].some((value) => value.toLowerCase().includes(search)),
    );
  }, [suppliers, searchTerm]);

  function handleSupplierCreated(supplier: Supplier) {
    setViewMode("list");
    setSearchTerm("");
    setSuccessMessage(
      `Supplier "${supplier.name}" was created successfully.`,
    );
    void loadSuppliers();
  }

  function handleSupplierUpdated(supplier: Supplier) {
    setSelectedSupplier(null);
    setViewMode("list");
    setSearchTerm("");
    setSuccessMessage(
      `Supplier "${supplier.name}" was updated successfully.`,
    );
    void loadSuppliers();
  }

  function handleEditSupplier(supplier: Supplier) {
    if (!canManageSuppliers) {
      return;
    }

    setSelectedSupplier(supplier);
    setSuccessMessage("");
    setViewMode("edit");
  }

  function handleRequestDeactivation(supplier: Supplier) {
    if (!canManageSuppliers || !supplier.isActive) {
      return;
    }

    setSuccessMessage("");
    setDeactivationError("");
    setSupplierToDeactivate(supplier);
  }

  function handleCancelDeactivation() {
    if (deactivating) {
      return;
    }

    setSupplierToDeactivate(null);
    setDeactivationError("");
  }

  async function handleConfirmDeactivation() {
    if (
      !canManageSuppliers ||
      !supplierToDeactivate ||
      !supplierToDeactivate.isActive ||
      deactivating
    ) {
      return;
    }

    const supplier = supplierToDeactivate;

    setDeactivating(true);
    setDeactivationError("");

    try {
      const response = await fetch(
        `/api/suppliers/${encodeURIComponent(supplier.id)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(
          () => ({}),
        )) as SupplierApiError;

        if (response.status === 401) {
          throw new Error(
            "Your session has expired. Please sign in again.",
          );
        }

        if (response.status === 403) {
          throw new Error(
            "You do not have permission to deactivate suppliers.",
          );
        }

        if (response.status === 404) {
          throw new Error("This supplier no longer exists.");
        }

        throw new Error(
          errorData.message ??
            "Unable to deactivate the supplier. Please try again.",
        );
      }

      if (response.status !== 204) {
        throw new Error(
          "The server returned an unexpected response.",
        );
      }

      setSupplierToDeactivate(null);
      setSuccessMessage(
        `Supplier "${supplier.name}" was deactivated successfully.`,
      );
      void loadSuppliers();
    } catch (error) {
      setDeactivationError(
        error instanceof Error
          ? error.message
          : "Unable to deactivate the supplier.",
      );
    } finally {
      setDeactivating(false);
    }
  }

  if (viewMode === "create" && canManageSuppliers) {
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              Inventory Management
            </div>
            <h1 className="page-title">
              Create Supplier
            </h1>
            <p className="page-subtitle">
              Register a new supplier in KCStoreCore.
            </p>
          </div>
        </div>

        <CreateSupplierForm
          onCreated={handleSupplierCreated}
          onCancel={() => setViewMode("list")}
        />
      </>
    );
  }

  if (
    viewMode === "edit" &&
    canManageSuppliers &&
    selectedSupplier !== null
  ) {
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              Inventory Management
            </div>
            <h1 className="page-title">
              Edit Supplier
            </h1>
            <p className="page-subtitle">
              Update the information for{" "}
              {selectedSupplier.name}.
            </p>
          </div>
        </div>

        <EditSupplierForm
          key={selectedSupplier.id}
          supplier={selectedSupplier}
          onUpdated={handleSupplierUpdated}
          onCancel={() => {
            setSelectedSupplier(null);
            setViewMode("list");
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            Inventory Management
          </div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">
            Manage supplier information and contacts
            across KCStoreCore.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "12px",
          }}
        >
          {canManageSuppliers && !rolesLoading && (
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setSuccessMessage("");
                setViewMode("create");
              }}
            >
              + Add Supplier
            </button>
          )}

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setSuccessMessage("");
              void loadSuppliers();
            }}
            disabled={loadState === "loading"}
          >
            {loadState === "loading"
              ? "Loading..."
              : "Refresh Suppliers"}
          </button>
        </div>
      </div>

      {successMessage && (
        <div
          role="status"
          className="panel"
          style={{
            marginBottom: "20px",
            borderColor: "#22c55e",
          }}
        >
          <p style={{ color: "#22c55e" }}>
            {successMessage}
          </p>
        </div>
      )}

      <section className="panel">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div style={{ flex: "1 1 260px" }}>
            <label
              htmlFor="supplier-search"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Search suppliers
            </label>

            <input
              id="supplier-search"
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search name, contact, email, phone or address..."
              style={inputStyle}
            />
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              fontSize: "13px",
              marginTop: "20px",
            }}
          >
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) =>
                setIncludeInactive(event.target.checked)
              }
            />
            Include inactive suppliers
          </label>
        </div>

        {loadState === "loading" && (
          <div role="status" className="empty-module">
            <h2>Loading suppliers...</h2>
            <p>
              Retrieving supplier information from
              KCStoreCore.
            </p>
          </div>
        )}

        {loadState === "error" && (
          <div role="alert" className="empty-module">
            <h2>Unable to load suppliers</h2>
            <p>{errorMessage}</p>

            <button
              type="button"
              className="primary-button"
              onClick={() => void loadSuppliers()}
            >
              Try Again
            </button>
          </div>
        )}

        {loadState === "success" && (
          <>
            <div
              className="panel-heading"
              style={{ marginBottom: "16px" }}
            >
              <div>
                <h2 className="panel-title">
                  Supplier Directory
                </h2>

                <div className="panel-subtitle">
                  {filteredSuppliers.length} supplier
                  {filteredSuppliers.length === 1
                    ? ""
                    : "s"}{" "}
                  displayed
                </div>
              </div>
            </div>

            {filteredSuppliers.length === 0 ? (
              <div className="empty-module">
                <h2>No suppliers found</h2>
                <p>
                  {suppliers.length === 0
                    ? "There are currently no suppliers available for this filter."
                    : "No suppliers match your search. Try another keyword."}
                </p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Supplier</th>
                      <th>Contact Person</th>
                      <th>Phone</th>
                      <th>Address</th>
                      <th>Status</th>
                      {canManageSuppliers &&
                        !rolesLoading && (
                          <th>Actions</th>
                        )}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredSuppliers.map((supplier) => (
                      <tr key={supplier.id}>
                        <td>
                          <div className="product-name">
                            {supplier.name}
                          </div>
                          <div className="product-sku">
                            {supplier.email || "No email"}
                          </div>
                        </td>

                        <td>
                          {supplier.contactPerson ||
                            "Not specified"}
                        </td>

                        <td>
                          {supplier.phoneNumber ||
                            "Not specified"}
                        </td>

                        <td>
                          {supplier.address ||
                            "Not specified"}
                        </td>

                        <td>
                          <span
                            className={`status ${
                              supplier.isActive
                                ? "good"
                                : "out"
                            }`}
                          >
                            {supplier.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        {canManageSuppliers &&
                          !rolesLoading && (
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "8px",
                                  alignItems: "center",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEditSupplier(
                                      supplier,
                                    )
                                  }
                                  style={actionButtonStyle}
                                  aria-label={`Edit ${supplier.name}`}
                                >
                                  Edit
                                </button>

                                {supplier.isActive && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRequestDeactivation(
                                        supplier,
                                      )
                                    }
                                    style={{
                                      ...actionButtonStyle,
                                      borderColor: "#ef4444",
                                      color: "#ef4444",
                                    }}
                                    aria-label={`Deactivate ${supplier.name}`}
                                  >
                                    Deactivate
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {supplierToDeactivate && canManageSuppliers && (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "rgba(0, 0, 0, 0.7)",
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="deactivate-supplier-title"
            aria-describedby="deactivate-supplier-description"
            className="panel"
            style={{
              width: "100%",
              maxWidth: "480px",
              padding: "28px",
            }}
          >
            <h2
              id="deactivate-supplier-title"
              className="panel-title"
            >
              Deactivate Supplier
            </h2>

            <p
              id="deactivate-supplier-description"
              style={{
                marginTop: "16px",
                lineHeight: 1.7,
              }}
            >
              Are you sure you want to deactivate{" "}
              <strong>
                {supplierToDeactivate.name}
              </strong>
              ?
            </p>

            <p
              style={{
                marginTop: "12px",
                fontSize: "13px",
                lineHeight: 1.7,
              }}
            >
              The supplier will no longer appear in the
              default directory. Its database record will
              be retained and can still be viewed using
              the &quot;Include inactive suppliers&quot; filter.
            </p>

            {deactivationError && (
              <p
                role="alert"
                style={{
                  marginTop: "16px",
                  color: "#ef4444",
                }}
              >
                {deactivationError}
              </p>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                flexWrap: "wrap",
                gap: "12px",
                marginTop: "28px",
              }}
            >
              <button
                type="button"
                onClick={handleCancelDeactivation}
                disabled={deactivating}
                style={{
                  ...actionButtonStyle,
                  padding: "12px 20px",
                  cursor: deactivating
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleConfirmDeactivation()
                }
                disabled={deactivating}
                style={{
                  padding: "12px 20px",
                  borderRadius: "10px",
                  border: "1px solid #dc2626",
                  background: "#dc2626",
                  color: "#ffffff",
                  font: "inherit",
                  fontWeight: 600,
                  cursor: deactivating
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {deactivating
                  ? "Deactivating..."
                  : "Confirm Deactivation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}