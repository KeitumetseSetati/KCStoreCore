import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "kcstorecore_session";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { message },
    { status, headers: NO_STORE_HEADERS },
  );
}

function expiredSessionResponse() {
  const response = errorResponse(
    "Your session is invalid or has expired.",
    401,
  );

  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

function isValidSupplierId(id: string) {
  const guidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return (
    guidPattern.test(id) &&
    id.toLowerCase() !== "00000000-0000-0000-0000-000000000000"
  );
}

async function getRouteId(context: RouteContext) {
  const { id } = await context.params;
  return isValidSupplierId(id) ? id : null;
}

function getBackendUrl(id: string, deactivate = false) {
  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    console.error("API_BASE_URL is not configured.");
    return null;
  }

  const baseUrl =
    `${apiBaseUrl.replace(/\/$/, "")}/api/suppliers/${id}`;

  return deactivate ? `${baseUrl}/deactivate` : baseUrl;
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string"
    ? value.trim() || null
    : null;
}

function validateUpdate(body: unknown) {
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return { error: "A valid supplier request is required." };
  }

  const supplier = body as Record<string, unknown>;

  if (
    typeof supplier.name !== "string" ||
    supplier.name.trim().length === 0 ||
    supplier.name.trim().length > 150
  ) {
    return {
      error: "Supplier name must contain between 1 and 150 characters.",
    };
  }

  if (typeof supplier.isActive !== "boolean") {
    return {
      error: "Supplier active status must be true or false.",
    };
  }

  const optionalFields = [
    "contactPerson",
    "email",
    "phoneNumber",
    "address",
  ] as const;

  for (const field of optionalFields) {
    const value = supplier[field];

    if (
      value !== undefined &&
      value !== null &&
      typeof value !== "string"
    ) {
      return { error: `${field} must be text or null.` };
    }
  }

  if (typeof supplier.email === "string") {
    const email = supplier.email.trim();

    if (
      email.length > 254 ||
      (email.length > 0 &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    ) {
      return { error: "A valid supplier email address is required." };
    }
  }

  return {
    data: {
      name: supplier.name.trim(),
      contactPerson: normalizeOptionalText(supplier.contactPerson),
      email: normalizeOptionalText(supplier.email),
      phoneNumber: normalizeOptionalText(supplier.phoneNumber),
      address: normalizeOptionalText(supplier.address),
      isActive: supplier.isActive,
    },
  };
}

async function readSupplierResponse(response: Response) {
  const data: unknown = await response.json();

  if (
    typeof data !== "object" ||
    data === null ||
    Array.isArray(data) ||
    typeof (data as Record<string, unknown>).id !== "string"
  ) {
    return null;
  }

  return data;
}

async function readBackendError(response: Response, fallback: string) {
  const data: unknown = await response.json().catch(() => null);

  if (
    typeof data === "object" &&
    data !== null &&
    !Array.isArray(data) &&
    typeof (data as Record<string, unknown>).message === "string"
  ) {
    return (data as { message: string }).message;
  }

  return fallback;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const id = await getRouteId(context);

  if (!id) {
    return errorResponse("A valid supplier ID is required.", 400);
  }

  const accessToken =
    request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!accessToken) {
    return errorResponse("Authentication is required.", 401);
  }

  const backendUrl = getBackendUrl(id);

  if (!backendUrl) {
    return errorResponse("Suppliers service is not configured.", 500);
  }

  try {
    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (backendResponse.status === 401) {
      return expiredSessionResponse();
    }

    if (backendResponse.status === 403) {
      return errorResponse(
        "You do not have permission to view this supplier.",
        403,
      );
    }

    if (backendResponse.status === 404) {
      return errorResponse("Supplier not found.", 404);
    }

    if (!backendResponse.ok) {
      console.error(
        "Backend supplier retrieval failed:",
        backendResponse.status,
      );

      return errorResponse(
        "Unable to retrieve the supplier right now.",
        502,
      );
    }

    const supplier = await readSupplierResponse(backendResponse);

    if (!supplier) {
      return errorResponse(
        "The suppliers service returned an invalid response.",
        502,
      );
    }

    return NextResponse.json(supplier, {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error("Get supplier request failed:", error);

    return errorResponse(
      "Unable to connect to the suppliers service.",
      502,
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  const origin = request.headers.get("origin");

  if (origin && origin !== request.nextUrl.origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  const id = await getRouteId(context);

  if (!id) {
    return errorResponse("A valid supplier ID is required.", 400);
  }

  const accessToken =
    request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!accessToken) {
    return errorResponse("Authentication is required.", 401);
  }

  const backendUrl = getBackendUrl(id);

  if (!backendUrl) {
    return errorResponse("Suppliers service is not configured.", 500);
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

  const validation = validateUpdate(body);

  if (validation.error || !validation.data) {
    return errorResponse(
      validation.error ?? "Invalid supplier information.",
      400,
    );
  }

  try {
    const backendResponse = await fetch(backendUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validation.data),
      cache: "no-store",
    });

    if (backendResponse.status === 401) {
      return expiredSessionResponse();
    }

    if (backendResponse.status === 403) {
      return errorResponse(
        "You do not have permission to update suppliers.",
        403,
      );
    }

    if (backendResponse.status === 404) {
      return errorResponse("Supplier not found.", 404);
    }

    if (backendResponse.status === 400) {
      return errorResponse(
        await readBackendError(
          backendResponse,
          "The supplier information is invalid.",
        ),
        400,
      );
    }

    if (backendResponse.status === 409) {
      return errorResponse(
        await readBackendError(
          backendResponse,
          "The supplier could not be updated due to a conflict.",
        ),
        409,
      );
    }

    if (!backendResponse.ok) {
      console.error(
        "Backend supplier update failed:",
        backendResponse.status,
      );

      return errorResponse(
        "Unable to update the supplier right now.",
        502,
      );
    }

    const updatedSupplier =
      await readSupplierResponse(backendResponse);

    if (!updatedSupplier) {
      return errorResponse(
        "The suppliers service returned an invalid response.",
        502,
      );
    }

    return NextResponse.json(updatedSupplier, {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error("Update supplier request failed:", error);

    return errorResponse(
      "Unable to connect to the suppliers service.",
      502,
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  const origin = request.headers.get("origin");

  if (origin && origin !== request.nextUrl.origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  const id = await getRouteId(context);

  if (!id) {
    return errorResponse("A valid supplier ID is required.", 400);
  }

  const accessToken =
    request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!accessToken) {
    return errorResponse("Authentication is required.", 401);
  }

  const backendUrl = getBackendUrl(id, true);

  if (!backendUrl) {
    return errorResponse("Suppliers service is not configured.", 500);
  }

  try {
    const backendResponse = await fetch(backendUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (backendResponse.status === 401) {
      return expiredSessionResponse();
    }

    if (backendResponse.status === 403) {
      return errorResponse(
        "You do not have permission to deactivate suppliers.",
        403,
      );
    }

    if (backendResponse.status === 404) {
      return errorResponse("Supplier not found.", 404);
    }

    if (!backendResponse.ok) {
      console.error(
        "Backend supplier deactivation failed:",
        backendResponse.status,
      );

      return errorResponse(
        "Unable to deactivate the supplier right now.",
        502,
      );
    }

    return new NextResponse(null, {
      status: 204,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error("Deactivate supplier request failed:", error);

    return errorResponse(
      "Unable to connect to the suppliers service.",
      502,
    );
  }
}