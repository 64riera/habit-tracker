import { getFocusHistory } from "@/lib/queries/focus";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const habitId = url.searchParams.get("habit") ?? undefined;
  const offset = Number(url.searchParams.get("offset") ?? "0");

  const sessions = await getFocusHistory({ habitId, limit: PAGE_SIZE, offset });
  return Response.json({ sessions });
}
