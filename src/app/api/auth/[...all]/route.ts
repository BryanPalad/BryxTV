import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth/server";
export const runtime = "nodejs";
async function handle(request: Request) {
  try {
    const handlers = toNextJsHandler(getAuth());
    const response = await (request.method === "GET"
      ? handlers.GET(request)
      : handlers.POST(request));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return Response.json(
      { message: "Authentication is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export const GET = handle;
export const POST = handle;
