/**
 * KCStoreCore Supplier API types.
 *
 * These interfaces correspond to the backend DTOs:
 *
 * CreateSupplierRequest
 * UpdateSupplierRequest
 * SupplierResponse
 *
 * ASP.NET Core JSON responses use camelCase properties.
 */

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phoneNumber: string | null;
  address: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface CreateSupplierRequest {
  name: string;
  contactPerson: string | null;
  email: string | null;
  phoneNumber: string | null;
  address: string | null;
}

export interface UpdateSupplierRequest extends CreateSupplierRequest {
  isActive: boolean;
}

export interface SupplierApiError {
  message?: string;
}