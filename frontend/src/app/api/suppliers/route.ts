import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "kcstorecore_session";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
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

function getBackendUrl() {
  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    console.error("API_BASE_URL is not configured.");
    return null;
  }

  return `${apiBaseUrl.replace(/\/$/, "")}/api/suppliers`;
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string"
    ? value.trim() || null
    : null;
}

function validateSupplier(body: unknown) {
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
    },
  };
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

export async function GET(request: NextRequest) {
  const accessToken =
    request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!accessToken) {
    return errorResponse("Authentication is required.", 401);
  }

  const backendUrl = getBackendUrl();

  if (!backendUrl) {
    return errorResponse("Suppliers service is not configured.", 500);
  }

  const includeInactive = request.nextUrl.searchParams.get(
    "includeInactive",
  );

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

  const url = new URL(backendUrl);

  if (includeInactive !== null) {
    url.searchParams.set("includeInactive", includeInactive);
  }

  try {
    const backendResponse = await fetch(url.toString(), {
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
        "You do not have permission to view suppliers.",
        403,
      );
    }

    if (!backendResponse.ok) {
      console.error(
        "Backend suppliers request failed:",
        backendResponse.status,
      );

      return errorResponse(
        "Unable to retrieve suppliers right now.",
        502,
      );
    }

    const suppliers: unknown = await backendResponse.json();

    if (!Array.isArray(suppliers)) {
      return errorResponse(
        "The suppliers service returned an invalid response.",
        502,
      );
    }

    return NextResponse.json(suppliers, {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error("Suppliers API request failed:", error);

    return errorResponse(
      "Unable to connect to the suppliers service.",
      502,
    );
  }
}

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

  const backendUrl = getBackendUrl();

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

  const validation = validateSupplier(body);

  if (validation.error || !validation.data) {
    return errorResponse(
      validation.error ?? "Invalid supplier information.",
      400,
    );
  }

  try {
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
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
        "You do not have permission to create suppliers.",
        403,
      );
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
          "The supplier could not be created due to a conflict.",
        ),
        409,
      );
    }

    if (!backendResponse.ok) {
      console.error(
        "Backend supplier creation failed:",
        backendResponse.status,
      );

      return errorResponse(
        "Unable to create the supplier right now.",
        502,
      );
    }

    const createdSupplier: unknown = await backendResponse.json();

    if (
      typeof createdSupplier !== "object" ||
      createdSupplier === null ||
      Array.isArray(createdSupplier) ||
      typeof (createdSupplier as Record<string, unknown>).id !==
        "string"
    ) {
      return errorResponse(
        "The suppliers service returned an invalid response.",
        502,
      );
    }

    return NextResponse.json(createdSupplier, {
      status: 201,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error("Create supplier request failed:", error);

    return errorResponse(
      "Unable to connect to the suppliers service.",
      502,
    );
  }
}