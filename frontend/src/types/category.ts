
/**
 * KCStoreCore Category API types.
 *
 * These interfaces correspond to the DTOs in:
 * KCStoreCore.Application.DTOs.Categories
 *
 * The frontend expects ASP.NET Core's standard
 * camelCase JSON property naming convention.
 */

export interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface CreateCategoryRequest {
  name: string;
  description: string | null;
}

export interface UpdateCategoryRequest
  extends CreateCategoryRequest {
  isActive: boolean;
}

export interface GetCategoriesQuery {
  includeInactive?: boolean;
}

export interface CategoryApiError {
  message?: string;
}
