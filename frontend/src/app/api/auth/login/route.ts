import { NextRequest, NextResponse } from "next/server";

type LoginRequest = {
  email: string;
  password: string;
};

type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresAtUtc: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginRequest;

    if (
      typeof body.email !== "string" ||
      typeof body.password !== "string" ||
      !body.email.trim() ||
      !body.password
    ) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 },
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

    const backendResponse = await fetch(
      `${apiBaseUrl}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: body.email.trim(),
          password: body.password,
        }),
        cache: "no-store",
      },
    );

    if (!backendResponse.ok) {
      if (backendResponse.status === 400) {
        return NextResponse.json(
          { message: "Please provide a valid email and password." },
          { status: 400 },
        );
      }

      if (backendResponse.status === 401) {
        return NextResponse.json(
          { message: "Invalid email or password." },
          { status: 401 },
        );
      }

      console.error(
        "Backend authentication failed:",
        backendResponse.status,
      );

      return NextResponse.json(
        { message: "Authentication is temporarily unavailable." },
        { status: 502 },
      );
    }

    const loginData =
      (await backendResponse.json()) as LoginResponse;

    if (!loginData.accessToken || !loginData.expiresAtUtc) {
      console.error("Backend returned an invalid login response.");

      return NextResponse.json(
        { message: "Invalid authentication response." },
        { status: 502 },
      );
    }

    const expiresAt = new Date(loginData.expiresAtUtc);
    const maxAge = Math.floor(
      (expiresAt.getTime() - Date.now()) / 1000,
    );

    if (!Number.isFinite(maxAge) || maxAge <= 0) {
      return NextResponse.json(
        { message: "The authentication token has expired." },
        { status: 502 },
      );
    }

    const response = NextResponse.json(
      {
        user: {
          userId: loginData.userId,
          email: loginData.email,
          firstName: loginData.firstName,
          lastName: loginData.lastName,
          roles: loginData.roles,
        },
      },
      { status: 200 },
    );

    response.cookies.set("kcstorecore_session", loginData.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    return response;
  } catch (error) {
    console.error("Login request failed:", error);

    return NextResponse.json(
      { message: "Unable to process the login request." },
      { status: 500 },
    );
  }
}