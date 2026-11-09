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

function getBackendUrl(id: string, deactivate = false) {
  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    console.error("API_BASE_URL is not configured.");
    return null;
  }

  const baseUrl = `${apiBaseUrl.replace(/\/$/, "")}/api/stores/${id}`;

  return deactivate ? `${baseUrl}/deactivate` : baseUrl;
}

function isValidStoreId(id: string) {
  const guidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return (
    guidPattern.test(id) &&
    id.toLowerCase() !== "00000000-0000-0000-0000-000000000000"
  );
}

function isValidOptionalText(value: unknown, maxLength: number) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim().length <= maxLength)
  );
}

async function getRouteId(context: RouteContext) {
  const { id } = await context.params;

  return isValidStoreId(id) ? id : null;
}

async function readStoreResponse(response: Response) {
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

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const id = await getRouteId(context);

  if (!id) {
    return errorResponse("A valid store ID is required.", 400);
  }

  const accessToken =
    request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!accessToken) {
    return errorResponse("Authentication is required.", 401);
  }

  const backendUrl = getBackendUrl(id);

  if (!backendUrl) {
    return errorResponse("Stores service is not configured.", 500);
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
        "You do not have permission to view this store.",
        403,
      );
    }

    if (backendResponse.status === 404) {
      return errorResponse("Store not found.", 404);
    }

    if (!backendResponse.ok) {
      console.error(
        "Backend store retrieval failed:",
        backendResponse.status,
      );

      return errorResponse(
        "Unable to retrieve the store right now.",
        502,
      );
    }

    const store = await readStoreResponse(backendResponse);

    if (!store) {
      return errorResponse(
        "The stores service returned an invalid response.",
        502,
      );
    }

    return NextResponse.json(store, {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error("Get store request failed:", error);

    return errorResponse(
      "Unable to connect to the stores service.",
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
    return errorResponse("A valid store ID is required.", 400);
  }

  const accessToken =
    request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!accessToken) {
    return errorResponse("Authentication is required.", 401);
  }

  const backendUrl = getBackendUrl(id);

  if (!backendUrl) {
    return errorResponse("Stores service is not configured.", 500);
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
      "A valid store request is required.",
      400,
    );
  }

  const store = body as Record<string, unknown>;

  const code = store.code;
  const name = store.name;
  const address = store.address;
  const city = store.city;
  const isActive = store.isActive;

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

  if (!isValidOptionalText(address, 250)) {
    return errorResponse(
      "Store address must not exceed 250 characters.",
      400,
    );
  }

  if (!isValidOptionalText(city, 100)) {
    return errorResponse(
      "Store city must not exceed 100 characters.",
      400,
    );
  }

  if (typeof isActive !== "boolean") {
    return errorResponse(
      "Store active status must be true or false.",
      400,
    );
  }

  const storeRequest = {
    code: code.trim(),
    name: name.trim(),
    address:
      typeof address === "string"
        ? address.trim() || null
        : null,
    city:
      typeof city === "string"
        ? city.trim() || null
        : null,
    isActive,
  };

  try {
    const backendResponse = await fetch(backendUrl, {
      method: "PUT",
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
        "You do not have permission to update stores.",
        403,
      );
    }

    if (backendResponse.status === 404) {
      return errorResponse("Store not found.", 404);
    }

    if (backendResponse.status === 400) {
      const errorData = (await backendResponse.json().catch(
        () => null,
      )) as { message?: string } | null;

      return errorResponse(
        errorData?.message ?? "The store information is invalid.",
        400,
      );
    }

    if (backendResponse.status === 409) {
      const errorData = (await backendResponse.json().catch(
        () => null,
      )) as { message?: string } | null;

      return errorResponse(
        errorData?.message ??
          "The store could not be updated due to a conflict.",
        409,
      );
    }

    if (!backendResponse.ok) {
      console.error(
        "Backend store update failed:",
        backendResponse.status,
      );

      return errorResponse(
        "Unable to update the store right now.",
        502,
      );
    }

    const updatedStore = await readStoreResponse(backendResponse);

    if (!updatedStore) {
      return errorResponse(
        "The stores service returned an invalid response.",
        502,
      );
    }

    return NextResponse.json(updatedStore, {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error("Update store request failed:", error);

    return errorResponse(
      "Unable to connect to the stores service.",
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
    return errorResponse("A valid store ID is required.", 400);
  }

  const accessToken =
    request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!accessToken) {
    return errorResponse("Authentication is required.", 401);
  }

  const backendUrl = getBackendUrl(id, true);

  if (!backendUrl) {
    return errorResponse("Stores service is not configured.", 500);
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
        "You do not have permission to deactivate stores.",
        403,
      );
    }

    if (backendResponse.status === 404) {
      return errorResponse("Store not found.", 404);
    }

    if (!backendResponse.ok) {
      console.error(
        "Backend store deactivation failed:",
        backendResponse.status,
      );

      return errorResponse(
        "Unable to deactivate the store right now.",
        502,
      );
    }

    return new NextResponse(null, {
      status: 204,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error("Deactivate store request failed:", error);

    return errorResponse(
      "Unable to connect to the stores service.",
      502,
    );
  }
}