
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type CurrentUserResponse = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles: string[];
};

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("kcstorecore_session")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { message: "Authentication is required." },
      { status: 401 },
    );
  }

  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    console.error("API_BASE_URL is not configured.");

    return NextResponse.json(
      { message: "Authentication service is not configured." },
      { status: 500 },
    );
  }

  try {
    const backendResponse = await fetch(
      `${apiBaseUrl}/api/auth/me`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (backendResponse.status === 401) {
      const response = NextResponse.json(
        { message: "Your session is invalid or has expired." },
        { status: 401 },
      );

      response.cookies.delete("kcstorecore_session");

      return response;
    }

    if (!backendResponse.ok) {
      console.error(
        "Current-user verification failed:",
        backendResponse.status,
      );

      return NextResponse.json(
        { message: "Unable to verify your session." },
        { status: 502 },
      );
    }

    const currentUser =
      (await backendResponse.json()) as CurrentUserResponse;

    if (!currentUser.isActive) {
      const response = NextResponse.json(
        { message: "This account is inactive." },
        { status: 401 },
      );

      response.cookies.delete("kcstorecore_session");

      return response;
    }

    return NextResponse.json(
      { user: currentUser },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Current-user request failed:", error);

    return NextResponse.json(
      { message: "Unable to connect to the authentication service." },
      { status: 502 },
    );
  }
}
