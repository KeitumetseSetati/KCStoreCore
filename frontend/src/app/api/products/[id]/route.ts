
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import type { Product } from "@/types/product";

const SESSION_COOKIE_NAME = "kcstorecore_session";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateProductPayload = {
  sku: string;
  name: string;
  description: string | null;
  categoryId: string;
  unitPrice: number;
  costPrice: number;
  isActive: boolean;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { message },
    {
      status,
      headers: NO_STORE_HEADERS,
    },
  );
}

function isValidGuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    ) &&
    value !== "00000000-0000-0000-0000-000000000000"
  );
}

function isValidPrice(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 999999999999.99
  );
}

/**
 * PUT /api/products/[id]
 *
 * Updates an existing product through the ASP.NET Core API.
 *
 * Authorized roles:
 * - Administrator
 * - Manager
 *
 * The backend enforces the ManagementAccess policy.
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  const origin = request.headers.get("origin");

  if (origin && origin !== request.nextUrl.origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  const { id } = await context.params;

  if (!isValidGuid(id)) {
    return errorResponse("A valid product ID is required.", 400);
  }

  const cookieStore = await cookies();

  const accessToken =
    cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!accessToken) {
    return errorResponse("Authentication is required.", 401);
  }

  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    console.error("API_BASE_URL is not configured.");

    return errorResponse(
      "Products service is not configured.",
      500,
    );
  }

  const contentType =
    request.headers.get("content-type") ?? "";

  if (
    !contentType.toLowerCase().startsWith("application/json")
  ) {
    return errorResponse(
      "Content-Type must be application/json.",
      415,
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON request body.", 400);
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return errorResponse(
      "A valid product update request is required.",
      400,
    );
  }

  const data = body as Record<string, unknown>;

  if (
    typeof data.sku !== "string" ||
    data.sku.trim().length < 2 ||
    data.sku.trim().length > 50
  ) {
    return errorResponse(
      "Product SKU must contain between 2 and 50 characters.",
      400,
    );
  }

  if (
    typeof data.name !== "string" ||
    data.name.trim().length < 2 ||
    data.name.trim().length > 150
  ) {
    return errorResponse(
      "Product name must contain between 2 and 150 characters.",
      400,
    );
  }

  if (
    data.description !== null &&
    data.description !== undefined &&
    (typeof data.description !== "string" ||
      data.description.length > 500)
  ) {
    return errorResponse(
      "Product description must not exceed 500 characters.",
      400,
    );
  }

  if (!isValidGuid(data.categoryId)) {
    return errorResponse(
      "A valid product category is required.",
      400,
    );
  }

  if (!isValidPrice(data.unitPrice)) {
    return errorResponse(
      "Unit price must be a valid non-negative amount.",
      400,
    );
  }

  if (!isValidPrice(data.costPrice)) {
    return errorResponse(
      "Cost price must be a valid non-negative amount.",
      400,
    );
  }

  if (typeof data.isActive !== "boolean") {
    return errorResponse(
      "Product activation status must be true or false.",
      400,
    );
  }

  const productRequest: UpdateProductPayload = {
    sku: data.sku.trim(),
    name: data.name.trim(),
    description:
      typeof data.description === "string"
        ? data.description.trim() || null
        : null,
    categoryId: data.categoryId,
    unitPrice: data.unitPrice,
    costPrice: data.costPrice,
    isActive: data.isActive,
  };

  try {
    const backendResponse = await fetch(
      `${apiBaseUrl.replace(/\/$/, "")}/api/products/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productRequest),
        cache: "no-store",
      },
    );

    if (backendResponse.status === 401) {
      const response = errorResponse(
        "Your session is invalid or has expired.",
        401,
      );

      response.cookies.delete(SESSION_COOKIE_NAME);

      return response;
    }

    if (backendResponse.status === 403) {
      return errorResponse(
        "You do not have permission to update products.",
        403,
      );
    }

    if (backendResponse.status === 404) {
      return errorResponse("Product not found.", 404);
    }

    if (backendResponse.status === 400) {
      const errorData = (await backendResponse.json().catch(
        () => null,
      )) as { message?: string } | null;

      return errorResponse(
        errorData?.message ??
          "The product information is invalid.",
        400,
      );
    }

    if (backendResponse.status === 409) {
      return errorResponse(
        "The product update conflicts with existing data.",
        409,
      );
    }

    if (!backendResponse.ok) {
      console.error(
        "Backend product update failed:",
        backendResponse.status,
      );

      return errorResponse(
        "Unable to update the product right now.",
        502,
      );
    }

    const updatedProduct =
      (await backendResponse.json()) as Product;

    if (
      !updatedProduct ||
      typeof updatedProduct.id !== "string"
    ) {
      console.error(
        "Backend returned an invalid updated-product response.",
      );

      return errorResponse(
        "The products service returned an invalid response.",
        502,
      );
    }

    return NextResponse.json(updatedProduct, {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error("Update product request failed:", error);

    return errorResponse(
      "Unable to connect to the products service.",
      502,
    );
  }
}

/**
 * PATCH /api/products/[id]
 *
 * Deactivates an existing product by forwarding the request to:
 * PATCH /api/products/{id}/deactivate
 *
 * The backend enforces the ManagementAccess policy.
 *
 * Successful response: 204 No Content.
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  const origin = request.headers.get("origin");

  if (origin && origin !== request.nextUrl.origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  const { id } = await context.params;

  if (!isValidGuid(id)) {
    return errorResponse("A valid product ID is required.", 400);
  }

  const cookieStore = await cookies();

  const accessToken =
    cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!accessToken) {
    return errorResponse("Authentication is required.", 401);
  }

  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    console.error("API_BASE_URL is not configured.");

    return errorResponse(
      "Products service is not configured.",
      500,
    );
  }

  try {
    const backendResponse = await fetch(
      `${apiBaseUrl.replace(/\/$/, "")}/api/products/${encodeURIComponent(id)}/deactivate`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (backendResponse.status === 401) {
      const response = errorResponse(
        "Your session is invalid or has expired.",
        401,
      );

      response.cookies.delete(SESSION_COOKIE_NAME);

      return response;
    }

    if (backendResponse.status === 403) {
      return errorResponse(
        "You do not have permission to deactivate products.",
        403,
      );
    }

    if (backendResponse.status === 404) {
      return errorResponse("Product not found.", 404);
    }

    if (backendResponse.status === 409) {
      return errorResponse(
        "The product could not be deactivated because of a data conflict.",
        409,
      );
    }

    if (!backendResponse.ok) {
      console.error(
        "Backend product deactivation failed:",
        backendResponse.status,
      );

      return errorResponse(
        "Unable to deactivate the product right now.",
        502,
      );
    }

    if (backendResponse.status !== 204) {
      console.error(
        "Unexpected product deactivation response:",
        backendResponse.status,
      );

      return errorResponse(
        "The products service returned an unexpected response.",
        502,
      );
    }

    return new NextResponse(null, {
      status: 204,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error("Deactivate product request failed:", error);

    return errorResponse(
      "Unable to connect to the products service.",
      502,
    );
  }
}
