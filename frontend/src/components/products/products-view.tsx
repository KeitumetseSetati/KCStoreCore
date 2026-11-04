
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import CreateProductForm from "@/components/products/create-product-form";
import EditProductForm from "@/components/products/edit-product-form";
import type { Product, ProductApiError } from "@/types/product";

type LoadState = "loading" | "success" | "error";
type ViewMode = "list" | "create" | "edit";

type CurrentUser = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive?: boolean;
  roles: string[];
};

type CurrentUserResponse = {
  user: CurrentUser;
};

const currencyFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
});

export default function ProductsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [productToDeactivate, setProductToDeactivate] =
    useState<Product | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivationError, setDeactivationError] = useState("");

  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");

  const canManageProducts = userRoles.some(
    (role) => role === "Administrator" || role === "Manager",
  );

  const loadProducts = useCallback(
    async (signal?: AbortSignal) => {
      setLoadState("loading");
      setErrorMessage("");

      try {
        const params = new URLSearchParams({
          includeInactive: String(includeInactive),
        });

        const response = await fetch(
          `/api/products?${params.toString()}`,
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
          )) as ProductApiError;

          if (response.status === 401) {
            setErrorMessage(
              "Your session has expired. Please sign in again.",
            );
          } else if (response.status === 403) {
            setErrorMessage(
              "You do not have permission to view products.",
            );
          } else {
            setErrorMessage(
              errorData.message ??
                "Unable to retrieve products. Please try again.",
            );
          }

          setProducts([]);
          setLoadState("error");
          return;
        }

        const result = (await response.json()) as Product[];

        if (signal?.aborted) {
          return;
        }

        if (!Array.isArray(result)) {
          throw new Error("Invalid products response.");
        }

        setProducts(result);
        setLoadState("success");
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        console.error("Products request failed:", error);

        setProducts([]);
        setErrorMessage(
          "Unable to connect to the products service.",
        );
        setLoadState("error");
      }
    },
    [includeInactive],
  );

  useEffect(() => {
    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      void loadProducts(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [loadProducts]);

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

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return products;
    }

    return products.filter((product) =>
      [
        product.sku,
        product.name,
        product.categoryName,
        product.description ?? "",
      ].some((value) => value.toLowerCase().includes(search)),
    );
  }, [products, searchTerm]);

  function handleProductCreated(product: Product) {
    setViewMode("list");
    setSearchTerm("");
    setSuccessMessage(
      `Product "${product.name}" was created successfully.`,
    );

    void loadProducts();
  }

  function handleCancelCreate() {
    setViewMode("list");
  }

  function handleEditProduct(product: Product) {
    setSelectedProduct(product);
    setSuccessMessage("");
    setViewMode("edit");
  }

  function handleProductUpdated(product: Product) {
    setSelectedProduct(null);
    setViewMode("list");
    setSearchTerm("");
    setSuccessMessage(
      `Product "${product.name}" was updated successfully.`,
    );

    void loadProducts();
  }

  function handleCancelEdit() {
    setSelectedProduct(null);
    setViewMode("list");
  }

  function handleRequestDeactivation(product: Product) {
    if (!canManageProducts || !product.isActive) {
      return;
    }

    setSuccessMessage("");
    setDeactivationError("");
    setProductToDeactivate(product);
  }

  function handleCancelDeactivation() {
    if (deactivating) {
      return;
    }

    setProductToDeactivate(null);
    setDeactivationError("");
  }

  async function handleConfirmDeactivation() {
    if (
      !canManageProducts ||
      !productToDeactivate ||
      !productToDeactivate.isActive ||
      deactivating
    ) {
      return;
    }

    const product = productToDeactivate;

    setDeactivating(true);
    setDeactivationError("");

    try {
      const response = await fetch(
        `/api/products/${encodeURIComponent(product.id)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(
          () => ({}),
        )) as ProductApiError;

        if (response.status === 401) {
          throw new Error(
            "Your session has expired. Please sign in again.",
          );
        }

        if (response.status === 403) {
          throw new Error(
            "You do not have permission to deactivate products.",
          );
        }

        if (response.status === 404) {
          throw new Error("This product no longer exists.");
        }

        throw new Error(
          errorData.message ??
            "Unable to deactivate the product. Please try again.",
        );
      }

      if (response.status !== 204) {
        throw new Error(
          "The server returned an unexpected response.",
        );
      }

      setProductToDeactivate(null);
      setDeactivationError("");
      setSuccessMessage(
        `Product "${product.name}" was deactivated successfully.`,
      );

      void loadProducts();
    } catch (error) {
      setDeactivationError(
        error instanceof Error
          ? error.message
          : "Unable to deactivate the product.",
      );
    } finally {
      setDeactivating(false);
    }
  }

  if (viewMode === "create" && canManageProducts) {
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">Inventory Management</div>
            <h1 className="page-title">Create Product</h1>
            <p className="page-subtitle">
              Add a new product to your KCStoreCore catalogue.
            </p>
          </div>
        </div>

        <CreateProductForm
          onCreated={handleProductCreated}
          onCancel={handleCancelCreate}
        />
      </>
    );
  }

  if (
    viewMode === "edit" &&
    canManageProducts &&
    selectedProduct !== null
  ) {
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">Inventory Management</div>
            <h1 className="page-title">Edit Product</h1>
            <p className="page-subtitle">
              Update the information for {selectedProduct.name}.
            </p>
          </div>
        </div>

        <EditProductForm
          key={selectedProduct.id}
          product={selectedProduct}
          onUpdated={handleProductUpdated}
          onCancel={handleCancelEdit}
        />
      </>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Inventory Management</div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">
            View and explore products stored in KCStoreCore.
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
          {canManageProducts && !rolesLoading && (
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setSuccessMessage("");
                setViewMode("create");
              }}
            >
              + Add Product
            </button>
          )}

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setSuccessMessage("");
              void loadProducts();
            }}
            disabled={loadState === "loading"}
          >
            {loadState === "loading"
              ? "Loading..."
              : "Refresh Products"}
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
              htmlFor="product-search"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Search products
            </label>

            <input
              id="product-search"
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search SKU, name or category..."
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid var(--border, #334155)",
                background: "var(--surface, transparent)",
                color: "inherit",
                font: "inherit",
              }}
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
            Include inactive products
          </label>
        </div>

        {loadState === "loading" && (
          <div role="status" className="empty-module">
            <h2>Loading products...</h2>
            <p>
              Retrieving product information from KCStoreCore.
            </p>
          </div>
        )}

        {loadState === "error" && (
          <div role="alert" className="empty-module">
            <h2>Unable to load products</h2>
            <p>{errorMessage}</p>

            <button
              type="button"
              className="primary-button"
              onClick={() => void loadProducts()}
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
                  Product Catalogue
                </h2>
                <div className="panel-subtitle">
                  {filteredProducts.length} product
                  {filteredProducts.length === 1 ? "" : "s"} displayed
                </div>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="empty-module">
                <h2>No products found</h2>
                <p>
                  {products.length === 0
                    ? "There are currently no products available for this filter."
                    : "No products match your search. Try another keyword."}
                </p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Unit Price</th>
                      <th>Status</th>
                      {canManageProducts && !rolesLoading && (
                        <th>Actions</th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <div className="product-name">
                            {product.name}
                          </div>
                          <div className="product-sku">
                            {product.sku}
                          </div>
                        </td>

                        <td>{product.categoryName}</td>

                        <td>
                          {currencyFormatter.format(
                            product.unitPrice,
                          )}
                        </td>

                        <td>
                          <span
                            className={`status ${
                              product.isActive ? "good" : "out"
                            }`}
                          >
                            {product.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        {canManageProducts && !rolesLoading && (
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
                                  handleEditProduct(product)
                                }
                                style={{
                                  padding: "8px 14px",
                                  borderRadius: "8px",
                                  border:
                                    "1px solid var(--border, #334155)",
                                  background: "transparent",
                                  color: "inherit",
                                  cursor: "pointer",
                                  font: "inherit",
                                  fontSize: "13px",
                                  fontWeight: 600,
                                }}
                                aria-label={`Edit ${product.name}`}
                              >
                                Edit
                              </button>

                              {product.isActive && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRequestDeactivation(product)
                                  }
                                  style={{
                                    padding: "8px 14px",
                                    borderRadius: "8px",
                                    border: "1px solid #ef4444",
                                    background: "transparent",
                                    color: "#ef4444",
                                    cursor: "pointer",
                                    font: "inherit",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                  }}
                                  aria-label={`Deactivate ${product.name}`}
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

      {productToDeactivate && canManageProducts && (
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
            aria-labelledby="deactivate-product-title"
            aria-describedby="deactivate-product-description"
            className="panel"
            style={{
              width: "100%",
              maxWidth: "480px",
              padding: "28px",
            }}
          >
            <h2
              id="deactivate-product-title"
              className="panel-title"
            >
              Deactivate Product
            </h2>

            <p
              id="deactivate-product-description"
              style={{
                marginTop: "16px",
                lineHeight: 1.7,
              }}
            >
              Are you sure you want to deactivate{" "}
              <strong>{productToDeactivate.name}</strong> (
              {productToDeactivate.sku})?
            </p>

            <p
              style={{
                marginTop: "12px",
                fontSize: "13px",
                lineHeight: 1.7,
              }}
            >
              The product will no longer appear in the default
              catalogue. Its database record will be retained
              and can still be viewed using the
              &quot;Include inactive products&quot; filter.
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
                  padding: "12px 20px",
                  borderRadius: "10px",
                  border:
                    "1px solid var(--border, #334155)",
                  background: "transparent",
                  color: "inherit",
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
