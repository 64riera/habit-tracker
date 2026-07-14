import { getCurrentUserId } from "@/lib/auth/session";
import { getPusherServer } from "@/lib/realtime/pusher-server";
import { privateUserChannel } from "@/lib/realtime/channel";

/**
 * Channel authorization endpoint Pusher's client SDK calls before
 * subscribing to a private channel (see lib/realtime/client.tsx's
 * `authEndpoint`). Only ever grants access to the caller's own
 * `private-user-{userId}` channel — there's no scenario where one account
 * should see another's realtime events.
 */
export async function POST(request: Request) {
  const pusher = getPusherServer();
  if (!pusher) return new Response("Not found", { status: 404 });

  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.formData();
  const socketId = String(body.get("socket_id") ?? "");
  const channelName = String(body.get("channel_name") ?? "");
  if (!socketId || channelName !== privateUserChannel(userId)) {
    return new Response("Forbidden", { status: 403 });
  }

  const authResponse = pusher.authorizeChannel(socketId, channelName);
  return Response.json(authResponse);
}
