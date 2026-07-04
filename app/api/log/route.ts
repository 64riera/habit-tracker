import { getRecentLog } from "@/lib/queries/history";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const habitId = url.searchParams.get("habit") ?? undefined;
  const categoryId = url.searchParams.get("category") ?? undefined;
  const offset = Number(url.searchParams.get("offset") ?? "0");

  const log = await getRecentLog(20, { habitId, categoryId }, offset);
  return Response.json({ log });
}
