
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import type { Category } from "@/types/category";
import type {
  Product,
  ProductApiError,
  UpdateProductRequest,
} from "@/types/product";

type EditProductFormProps = {
  product: Product;
  onUpdated: (product: Product) => void;
  onCancel: () => void;
};

type ProductFormValues = {
  sku: string;
  name: string;
  description: string;
  categoryId: string;
  unitPrice: string;
  costPrice: string;
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

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  fontSize: "13px",
  fontWeight: 600,
};

function getInitialValues(product: Product): ProductFormValues {
  return {
    sku: product.sku,
    name: product.name,
    description: product.description ?? "",
    categoryId: product.categoryId,
    unitPrice: String(product.unitPrice),
    costPrice: String(product.costPrice),
  };
}

export default function EditProductForm({
  product,
  onUpdated,
  onCancel,
}: EditProductFormProps) {
  const [values, setValues] = useState<ProductFormValues>(
    () => getInitialValues(product),
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const loadCategories = useCallback(
    async (signal?: AbortSignal) => {
      setCategoriesLoading(true);
      setCategoriesError("");

      try {
        const response = await fetch("/api/categories", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal,
        });

        if (signal?.aborted) {
          return;
        }

        if (!response.ok) {
          const errorData = (await response.json().catch(
            () => ({}),
          )) as ProductApiError;

          throw new Error(
            errorData.message ?? "Unable to load categories.",
          );
        }

        const result: unknown = await response.json();

        if (signal?.aborted) {
          return;
        }

        if (!Array.isArray(result)) {
          throw new Error("Invalid categories response.");
        }

        const availableCategories = (
          result as Category[]
        ).filter(
          (category) =>
            category.isActive ||
            category.id === product.categoryId,
        );

        setCategories(availableCategories);
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        setCategoriesError(
          error instanceof Error
            ? error.message
            : "Unable to load categories.",
        );
      } finally {
        if (!signal?.aborted) {
          setCategoriesLoading(false);
        }
      }
    },
    [product.categoryId],
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

  function updateField(
    field: keyof ProductFormValues,
    value: string,
  ) {
    setValues((previous) => ({
      ...previous,
      [field]: value,
    }));

    setFormError("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const sku = values.sku.trim();
    const name = values.name.trim();
    const description = values.description.trim();

    if (sku.length < 2 || sku.length > 50) {
      setFormError(
        "Product SKU must contain between 2 and 50 characters.",
      );
      return;
    }

    if (name.length < 2 || name.length > 150) {
      setFormError(
        "Product name must contain between 2 and 150 characters.",
      );
      return;
    }

    if (description.length > 500) {
      setFormError(
        "Product description must not exceed 500 characters.",
      );
      return;
    }

    if (
      !categories.some(
        (category) => category.id === values.categoryId,
      )
    ) {
      setFormError("Please select a valid category.");
      return;
    }

    if (
      values.unitPrice.trim() === "" ||
      values.costPrice.trim() === ""
    ) {
      setFormError(
        "Unit price and cost price are required.",
      );
      return;
    }

    const unitPrice = Number(values.unitPrice);
    const costPrice = Number(values.costPrice);

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice < 0 ||
      unitPrice > 999999999999.99
    ) {
      setFormError(
        "Enter a valid non-negative unit price.",
      );
      return;
    }

    if (
      !Number.isFinite(costPrice) ||
      costPrice < 0 ||
      costPrice > 999999999999.99
    ) {
      setFormError(
        "Enter a valid non-negative cost price.",
      );
      return;
    }

    const payload: UpdateProductRequest = {
      sku,
      name,
      description: description || null,
      categoryId: values.categoryId,
      unitPrice,
      costPrice,
      isActive: product.isActive,
    };

    setSubmitting(true);
    setFormError("");

    try {
      const response = await fetch(
        `/api/products/${encodeURIComponent(product.id)}`,
        {
          method: "PUT",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
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
            "You do not have permission to update products.",
          );
        }

        if (response.status === 404) {
          throw new Error(
            "This product no longer exists.",
          );
        }

        throw new Error(
          errorData.message ??
            "Unable to update the product. Please try again.",
        );
      }

      const updatedProduct =
        (await response.json()) as Product;

      onUpdated(updatedProduct);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to update the product.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <div
        className="panel-heading"
        style={{ marginBottom: "24px" }}
      >
        <div>
          <h2 className="panel-title">Edit Product</h2>
          <p className="panel-subtitle">
            Update the existing product information.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            gap: "20px",
          }}
        >
          <div>
            <label
              htmlFor="edit-product-sku"
              style={labelStyle}
            >
              Product SKU
            </label>
            <input
              id="edit-product-sku"
              type="text"
              value={values.sku}
              onChange={(event) =>
                updateField("sku", event.target.value)
              }
              minLength={2}
              maxLength={50}
              required
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="edit-product-name"
              style={labelStyle}
            >
              Product Name
            </label>
            <input
              id="edit-product-name"
              type="text"
              value={values.name}
              onChange={(event) =>
                updateField("name", event.target.value)
              }
              minLength={2}
              maxLength={150}
              required
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="edit-product-category"
              style={labelStyle}
            >
              Category
            </label>
            <select
              id="edit-product-category"
              value={values.categoryId}
              onChange={(event) =>
                updateField("categoryId", event.target.value)
              }
              required
              disabled={
                submitting ||
                categoriesLoading ||
                categories.length === 0
              }
              style={inputStyle}
            >
              <option value="">
                {categoriesLoading
                  ? "Loading categories..."
                  : "Select a category"}
              </option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                  {!category.isActive
                    ? " (Inactive)"
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="edit-product-unit-price"
              style={labelStyle}
            >
              Unit Price (ZAR)
            </label>
            <input
              id="edit-product-unit-price"
              type="number"
              value={values.unitPrice}
              onChange={(event) =>
                updateField(
                  "unitPrice",
                  event.target.value,
                )
              }
              min="0"
              max="999999999999.99"
              step="0.01"
              required
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="edit-product-cost-price"
              style={labelStyle}
            >
              Cost Price (ZAR)
            </label>
            <input
              id="edit-product-cost-price"
              type="number"
              value={values.costPrice}
              onChange={(event) =>
                updateField(
                  "costPrice",
                  event.target.value,
                )
              }
              min="0"
              max="999999999999.99"
              step="0.01"
              required
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label
              htmlFor="edit-product-description"
              style={labelStyle}
            >
              Description (optional)
            </label>
            <textarea
              id="edit-product-description"
              value={values.description}
              onChange={(event) =>
                updateField(
                  "description",
                  event.target.value,
                )
              }
              maxLength={500}
              rows={4}
              disabled={submitting}
              style={{
                ...inputStyle,
                resize: "vertical",
              }}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: "20px",
            fontSize: "13px",
          }}
        >
          Current product status:{" "}
          <strong>
            {product.isActive ? "Active" : "Inactive"}
          </strong>
        </div>

        {categoriesError && (
          <div
            role="alert"
            style={{ marginTop: "20px" }}
          >
            <p>{categoriesError}</p>

            <button
              type="button"
              onClick={() =>
                void loadCategories()
              }
              disabled={
                categoriesLoading || submitting
              }
            >
              Retry Loading Categories
            </button>
          </div>
        )}

        {formError && (
          <p
            role="alert"
            style={{
              marginTop: "20px",
              color: "#ef4444",
            }}
          >
            {formError}
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
            onClick={onCancel}
            disabled={submitting}
            style={{
              padding: "12px 20px",
              borderRadius: "10px",
              border:
                "1px solid var(--border, #334155)",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={
              submitting ||
              categoriesLoading ||
              categories.length === 0
            }
          >
            {submitting
              ? "Saving Changes..."
              : "Save Changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
