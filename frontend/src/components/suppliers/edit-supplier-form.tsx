"use client";

import { useState, type FormEvent } from "react";

import type {
  Supplier,
  UpdateSupplierRequest,
  SupplierApiError,
} from "@/types/supplier";

type EditSupplierFormProps = {
  supplier: Supplier;
  onUpdated: (supplier: Supplier) => void;
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

export default function EditSupplierForm({
  supplier,
  onUpdated,
  onCancel,
}: EditSupplierFormProps) {
  const [name, setName] = useState(supplier.name);
  const [contactPerson, setContactPerson] = useState(
    supplier.contactPerson ?? "",
  );
  const [email, setEmail] = useState(supplier.email ?? "");
  const [phoneNumber, setPhoneNumber] = useState(
    supplier.phoneNumber ?? "",
  );
  const [address, setAddress] = useState(
    supplier.address ?? "",
  );
  const [isActive, setIsActive] = useState(
    supplier.isActive,
  );

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedContactPerson = contactPerson.trim();
    const trimmedEmail = email.trim();
    const trimmedPhoneNumber = phoneNumber.trim();
    const trimmedAddress = address.trim();

    if (
      trimmedName.length === 0 ||
      trimmedName.length > 150
    ) {
      setFormError(
        "Supplier name must contain between 1 and 150 characters.",
      );
      return;
    }

    if (
      trimmedEmail.length > 254 ||
      (trimmedEmail.length > 0 &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
    ) {
      setFormError(
        "Please enter a valid supplier email address.",
      );
      return;
    }

    const payload: UpdateSupplierRequest = {
      name: trimmedName,
      contactPerson: trimmedContactPerson || null,
      email: trimmedEmail || null,
      phoneNumber: trimmedPhoneNumber || null,
      address: trimmedAddress || null,
      isActive,
    };

    setSubmitting(true);
    setFormError("");

    try {
      const response = await fetch(
        `/api/suppliers/${encodeURIComponent(supplier.id)}`,
        {
          method: "PUT",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
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
            "You do not have permission to update suppliers.",
          );
        }

        if (response.status === 404) {
          throw new Error(
            "Supplier not found. It may have been removed.",
          );
        }

        if (response.status === 409) {
          throw new Error(
            errorData.message ??
              "The supplier could not be updated due to a conflict.",
          );
        }

        throw new Error(
          errorData.message ??
            "Unable to update the supplier. Please try again.",
        );
      }

      if (response.status !== 200) {
        throw new Error(
          "The server returned an unexpected response.",
        );
      }

      const updatedSupplier: unknown = await response.json();

      if (
        typeof updatedSupplier !== "object" ||
        updatedSupplier === null ||
        Array.isArray(updatedSupplier) ||
        !("id" in updatedSupplier) ||
        typeof updatedSupplier.id !== "string"
      ) {
        throw new Error(
          "The server returned an invalid supplier.",
        );
      }

      onUpdated(updatedSupplier as Supplier);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to update the supplier.",
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
          <h2 className="panel-title">Edit Supplier</h2>
          <p className="panel-subtitle">
            Update supplier details and account status.
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
              htmlFor="edit-supplier-name"
              style={labelStyle}
            >
              Supplier Name
            </label>

            <input
              id="edit-supplier-name"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setFormError("");
              }}
              maxLength={150}
              required
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="edit-supplier-contact"
              style={labelStyle}
            >
              Contact Person (optional)
            </label>

            <input
              id="edit-supplier-contact"
              type="text"
              value={contactPerson}
              onChange={(event) => {
                setContactPerson(event.target.value);
                setFormError("");
              }}
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="edit-supplier-email"
              style={labelStyle}
            >
              Email Address (optional)
            </label>

            <input
              id="edit-supplier-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setFormError("");
              }}
              maxLength={254}
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="edit-supplier-phone"
              style={labelStyle}
            >
              Phone Number (optional)
            </label>

            <input
              id="edit-supplier-phone"
              type="tel"
              value={phoneNumber}
              onChange={(event) => {
                setPhoneNumber(event.target.value);
                setFormError("");
              }}
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label
              htmlFor="edit-supplier-address"
              style={labelStyle}
            >
              Address (optional)
            </label>

            <textarea
              id="edit-supplier-address"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                setFormError("");
              }}
              rows={3}
              disabled={submitting}
              style={{
                ...inputStyle,
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label
              htmlFor="edit-supplier-active"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: submitting
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              <input
                id="edit-supplier-active"
                type="checkbox"
                checked={isActive}
                onChange={(event) => {
                  setIsActive(event.target.checked);
                  setFormError("");
                }}
                disabled={submitting}
              />

              <span>Supplier is active</span>
            </label>

            <p
              className="panel-subtitle"
              style={{ marginTop: "8px" }}
            >
              Inactive suppliers are excluded from the
              standard supplier directory.
            </p>
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
              cursor: submitting
                ? "not-allowed"
                : "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={submitting}
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