
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import type { Product } from "@/types/product";

const SESSION_COOKIE_NAME = "kcstorecore_session";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
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

/**
 * GET /api/products
 *
 * Retrieves products from the ASP.NET Core backend.
 *
 * Supported roles:
 * - Administrator
 * - Manager
 * - Staff
 *
 * The backend enforces the InventoryAccess policy.
 */
export async function GET(request: NextRequest) {
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

  const includeInactive =
    request.nextUrl.searchParams.get("includeInactive");

  const backendUrl = new URL(
    `${apiBaseUrl.replace(/\/$/, "")}/api/products`,
  );

  if (includeInactive !== null) {
    if (
      includeInactive !== "true" &&
      includeInactive !== "false"
    ) {
      return errorResponse(
        "includeInactive must be either true or false.",
        400,
      );
    }

    backendUrl.searchParams.set(
      "includeInactive",
      includeInactive,
    );
  }

  try {
    const backendResponse = await fetch(
      backendUrl.toString(),
      {
        method: "GET",
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
        "You do not have permission to view products.",
        403,
      );
    }

    if (!backendResponse.ok) {
      console.error(
        "Backend products request failed:",
        backendResponse.status,
      );

      return errorResponse(
        "Unable to retrieve products right now.",
        502,
      );
    }

    const products =
      (await backendResponse.json()) as Product[];

    if (!Array.isArray(products)) {
      console.error(
        "Backend returned an invalid products response.",
      );

      return errorResponse(
        "The products service returned an invalid response.",
        502,
      );
    }

    return NextResponse.json(products, {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error("Products API request failed:", error);

    return errorResponse(
      "Unable to connect to the products service.",
      502,
    );
  }
}

/**
 * POST /api/products
 *
 * Creates a product through the ASP.NET Core backend.
 *
 * Supported roles:
 * - Administrator
 * - Manager
 *
 * The backend enforces the ManagementAccess policy.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin && origin !== request.nextUrl.origin) {
    return errorResponse("Invalid request origin.", 403);
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

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().startsWith("application/json")) {
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
      "A valid product request is required.",
      400,
    );
  }

  const product = body as Record<string, unknown>;

  const sku = product.sku;
  const name = product.name;
  const description = product.description;
  const categoryId = product.categoryId;
  const unitPrice = product.unitPrice;
  const costPrice = product.costPrice;

  const guidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (
    typeof sku !== "string" ||
    sku.trim().length < 2 ||
    sku.trim().length > 50
  ) {
    return errorResponse(
      "Product SKU must contain between 2 and 50 characters.",
      400,
    );
  }

  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 150
  ) {
    return errorResponse(
      "Product name must contain between 2 and 150 characters.",
      400,
    );
  }

  if (
    description !== null &&
    description !== undefined &&
    (typeof description !== "string" ||
      description.length > 500)
  ) {
    return errorResponse(
      "Product description must not exceed 500 characters.",
      400,
    );
  }

  if (
    typeof categoryId !== "string" ||
    !guidPattern.test(categoryId) ||
    categoryId === "00000000-0000-0000-0000-000000000000"
  ) {
    return errorResponse(
      "A valid product category is required.",
      400,
    );
  }

  const validPrice = (value: unknown) =>
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 999999999999.99;

  if (!validPrice(unitPrice)) {
    return errorResponse(
      "Unit price must be a valid non-negative amount.",
      400,
    );
  }

  if (!validPrice(costPrice)) {
    return errorResponse(
      "Cost price must be a valid non-negative amount.",
      400,
    );
  }

  const productRequest = {
    sku: sku.trim(),
    name: name.trim(),
    description:
      typeof description === "string"
        ? description.trim() || null
        : null,
    categoryId,
    unitPrice,
    costPrice,
  };

  try {
    const backendResponse = await fetch(
      `${apiBaseUrl.replace(/\/$/, "")}/api/products`,
      {
        method: "POST",
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
        "You do not have permission to create products.",
        403,
      );
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
        "A product with the provided details may already exist.",
        409,
      );
    }

    if (!backendResponse.ok) {
      console.error(
        "Backend product creation failed:",
        backendResponse.status,
      );

      return errorResponse(
        "Unable to create the product right now.",
        502,
      );
    }

    const createdProduct =
      (await backendResponse.json()) as Product;

    if (
      !createdProduct ||
      typeof createdProduct.id !== "string"
    ) {
      console.error(
        "Backend returned an invalid created-product response.",
      );

      return errorResponse(
        "The products service returned an invalid response.",
        502,
      );
    }

    return NextResponse.json(createdProduct, {
      status: 201,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error("Create product request failed:", error);

    return errorResponse(
      "Unable to connect to the products service.",
      502,
    );
  }
}
