
import { NextRequest, NextResponse } from "next/server";

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
 * GET /api/reports/dashboard
 *
 * Retrieves the live dashboard summary from the ASP.NET Core
 * backend using the existing authenticated session.
 *
 * The backend enforces the ManagementAccess policy:
 * Administrator and Manager only.
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
      "Dashboard reports service is not configured.",
      500,
    );
  }

  const storeId = request.nextUrl.searchParams.get("storeId");

  const guidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (
    storeId !== null &&
    (!guidPattern.test(storeId) ||
      storeId === "00000000-0000-0000-0000-000000000000")
  ) {
    return errorResponse("A valid storeId is required.", 400);
  }

  const backendUrl = new URL(
    `${apiBaseUrl.replace(/\/$/, "")}/api/reports/dashboard`,
  );

  if (storeId !== null) {
    backendUrl.searchParams.set("storeId", storeId);
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
        "You do not have permission to view dashboard reports.",
        403,
      );
    }

    if (!backendResponse.ok) {
      console.error(
        "Backend dashboard request failed:",
        backendResponse.status,
      );

      return errorResponse(
        "Unable to retrieve dashboard statistics right now.",
        502,
      );
    }

    const data: unknown = await backendResponse.json();

    if (
      typeof data !== "object" ||
      data === null ||
      Array.isArray(data)
    ) {
      console.error(
        "Backend returned an invalid dashboard response.",
      );

      return errorResponse(
        "The dashboard service returned an invalid response.",
        502,
      );
    }

    const summary = data as Record<string, unknown>;

    const numericFields = [
      "totalProducts",
      "activeProducts",
      "totalStores",
      "activeStores",
      "totalSuppliers",
      "totalUnitsInStock",
      "totalInventoryValue",
      "lowStockItemCount",
      "pendingPurchaseOrders",
      "completedPurchaseOrders",
      "totalPurchaseOrders",
    ];

    const hasValidNumbers = numericFields.every(
      (field) =>
        typeof summary[field] === "number" &&
        Number.isFinite(summary[field]) &&
        summary[field] >= 0,
    );

    if (
      !hasValidNumbers ||
      typeof summary.generatedAtUtc !== "string" ||
      !Number.isFinite(Date.parse(summary.generatedAtUtc))
    ) {
      console.error(
        "Backend dashboard response failed validation.",
      );

      return errorResponse(
        "The dashboard service returned incomplete statistics.",
        502,
      );
    }

    return NextResponse.json(summary, {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error("Dashboard API request failed:", error);

    return errorResponse(
      "Unable to connect to the dashboard reports service.",
      502,
    );
  }
}
