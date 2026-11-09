"use client";

import { useState, type FormEvent } from "react";

import type {
  Store,
  CreateStoreRequest,
  StoreApiError,
} from "@/types/store";

type CreateStoreFormProps = {
  onCreated: (store: Store) => void;
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

export default function CreateStoreForm({
  onCreated,
  onCancel,
}: CreateStoreFormProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    const trimmedCity = city.trim();

    if (trimmedCode.length < 2 || trimmedCode.length > 30) {
      setFormError(
        "Store code must contain between 2 and 30 characters.",
      );
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 150) {
      setFormError(
        "Store name must contain between 2 and 150 characters.",
      );
      return;
    }

    if (trimmedAddress.length > 250) {
      setFormError(
        "Store address must not exceed 250 characters.",
      );
      return;
    }

    if (trimmedCity.length > 100) {
      setFormError(
        "Store city must not exceed 100 characters.",
      );
      return;
    }

    const payload: CreateStoreRequest = {
      code: trimmedCode,
      name: trimmedName,
      address: trimmedAddress || null,
      city: trimmedCity || null,
    };

    setSubmitting(true);
    setFormError("");

    try {
      const response = await fetch("/api/stores", {
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
        )) as StoreApiError;

        if (response.status === 401) {
          throw new Error(
            "Your session has expired. Please sign in again.",
          );
        }

        if (response.status === 403) {
          throw new Error(
            "You do not have permission to create stores.",
          );
        }

        if (response.status === 409) {
          throw new Error(
            errorData.message ??
              "A store with this code may already exist.",
          );
        }

        throw new Error(
          errorData.message ??
            "Unable to create the store. Please try again.",
        );
      }

      if (response.status !== 201) {
        throw new Error(
          "The server returned an unexpected response.",
        );
      }

      const createdStore: unknown = await response.json();

      if (
        typeof createdStore !== "object" ||
        createdStore === null ||
        !("id" in createdStore) ||
        typeof createdStore.id !== "string"
      ) {
        throw new Error(
          "The server returned an invalid store.",
        );
      }

      onCreated(createdStore as Store);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to create the store.",
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
          <h2 className="panel-title">Create Store</h2>
          <p className="panel-subtitle">
            Register a new store location in KCStoreCore.
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
            <label htmlFor="create-store-code" style={labelStyle}>
              Store Code
            </label>

            <input
              id="create-store-code"
              type="text"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setFormError("");
              }}
              placeholder="e.g. PTA001"
              minLength={2}
              maxLength={30}
              required
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="create-store-name" style={labelStyle}>
              Store Name
            </label>

            <input
              id="create-store-name"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setFormError("");
              }}
              placeholder="e.g. Pretoria Central"
              minLength={2}
              maxLength={150}
              required
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="create-store-city" style={labelStyle}>
              City (optional)
            </label>

            <input
              id="create-store-city"
              type="text"
              value={city}
              onChange={(event) => {
                setCity(event.target.value);
                setFormError("");
              }}
              placeholder="e.g. Pretoria"
              maxLength={100}
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="create-store-address" style={labelStyle}>
              Address (optional)
            </label>

            <textarea
              id="create-store-address"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                setFormError("");
              }}
              placeholder="Enter the store's physical address..."
              maxLength={250}
              rows={3}
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
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={submitting}
          >
            {submitting ? "Creating Store..." : "Create Store"}
          </button>
        </div>
      </form>
    </section>
  );
}