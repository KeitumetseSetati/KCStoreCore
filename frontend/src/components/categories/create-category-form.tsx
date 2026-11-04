
"use client";

import { useState, type FormEvent } from "react";

import type {
  Category,
  CreateCategoryRequest,
  CategoryApiError,
} from "@/types/category";

type CreateCategoryFormProps = {
  onCreated: (category: Category) => void;
  onCancel: () => void;
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

export default function CreateCategoryForm({
  onCreated,
  onCancel,
}: CreateCategoryFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setFormError(
        "Category name must contain between 2 and 100 characters.",
      );
      return;
    }

    if (trimmedDescription.length > 500) {
      setFormError(
        "Category description must not exceed 500 characters.",
      );
      return;
    }

    const payload: CreateCategoryRequest = {
      name: trimmedName,
      description: trimmedDescription || null,
    };

    setSubmitting(true);
    setFormError("");

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(
          () => ({}),
        )) as CategoryApiError;

        throw new Error(
          errorData.message ??
            "Unable to create the category. Please try again.",
        );
      }

      const createdCategory = (await response.json()) as Category;

      if (!createdCategory || typeof createdCategory.id !== "string") {
        throw new Error("The server returned an invalid category.");
      }

      onCreated(createdCategory);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to create the category.",
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
          <h2 className="panel-title">Create Category</h2>
          <p className="panel-subtitle">
            Add a new classification for your inventory products.
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
          <div style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="create-category-name" style={labelStyle}>
              Category Name
            </label>

            <input
              id="create-category-name"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setFormError("");
              }}
              placeholder="e.g. Office Supplies"
              minLength={2}
              maxLength={100}
              required
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label
              htmlFor="create-category-description"
              style={labelStyle}
            >
              Description (optional)
            </label>

            <textarea
              id="create-category-description"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                setFormError("");
              }}
              placeholder="Describe the products in this category..."
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
            disabled={submitting}
          >
            {submitting ? "Creating Category..." : "Create Category"}
          </button>
        </div>
      </form>
    </section>
  );
}
