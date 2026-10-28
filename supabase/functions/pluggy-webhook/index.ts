import { createClient } from "jsr:@supabase/supabase-js@2";
import { syncItem } from "../_shared/sync.ts";

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const SYNC_EVENTS = new Set([
  "item/created",
  "item/updated",
  "item/login_succeeded",
  "transactions/created",
  "transactions/updated",
]);

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const expected = Deno.env.get("PLUGGY_WEBHOOK_TOKEN");
  if (!expected || url.searchParams.get("token") !== expected) return new Response("forbidden", { status: 403 });
  if (req.method !== "POST") return new Response("ok");

  const body = await req.json().catch(() => null);
  const event = String(body?.event ?? "");
  const itemId = body?.itemId ?? body?.item?.id;
  if (!itemId) return new Response("ok");

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  if (event === "item/deleted") {
    EdgeRuntime.waitUntil(admin.from("pluggy_items").delete().eq("id", itemId).then(() => undefined));
    return new Response("ok");
  }

  if (event === "item/error") {
    EdgeRuntime.waitUntil(
      admin.from("pluggy_items").update({ status: "LOGIN_ERROR", updated_at: new Date().toISOString() }).eq("id", itemId).then(() => undefined),
    );
    return new Response("ok");
  }

  if (SYNC_EVENTS.has(event)) {
    EdgeRuntime.waitUntil(syncItem(admin, itemId).catch((e) => console.error(e)));
  }
  return new Response("ok");
});
