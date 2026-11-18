import { NextResponse, type NextRequest } from "next/server";
import { familyStaging, familySessionAllowed, familyAllowlist } from "./lib/auth/family-policy";
import { getAuth } from "./lib/auth/server";

/** Additional application gate; never a replacement for Vercel protection. */
export async function proxy(request: NextRequest) {
  if (!familyStaging()) return NextResponse.next();
  const path = request.nextUrl.pathname;
  try {
    familyAllowlist();
    // Login shell and auth callbacks must be reachable without a BryxTV session.
    // Auth endpoints independently enforce the policy in Better Auth hooks.
    if (["/login", "/register", "/access-denied", "/favicon.ico", "/icon.png", "/apple-icon.png"].includes(path) ||
      path.startsWith("/api/auth/") || path.startsWith("/_next/static/") || path === "/_next/image" || path.startsWith("/branding/"))
      return NextResponse.next();
    const session = await getAuth().api.getSession({ headers: request.headers, query: { disableRefresh: true } });
    if (familySessionAllowed(session)) return NextResponse.next();
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Private preview access denied." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    // Do not preserve arbitrary query strings (including deployment bearer tokens).
    const destination = new URL(session ? "/access-denied" : "/login", request.url);
    if (!session) destination.searchParams.set("returnTo", path);
    return NextResponse.redirect(destination);
  } catch {
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Private preview access denied." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    if (path === "/access-denied") return new NextResponse("Private preview access is unavailable. Contact the owner.", { status: 403, headers: { "Cache-Control": "no-store" } });
    return NextResponse.redirect(new URL("/access-denied", request.url));
  }
}
