"use client";

import { useState, type FormEvent } from "react";

import type {
  Supplier,
  CreateSupplierRequest,
  SupplierApiError,
} from "@/types/supplier";

type CreateSupplierFormProps = {
  onCreated: (supplier: Supplier) => void;
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

export default function CreateSupplierForm({
  onCreated,
  onCancel,
}: CreateSupplierFormProps) {
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedContactPerson = contactPerson.trim();
    const trimmedEmail = email.trim();
    const trimmedPhoneNumber = phoneNumber.trim();
    const trimmedAddress = address.trim();

    if (trimmedName.length === 0 || trimmedName.length > 150) {
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
      setFormError("Please enter a valid supplier email address.");
      return;
    }

    const payload: CreateSupplierRequest = {
      name: trimmedName,
      contactPerson: trimmedContactPerson || null,
      email: trimmedEmail || null,
      phoneNumber: trimmedPhoneNumber || null,
      address: trimmedAddress || null,
    };

    setSubmitting(true);
    setFormError("");

    try {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

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
            "You do not have permission to create suppliers.",
          );
        }

        if (response.status === 409) {
          throw new Error(
            errorData.message ??
              "A supplier conflict occurred. Please review the details.",
          );
        }

        throw new Error(
          errorData.message ??
            "Unable to create the supplier. Please try again.",
        );
      }

      if (response.status !== 201) {
        throw new Error(
          "The server returned an unexpected response.",
        );
      }

      const createdSupplier: unknown = await response.json();

      if (
        typeof createdSupplier !== "object" ||
        createdSupplier === null ||
        Array.isArray(createdSupplier) ||
        !("id" in createdSupplier) ||
        typeof createdSupplier.id !== "string"
      ) {
        throw new Error(
          "The server returned an invalid supplier.",
        );
      }

      onCreated(createdSupplier as Supplier);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to create the supplier.",
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
          <h2 className="panel-title">Create Supplier</h2>
          <p className="panel-subtitle">
            Register a new supplier in KCStoreCore.
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
              htmlFor="create-supplier-name"
              style={labelStyle}
            >
              Supplier Name
            </label>

            <input
              id="create-supplier-name"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setFormError("");
              }}
              placeholder="e.g. ABC Wholesale"
              maxLength={150}
              required
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="create-supplier-contact"
              style={labelStyle}
            >
              Contact Person (optional)
            </label>

            <input
              id="create-supplier-contact"
              type="text"
              value={contactPerson}
              onChange={(event) => {
                setContactPerson(event.target.value);
                setFormError("");
              }}
              placeholder="e.g. John Smith"
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="create-supplier-email"
              style={labelStyle}
            >
              Email Address (optional)
            </label>

            <input
              id="create-supplier-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setFormError("");
              }}
              placeholder="e.g. orders@example.com"
              maxLength={254}
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="create-supplier-phone"
              style={labelStyle}
            >
              Phone Number (optional)
            </label>

            <input
              id="create-supplier-phone"
              type="tel"
              value={phoneNumber}
              onChange={(event) => {
                setPhoneNumber(event.target.value);
                setFormError("");
              }}
              placeholder="e.g. +27 12 345 6789"
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label
              htmlFor="create-supplier-address"
              style={labelStyle}
            >
              Address (optional)
            </label>

            <textarea
              id="create-supplier-address"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                setFormError("");
              }}
              placeholder="Enter the supplier's address..."
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
            {submitting
              ? "Creating Supplier..."
              : "Create Supplier"}
          </button>
        </div>
      </form>
    </section>
  );
}