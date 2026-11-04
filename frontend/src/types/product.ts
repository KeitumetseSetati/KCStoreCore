
/**
 * KCStoreCore Product API types.
 *
 * These interfaces correspond to the DTOs defined in:
 * KCStoreCore.Application.DTOs.Products
 *
 * ASP.NET Core is expected to serialize JSON properties
 * using its default camelCase naming convention.
 */

/**
 * Product returned by the backend.
 *
 * Corresponds to ProductResponse.cs.
 */
export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  unitPrice: number;
  costPrice: number;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

/**
 * Request payload for creating a product.
 *
 * Corresponds to CreateProductRequest.cs.
 */
export interface CreateProductRequest {
  sku: string;
  name: string;
  description: string | null;
  categoryId: string;
  unitPrice: number;
  costPrice: number;
}

/**
 * Request payload for updating a product.
 *
 * Corresponds to UpdateProductRequest.cs.
 */
export interface UpdateProductRequest
  extends CreateProductRequest {
  isActive: boolean;
}

/**
 * Optional query parameters for retrieving products.
 */
export interface GetProductsQuery {
  includeInactive?: boolean;
}

/**
 * Standard error response used by several
 * KCStoreCore Products API endpoints.
 */
export interface ProductApiError {
  message?: string;
}
