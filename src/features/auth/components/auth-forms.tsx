"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import {
  registrationSchema,
  loginSchema,
  type RegistrationValues,
  type LoginValues,
} from "@/lib/auth/validation";
import { authErrorMessage } from "@/lib/auth/errors";
import { safeReturnTo } from "@/lib/auth/redirect";
import { PasswordInput } from "./password-input";
const subscribe = () => () => {};
const readyOnClient = () => true;
const pendingOnServer = () => false;
function FieldError({
  id,
  message,
}: {
  id: string;
  message: string | undefined;
}) {
  return message ? (
    <p id={id} className="auth-field-error" role="alert">
      {message}
    </p>
  ) : null;
}

export function RegisterForm({ returnTo }: { returnTo: string }) {
  const hydrated = useSyncExternalStore(
    subscribe,
    readyOnClient,
    pendingOnServer,
  );
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });
  const busy = isSubmitting || isNavigating;
  async function submit(values: RegistrationValues) {
    setError(null);
    try {
      const result = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      if (result.error) {
        setError(authErrorMessage("register", result.error.status));
        return;
      }
      startNavigation(() => {
        router.replace(
          `/login?registered=1&returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`,
          { transitionTypes: ["auth"] },
        );
      });
    } catch {
      setError(authErrorMessage("register"));
    }
  }
  return (
    <form
      className="auth-form"
      method="post"
      noValidate
      onSubmit={handleSubmit(submit)}
      aria-busy={busy}
    >
      {error && (
        <p className="auth-message error" role="alert">
          {error}
        </p>
      )}
      <fieldset disabled={!hydrated || busy}>
        <div className="auth-field">
          <label htmlFor="name">Display name</label>
          <input
            id="name"
            autoComplete="name"
            maxLength={60}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
            {...register("name")}
          />
          <FieldError id="name-error" message={errors.name?.message} />
        </div>
        <div className="auth-field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          <FieldError id="email-error" message={errors.email?.message} />
        </div>
        <div className="auth-field">
          <label htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            fieldLabel="Password"
            autoComplete="new-password"
            maxLength={128}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-help password-error" : "password-help"}
            {...register("password")}
          />
          <small id="password-help">
            Use 12–128 characters. A unique passphrase works well.
          </small>
          <FieldError id="password-error" message={errors.password?.message} />
        </div>
        <div className="auth-field">
          <label htmlFor="confirm-password">Confirm password</label>
          <PasswordInput
            id="confirm-password"
            fieldLabel="Confirm password"
            autoComplete="new-password"
            maxLength={128}
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={
              errors.confirmPassword ? "confirm-error" : undefined
            }
            {...register("confirmPassword")}
          />
          <FieldError
            id="confirm-error"
            message={errors.confirmPassword?.message}
          />
        </div>
        <Button type="submit" className="auth-submit">
          {busy && (
            <LoaderCircle
              className="auth-spinner"
              size={18}
              aria-hidden="true"
            />
          )}
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </fieldset>
      <noscript>
        <p className="auth-message">
          Enable JavaScript to use this secure sign-in form.
        </p>
      </noscript>
      <p className="auth-switch">
        Already have an account?{" "}
        <Link
          href={`/login?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`}
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function LoginForm({
  returnTo,
  registered,
}: {
  returnTo: string;
  registered: boolean;
}) {
  const hydrated = useSyncExternalStore(
    subscribe,
    readyOnClient,
    pendingOnServer,
  );
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  });
  const busy = isSubmitting || isNavigating;
  async function submit(values: LoginValues) {
    setError(null);
    try {
      const result = await authClient.signIn.email(values);
      if (result.error) {
        setError(authErrorMessage("login", result.error.status));
        return;
      }
      startNavigation(() => {
        router.replace(safeReturnTo(returnTo), { transitionTypes: ["auth"] });
      });
    } catch {
      setError(authErrorMessage("login"));
    }
  }
  return (
    <form
      className="auth-form"
      method="post"
      noValidate
      onSubmit={handleSubmit(submit)}
      aria-busy={busy}
    >
      {registered && (
        <p className="auth-message" role="status">
          Registration received. You can now try signing in. If you already
          registered with that email, use your existing password.
        </p>
      )}
      {error && (
        <p className="auth-message error" role="alert">
          {error}
        </p>
      )}
      <fieldset disabled={!hydrated || busy}>
        <div className="auth-field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            maxLength={254}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          <FieldError id="email-error" message={errors.email?.message} />
        </div>
        <div className="auth-field">
          <label htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            fieldLabel="Password"
            autoComplete="current-password"
            maxLength={128}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          <FieldError id="password-error" message={errors.password?.message} />
        </div>
        <label className="auth-remember">
          <input type="checkbox" {...register("rememberMe")} /> Remember me on
          this device
        </label>
        <Button type="submit" className="auth-submit">
          {busy && (
            <LoaderCircle
              className="auth-spinner"
              size={18}
              aria-hidden="true"
            />
          )}
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </fieldset>
      <noscript>
        <p className="auth-message">
          Enable JavaScript to use this secure sign-in form.
        </p>
      </noscript>
      <p className="auth-switch">
        New to BryxTV?{" "}
        <Link
          href={`/register?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`}
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
