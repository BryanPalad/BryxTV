"use client";
import { createAuthClient } from "better-auth/react";
// Same-origin requests: no secrets, storage tokens, or public environment URLs.
export const authClient = createAuthClient();
