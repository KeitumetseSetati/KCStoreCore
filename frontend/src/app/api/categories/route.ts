
import { NextRequest, NextResponse } from "next/server";

import type { Category } from "@/types/category";

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
 * GET /api/categories
 *
 * Administrator, Manager and Staff.
 * Retrieves categories from the ASP.NET Core backend.
 */
export async function GET(request: NextRequest) {
  const accessToken =
    request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!accessToken) {
    return errorResponse("Authentication is required.", 401);
  }

  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    console.error("API_BASE_URL is not configured.");

    return errorResponse(
      "Categories service is not configured.",
      500,
    );
  }

  const includeInactive =
    request.nextUrl.searchParams.get("includeInactive");

  if (
    includeInactive !== null &&
    includeInactive !== "true" &&
    includeInactive !== "false"
  ) {
    return errorResponse(
      "includeInactive must be either true or false.",
      400,
    );
  }

  const backendUrl = new URL(
    `${apiBaseUrl.replace(/\/$/, "")}/api/categories`,
  );

  if (includeInactive !== null) {
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
        "You do not have permission to view categories.",
        403,
      );
    }

    if (!backendResponse.ok) {
      console.error(
        "Backend categories request failed:",
        backendResponse.status,
      );

      return errorResponse(
        "Unable to retrieve categories right now.",
        502,
      );
    }

    const categories: unknown = await backendResponse.json();

    if (!Array.isArray(categories)) {
      console.error(
        "Backend returned an invalid categories response.",
      );

      return errorResponse(
        "The categories service returned an invalid response.",
        502,
      );
    }

    return NextResponse.json(categories, {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error("Categories API request failed:", error);

    return errorResponse(
      "Unable to connect to the categories service.",
      502,
    );
  }
}

/**
 * POST /api/categories
 *
 * Administrator and Manager only.
 * Creates a category through the ASP.NET Core backend.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin && origin !== request.nextUrl.origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  const accessToken =
    request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!accessToken) {
    return errorResponse("Authentication is required.", 401);
  }

  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    console.error("API_BASE_URL is not configured.");

    return errorResponse(
      "Categories service is not configured.",
      500,
    );
  }

  const contentType =
    request.headers.get("content-type") ?? "";

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
      "A valid category request is required.",
      400,
    );
  }

  const category = body as Record<string, unknown>;

  const name = category.name;
  const description = category.description;

  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 100
  ) {
    return errorResponse(
      "Category name must contain between 2 and 100 characters.",
      400,
    );
  }

  if (
    description !== null &&
    description !== undefined &&
    (typeof description !== "string" ||
      description.trim().length > 500)
  ) {
    return errorResponse(
      "Category description must not exceed 500 characters.",
      400,
    );
  }

  const categoryRequest = {
    name: name.trim(),
    description:
      typeof description === "string"
        ? description.trim() || null
        : null,
  };

  try {
    const backendResponse = await fetch(
      `${apiBaseUrl.replace(/\/$/, "")}/api/categories`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(categoryRequest),
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
        "You do not have permission to create categories.",
        403,
      );
    }

    if (backendResponse.status === 400) {
      return errorResponse(
        "The category information is invalid.",
        400,
      );
    }

    if (backendResponse.status === 409) {
      const errorData = (await backendResponse.json().catch(
        () => null,
      )) as { message?: string } | null;

      return errorResponse(
        errorData?.message ??
          "A category with this name already exists.",
        409,
      );
    }

    if (!backendResponse.ok) {
      console.error(
        "Backend category creation failed:",
        backendResponse.status,
      );

      return errorResponse(
        "Unable to create the category right now.",
        502,
      );
    }

    const createdCategory =
      (await backendResponse.json()) as Category;

    if (
      !createdCategory ||
      typeof createdCategory.id !== "string"
    ) {
      console.error(
        "Backend returned an invalid created-category response.",
      );

      return errorResponse(
        "The categories service returned an invalid response.",
        502,
      );
    }

    return NextResponse.json(createdCategory, {
      status: 201,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error("Create category request failed:", error);

    return errorResponse(
      "Unable to connect to the categories service.",
      502,
    );
  }
}
