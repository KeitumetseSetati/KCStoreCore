"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import CreateStoreForm from "@/components/stores/create-store-form";
import EditStoreForm from "@/components/stores/edit-store-form";
import type { Store, StoreApiError } from "@/types/store";

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

export default function StoresView() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  const [storeToDeactivate, setStoreToDeactivate] =
    useState<Store | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivationError, setDeactivationError] = useState("");

  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");

  const canManageStores = userRoles.some(
    (role) => role === "Administrator" || role === "Manager",
  );

  const loadStores = useCallback(
    async (signal?: AbortSignal) => {
      setLoadState("loading");
      setErrorMessage("");

      try {
        const params = new URLSearchParams({
          includeInactive: String(includeInactive),
        });

        const response = await fetch(
          `/api/stores?${params.toString()}`,
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
          )) as StoreApiError;

          if (signal?.aborted) {
            return;
          }

          if (response.status === 401) {
            setErrorMessage(
              "Your session has expired. Please sign in again.",
            );
          } else if (response.status === 403) {
            setErrorMessage(
              "You do not have permission to view stores.",
            );
          } else {
            setErrorMessage(
              errorData.message ??
                "Unable to retrieve stores. Please try again.",
            );
          }

          setStores([]);
          setLoadState("error");
          return;
        }

        const result: unknown = await response.json();

        if (signal?.aborted) {
          return;
        }

        if (!Array.isArray(result)) {
          throw new Error("Invalid stores response.");
        }

        setStores(result as Store[]);
        setLoadState("success");
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        console.error("Stores request failed:", error);
        setStores([]);
        setErrorMessage(
          "Unable to connect to the stores service.",
        );
        setLoadState("error");
      }
    },
    [includeInactive],
  );

  useEffect(() => {
    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      void loadStores(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [loadStores]);

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
          console.error("Unable to retrieve user roles:", error);
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

  const filteredStores = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return stores;
    }

    return stores.filter((store) =>
      [
        store.code,
        store.name,
        store.city ?? "",
        store.address ?? "",
      ].some((value) => value.toLowerCase().includes(search)),
    );
  }, [stores, searchTerm]);

  function handleStoreCreated(store: Store) {
    setViewMode("list");
    setSearchTerm("");
    setSuccessMessage(
      `Store "${store.name}" was created successfully.`,
    );
    void loadStores();
  }

  function handleStoreUpdated(store: Store) {
    setSelectedStore(null);
    setViewMode("list");
    setSearchTerm("");
    setSuccessMessage(
      `Store "${store.name}" was updated successfully.`,
    );
    void loadStores();
  }

  function handleEditStore(store: Store) {
    setSelectedStore(store);
    setSuccessMessage("");
    setViewMode("edit");
  }

  function handleRequestDeactivation(store: Store) {
    if (!canManageStores || !store.isActive) {
      return;
    }

    setSuccessMessage("");
    setDeactivationError("");
    setStoreToDeactivate(store);
  }

  function handleCancelDeactivation() {
    if (deactivating) {
      return;
    }

    setStoreToDeactivate(null);
    setDeactivationError("");
  }

  async function handleConfirmDeactivation() {
    if (
      !canManageStores ||
      !storeToDeactivate ||
      !storeToDeactivate.isActive ||
      deactivating
    ) {
      return;
    }

    const store = storeToDeactivate;

    setDeactivating(true);
    setDeactivationError("");

    try {
      const response = await fetch(
        `/api/stores/${encodeURIComponent(store.id)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(
          () => ({}),
        )) as StoreApiError;

        if (response.status === 401) {
          throw new Error(
            "Your session has expired. Please sign in again.",
          );
        }

        if (response.status === 403) {
          throw new Error(
            "You do not have permission to deactivate stores.",
          );
        }

        if (response.status === 404) {
          throw new Error("This store no longer exists.");
        }

        throw new Error(
          errorData.message ??
            "Unable to deactivate the store. Please try again.",
        );
      }

      if (response.status !== 204) {
        throw new Error(
          "The server returned an unexpected response.",
        );
      }

      setStoreToDeactivate(null);
      setSuccessMessage(
        `Store "${store.name}" was deactivated successfully.`,
      );
      void loadStores();
    } catch (error) {
      setDeactivationError(
        error instanceof Error
          ? error.message
          : "Unable to deactivate the store.",
      );
    } finally {
      setDeactivating(false);
    }
  }

  if (viewMode === "create" && canManageStores) {
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">Inventory Management</div>
            <h1 className="page-title">Create Store</h1>
            <p className="page-subtitle">
              Register a new store location in KCStoreCore.
            </p>
          </div>
        </div>

        <CreateStoreForm
          onCreated={handleStoreCreated}
          onCancel={() => setViewMode("list")}
        />
      </>
    );
  }

  if (
    viewMode === "edit" &&
    canManageStores &&
    selectedStore !== null
  ) {
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">Inventory Management</div>
            <h1 className="page-title">Edit Store</h1>
            <p className="page-subtitle">
              Update the information for {selectedStore.name}.
            </p>
          </div>
        </div>

        <EditStoreForm
          key={selectedStore.id}
          store={selectedStore}
          onUpdated={handleStoreUpdated}
          onCancel={() => {
            setSelectedStore(null);
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
          <div className="eyebrow">Inventory Management</div>
          <h1 className="page-title">Stores</h1>
          <p className="page-subtitle">
            Manage store locations across KCStoreCore.
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
          {canManageStores && !rolesLoading && (
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setSuccessMessage("");
                setViewMode("create");
              }}
            >
              + Add Store
            </button>
          )}

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setSuccessMessage("");
              void loadStores();
            }}
            disabled={loadState === "loading"}
          >
            {loadState === "loading"
              ? "Loading..."
              : "Refresh Stores"}
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
              htmlFor="store-search"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Search stores
            </label>

            <input
              id="store-search"
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search code, name, city or address..."
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
            Include inactive stores
          </label>
        </div>

        {loadState === "loading" && (
          <div role="status" className="empty-module">
            <h2>Loading stores...</h2>
            <p>Retrieving store information from KCStoreCore.</p>
          </div>
        )}

        {loadState === "error" && (
          <div role="alert" className="empty-module">
            <h2>Unable to load stores</h2>
            <p>{errorMessage}</p>

            <button
              type="button"
              className="primary-button"
              onClick={() => void loadStores()}
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
                  Store Directory
                </h2>
                <div className="panel-subtitle">
                  {filteredStores.length} store
                  {filteredStores.length === 1 ? "" : "s"} displayed
                </div>
              </div>
            </div>

            {filteredStores.length === 0 ? (
              <div className="empty-module">
                <h2>No stores found</h2>
                <p>
                  {stores.length === 0
                    ? "There are currently no stores available for this filter."
                    : "No stores match your search. Try another keyword."}
                </p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Store</th>
                      <th>City</th>
                      <th>Address</th>
                      <th>Status</th>
                      {canManageStores && !rolesLoading && (
                        <th>Actions</th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStores.map((store) => (
                      <tr key={store.id}>
                        <td>
                          <div className="product-name">
                            {store.name}
                          </div>
                          <div className="product-sku">
                            {store.code}
                          </div>
                        </td>

                        <td>{store.city || "Not specified"}</td>
                        <td>{store.address || "Not specified"}</td>

                        <td>
                          <span
                            className={`status ${
                              store.isActive ? "good" : "out"
                            }`}
                          >
                            {store.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {canManageStores && !rolesLoading && (
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
                                onClick={() => handleEditStore(store)}
                                style={actionButtonStyle}
                                aria-label={`Edit ${store.name}`}
                              >
                                Edit
                              </button>

                              {store.isActive && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRequestDeactivation(store)
                                  }
                                  style={{
                                    ...actionButtonStyle,
                                    borderColor: "#ef4444",
                                    color: "#ef4444",
                                  }}
                                  aria-label={`Deactivate ${store.name}`}
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

      {storeToDeactivate && canManageStores && (
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
            aria-labelledby="deactivate-store-title"
            aria-describedby="deactivate-store-description"
            className="panel"
            style={{
              width: "100%",
              maxWidth: "480px",
              padding: "28px",
            }}
          >
            <h2
              id="deactivate-store-title"
              className="panel-title"
            >
              Deactivate Store
            </h2>

            <p
              id="deactivate-store-description"
              style={{
                marginTop: "16px",
                lineHeight: 1.7,
              }}
            >
              Are you sure you want to deactivate{" "}
              <strong>{storeToDeactivate.name}</strong> (
              {storeToDeactivate.code})?
            </p>

            <p
              style={{
                marginTop: "12px",
                fontSize: "13px",
                lineHeight: 1.7,
              }}
            >
              The store will no longer appear in the default
              directory. Its database record will be retained and
              can still be viewed using the
              &quot;Include inactive stores&quot; filter.
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