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

function getBackendUrl() {
  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    console.error("API_BASE_URL is not configured.");
    return null;
  }

  return `${apiBaseUrl.replace(/\/$/, "")}/api/stores`;
}

function expiredSessionResponse() {
  const response = errorResponse(
    "Your session is invalid or has expired.",
    401,
  );

  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(
    SESSION_COOKIE_NAME,
  )?.value;

  if (!accessToken) {
    return errorResponse("Authentication is required.", 401);
  }

  const backendUrl = getBackendUrl();

  if (!backendUrl) {
    return errorResponse("Stores service is not configured.", 500);
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
        "You do not have permission to view stores.",
        403,
      );
    }

    if (!backendResponse.ok) {
      console.error(
        "Backend stores request failed:",
        backendResponse.status,
      );

      return errorResponse(
        "Unable to retrieve stores right now.",
        502,
      );
    }

    const stores: unknown = await backendResponse.json();

    if (!Array.isArray(stores)) {
      return errorResponse(
        "The stores service returned an invalid response.",
        502,
      );
    }

    return NextResponse.json(stores, {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error("Stores API request failed:", error);

    return errorResponse(
      "Unable to connect to the stores service.",
      502,
    );
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin && origin !== request.nextUrl.origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  const accessToken = request.cookies.get(
    SESSION_COOKIE_NAME,
  )?.value;

  if (!accessToken) {
    return errorResponse("Authentication is required.", 401);
  }

  const backendUrl = getBackendUrl();

  if (!backendUrl) {
    return errorResponse("Stores service is not configured.", 500);
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
      "A valid store request is required.",
      400,
    );
  }

  const store = body as Record<string, unknown>;

  const code = store.code;
  const name = store.name;
  const address = store.address;
  const city = store.city;

  if (
    typeof code !== "string" ||
    code.trim().length < 2 ||
    code.trim().length > 30
  ) {
    return errorResponse(
      "Store code must contain between 2 and 30 characters.",
      400,
    );
  }

  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 150
  ) {
    return errorResponse(
      "Store name must contain between 2 and 150 characters.",
      400,
    );
  }

  if (
    address !== undefined &&
    address !== null &&
    (typeof address !== "string" || address.trim().length > 250)
  ) {
    return errorResponse(
      "Store address must not exceed 250 characters.",
      400,
    );
  }

  if (
    city !== undefined &&
    city !== null &&
    (typeof city !== "string" || city.trim().length > 100)
  ) {
    return errorResponse(
      "Store city must not exceed 100 characters.",
      400,
    );
  }

  const storeRequest = {
    code: code.trim(),
    name: name.trim(),
    address:
      typeof address === "string" ? address.trim() || null : null,
    city: typeof city === "string" ? city.trim() || null : null,
  };

  try {
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(storeRequest),
      cache: "no-store",
    });

    if (backendResponse.status === 401) {
      return expiredSessionResponse();
    }

    if (backendResponse.status === 403) {
      return errorResponse(
        "You do not have permission to create stores.",
        403,
      );
    }

    if (backendResponse.status === 400) {
      return errorResponse(
        "The store information is invalid.",
        400,
      );
    }

    if (backendResponse.status === 409) {
      const errorData = (await backendResponse.json().catch(
        () => null,
      )) as { message?: string } | null;

      return errorResponse(
        errorData?.message ??
          "A store with this code already exists.",
        409,
      );
    }

    if (!backendResponse.ok) {
      console.error(
        "Backend store creation failed:",
        backendResponse.status,
      );

      return errorResponse(
        "Unable to create the store right now.",
        502,
      );
    }

    const createdStore: unknown = await backendResponse.json();

    if (
      typeof createdStore !== "object" ||
      createdStore === null ||
      Array.isArray(createdStore) ||
      typeof (createdStore as Record<string, unknown>).id !==
        "string"
    ) {
      return errorResponse(
        "The stores service returned an invalid response.",
        502,
      );
    }

    return NextResponse.json(createdStore, {
      status: 201,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error("Create store request failed:", error);

    return errorResponse(
      "Unable to connect to the stores service.",
      502,
    );
  }
}