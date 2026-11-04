
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { Category, CategoryApiError } from "@/types/category";

type LoadState = "loading" | "success" | "error";

export default function CategoriesView() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const loadCategories = useCallback(
    async (signal?: AbortSignal) => {
      setLoadState("loading");
      setErrorMessage("");

      try {
        const params = new URLSearchParams({
          includeInactive: String(includeInactive),
        });

        const response = await fetch(
          `/api/categories?${params.toString()}`,
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
          )) as CategoryApiError;

          if (signal?.aborted) {
            return;
          }

          if (response.status === 401) {
            setErrorMessage(
              "Your session has expired. Please sign in again.",
            );
          } else if (response.status === 403) {
            setErrorMessage(
              "You do not have permission to view categories.",
            );
          } else {
            setErrorMessage(
              errorData.message ??
                "Unable to retrieve categories. Please try again.",
            );
          }

          setCategories([]);
          setLoadState("error");
          return;
        }

        const result: unknown = await response.json();

        if (signal?.aborted) {
          return;
        }

        if (!Array.isArray(result)) {
          throw new Error("Invalid categories response.");
        }

        setCategories(result as Category[]);
        setLoadState("success");
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        console.error("Categories request failed:", error);

        setCategories([]);
        setErrorMessage(
          "Unable to connect to the categories service.",
        );
        setLoadState("error");
      }
    },
    [includeInactive],
  );

  useEffect(() => {
    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      void loadCategories(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [loadCategories]);

  const filteredCategories = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return categories;
    }

    return categories.filter((category) =>
      [
        category.name,
        category.description ?? "",
      ].some((value) => value.toLowerCase().includes(search)),
    );
  }, [categories, searchTerm]);

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Inventory Management</div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">
            View and explore product categories stored in KCStoreCore.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => void loadCategories()}
          disabled={loadState === "loading"}
        >
          {loadState === "loading"
            ? "Loading..."
            : "Refresh Categories"}
        </button>
      </div>

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
              htmlFor="category-search"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Search categories
            </label>

            <input
              id="category-search"
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search name or description..."
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
            Include inactive categories
          </label>
        </div>

        {loadState === "loading" && (
          <div role="status" className="empty-module">
            <h2>Loading categories...</h2>
            <p>
              Retrieving category information from KCStoreCore.
            </p>
          </div>
        )}

        {loadState === "error" && (
          <div role="alert" className="empty-module">
            <h2>Unable to load categories</h2>
            <p>{errorMessage}</p>

            <button
              type="button"
              className="primary-button"
              onClick={() => void loadCategories()}
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
                  Category Catalogue
                </h2>
                <div className="panel-subtitle">
                  {filteredCategories.length} categor
                  {filteredCategories.length === 1
                    ? "y"
                    : "ies"}{" "}
                  displayed
                </div>
              </div>
            </div>

            {filteredCategories.length === 0 ? (
              <div className="empty-module">
                <h2>No categories found</h2>
                <p>
                  {categories.length === 0
                    ? "There are currently no categories available for this filter."
                    : "No categories match your search. Try another keyword."}
                </p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCategories.map((category) => (
                      <tr key={category.id}>
                        <td>
                          <div className="product-name">
                            {category.name}
                          </div>
                        </td>

                        <td>
                          {category.description?.trim() ||
                            "No description"}
                        </td>

                        <td>
                          <span
                            className={`status ${
                              category.isActive ? "good" : "out"
                            }`}
                          >
                            {category.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
