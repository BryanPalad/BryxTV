import { handleProgress } from "@/features/history/handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => handleProgress(request);
export const PUT = (request: Request) => handleProgress(request);
export const DELETE = (request: Request) => handleProgress(request);
