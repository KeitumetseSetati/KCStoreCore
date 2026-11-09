/**
 * KCStoreCore Store API types.
 *
 * These interfaces correspond to the DTOs in:
 * KCStoreCore.Application.DTOs.Stores
 *
 * The frontend expects ASP.NET Core's standard
 * camelCase JSON property naming convention.
 */

export interface Store {
  id: string;
  code: string;
  name: string;
  address: string | null;
  city: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface CreateStoreRequest {
  code: string;
  name: string;
  address: string | null;
  city: string | null;
}

export interface UpdateStoreRequest extends CreateStoreRequest {
  isActive: boolean;
}

export interface GetStoresQuery {
  includeInactive?: boolean;
}

export interface StoreApiError {
  message?: string;
}