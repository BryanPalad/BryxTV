import { syncGoogleAvatar } from "./google-avatar";
import type { BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware } from "better-auth/api";
import {
  loginSchema,
  displayNameSchema,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from "./validation";

// Google's built-in scopes are only openid, email, and profile.
export const googleProviderOptions = {
  includeGrantedScopes: false,
  accessType: "online" as const,
};

// Shared schema-affecting policy; no credentials or database client in this module.
export const authOptions = {
  appName: "BryxTV",
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: false,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    maxPasswordLength: MAX_PASSWORD_LENGTH,
  },
  user: {
    validateUserInfo: ({ user, source }) => {
      // Validate the fresh Google claim on every OAuth sign-in, including
      // accounts explicitly linked by an authenticated password user.
      if (source.method === "oauth" && source.oauth?.providerId === "google" && user.emailVerified !== true)
        return { error: "email_not_verified" };
    },
  },
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      // Never bypass provider email verification. Better Auth 1.7.12 also
      // requires the existing local email to be verified before implicit linking.
      trustedProviders: [],
      allowDifferentEmails: false,
      updateUserInfoOnLink: false,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        const name = displayNameSchema.safeParse(ctx.body?.name);
        if (!name.success)
          throw new APIError("BAD_REQUEST", {
            message: "Enter a valid display name.",
          });
        // Normalize before either the real or synthetic duplicate response.
        return { context: { ...ctx, body: { ...ctx.body, name: name.data } } };
      }
      if (ctx.path === "/sign-in/email") {
        const credentials = loginSchema.safeParse({
          ...ctx.body,
          rememberMe: ctx.body?.rememberMe ?? true,
        });
        if (!credentials.success)
          throw new APIError("BAD_REQUEST", {
            message: "Enter valid sign-in details.",
          });
        return {
          context: { ...ctx, body: { ...ctx.body, ...credentials.data } },
        };
      }
    }),
  },
  databaseHooks: {
    account: {
      create: { after: syncGoogleAvatar },
      update: { after: syncGoogleAvatar },
    },
    user: {
      create: {
        before: async (user) => {
          const parsed = displayNameSchema.safeParse(user.name);
          if (!parsed.success)
            throw new APIError("BAD_REQUEST", {
              message: "Enter a valid display name.",
            });
          return { data: { ...user, name: parsed.data } };
        },
      },
    },
  },
  logger: { disabled: true },
  plugins: [nextCookies()],
} satisfies BetterAuthOptions;
