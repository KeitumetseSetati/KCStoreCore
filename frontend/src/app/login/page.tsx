
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message ?? "Unable to sign in.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand">
          <span className="login-brand-mark">KC</span>

          <div>
            <div className="login-brand-name">KCStoreCore</div>

            <div className="login-brand-caption">
              INVENTORY MANAGEMENT PLATFORM
            </div>
          </div>
        </div>

        <div className="login-brand-content">
          <div className="login-brand-eyebrow">
            SMARTER INVENTORY OPERATIONS
          </div>

          <h1>
            Take control of your
            <span> inventory.</span>
          </h1>

          <p>
            Manage products, monitor stock levels, track purchase
            orders and keep your operations connected in one
            powerful workspace.
          </p>

          <div className="login-feature-list">
            <div>✓ Real-time inventory visibility</div>
            <div>✓ Centralized product management</div>
            <div>✓ Secure role-based access</div>
          </div>
        </div>

        <div className="login-brand-footer">
          KCStoreCore · Inventory Management System
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-container">
          <div className="login-form-heading">
            <div className="login-form-eyebrow">
              WELCOME BACK
            </div>

            <h2>Sign in to your account</h2>

            <p>
              Enter your credentials to access your inventory
              management workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="email">
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">
                Password
              </label>

              <div className="login-password-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                  }}
                  required
                  disabled={isSubmitting}
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => {
                    setShowPassword((previous) => !previous);
                  }}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  aria-pressed={showPassword}
                  disabled={isSubmitting}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Signing in..."
                : "Sign in"}
            </button>
          </form>

          <div className="login-security-note">
            <span aria-hidden="true">🔒</span>

            <span>
              Secure access powered by KCStoreCore
              authentication.
            </span>
          </div>
        </div>

        <div className="login-mobile-footer">
          © 2026 KCStoreCore
        </div>
      </section>
    </main>
  );
}
