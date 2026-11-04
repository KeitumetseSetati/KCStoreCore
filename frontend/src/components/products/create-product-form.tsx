
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import type { Category } from "@/types/category";
import type { Product } from "@/types/product";

type CreateProductFormProps = {
  onCreated: (product: Product) => void;
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

type ApiError = {
  message?: string;
};

const initialValues: ProductFormValues = {
  sku: "",
  name: "",
  description: "",
  categoryId: "",
  unitPrice: "",
  costPrice: "",
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

export default function CreateProductForm({
  onCreated,
  onCancel,
}: CreateProductFormProps) {
  const [values, setValues] =
    useState<ProductFormValues>(initialValues);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const loadCategories = useCallback(async (signal?: AbortSignal) => {
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
        )) as ApiError;

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

      const activeCategories = (result as Category[]).filter(
        (category) => category.isActive,
      );

      setCategories(activeCategories);
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
  }, []);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const sku = values.sku.trim();
    const name = values.name.trim();
    const description = values.description.trim();

    if (sku.length < 2 || sku.length > 50) {
      setFormError("SKU must contain between 2 and 50 characters.");
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
        "Description must not exceed 500 characters.",
      );
      return;
    }

    if (
      !categories.some(
        (category) => category.id === values.categoryId,
      )
    ) {
      setFormError("Please select a valid active category.");
      return;
    }

    if (
      values.unitPrice.trim() === "" ||
      values.costPrice.trim() === ""
    ) {
      setFormError("Unit price and cost price are required.");
      return;
    }

    const unitPrice = Number(values.unitPrice);
    const costPrice = Number(values.costPrice);

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice < 0 ||
      unitPrice > 999999999999.99
    ) {
      setFormError("Enter a valid non-negative unit price.");
      return;
    }

    if (
      !Number.isFinite(costPrice) ||
      costPrice < 0 ||
      costPrice > 999999999999.99
    ) {
      setFormError("Enter a valid non-negative cost price.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sku,
          name,
          description: description || null,
          categoryId: values.categoryId,
          unitPrice,
          costPrice,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(
          () => ({}),
        )) as ApiError;

        throw new Error(
          errorData.message ?? "Unable to create the product.",
        );
      }

      const createdProduct =
        (await response.json()) as Product;

      onCreated(createdProduct);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to create the product.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading" style={{ marginBottom: "24px" }}>
        <div>
          <h2 className="panel-title">Create Product</h2>
          <p className="panel-subtitle">
            Add a new product to your inventory catalogue.
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
            <label htmlFor="create-sku" style={labelStyle}>
              Product SKU
            </label>
            <input
              id="create-sku"
              type="text"
              value={values.sku}
              onChange={(event) =>
                updateField("sku", event.target.value)
              }
              placeholder="e.g. ELEC-002"
              minLength={2}
              maxLength={50}
              required
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="create-name" style={labelStyle}>
              Product Name
            </label>
            <input
              id="create-name"
              type="text"
              value={values.name}
              onChange={(event) =>
                updateField("name", event.target.value)
              }
              placeholder="e.g. USB-C Hub"
              minLength={2}
              maxLength={150}
              required
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="create-category" style={labelStyle}>
              Category
            </label>
            <select
              id="create-category"
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
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="create-unit-price" style={labelStyle}>
              Unit Price (ZAR)
            </label>
            <input
              id="create-unit-price"
              type="number"
              value={values.unitPrice}
              onChange={(event) =>
                updateField("unitPrice", event.target.value)
              }
              placeholder="0.00"
              min="0"
              max="999999999999.99"
              step="0.01"
              required
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="create-cost-price" style={labelStyle}>
              Cost Price (ZAR)
            </label>
            <input
              id="create-cost-price"
              type="number"
              value={values.costPrice}
              onChange={(event) =>
                updateField("costPrice", event.target.value)
              }
              placeholder="0.00"
              min="0"
              max="999999999999.99"
              step="0.01"
              required
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="create-description" style={labelStyle}>
              Description (optional)
            </label>
            <textarea
              id="create-description"
              value={values.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="Enter a product description..."
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

        {categoriesError && (
          <div role="alert" style={{ marginTop: "20px" }}>
            <p>{categoriesError}</p>
            <button
              type="button"
              onClick={() => void loadCategories()}
              disabled={categoriesLoading || submitting}
            >
              Retry Loading Categories
            </button>
          </div>
        )}

        {!categoriesLoading &&
          !categoriesError &&
          categories.length === 0 && (
            <p role="status" style={{ marginTop: "20px" }}>
              No active categories are available. Create a category
              before adding products.
            </p>
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
              border: "1px solid var(--border, #334155)",
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
            {submitting ? "Creating Product..." : "Create Product"}
          </button>
        </div>
      </form>
    </section>
  );
}
