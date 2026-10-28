import { createClient } from "jsr:@supabase/supabase-js@2";
import { cors, json } from "../_shared/cors.ts";
import { pluggy } from "../_shared/pluggy.ts";
import { syncItem, loadRules } from "../_shared/sync.ts";
import { classifyLocal, classifyWithAI } from "../_shared/classify.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function allowedEmail(email: string | undefined): boolean {
  const list = (Deno.env.get("ALLOWED_EMAILS") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !list.length || list.includes((email ?? "").toLowerCase());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Sessão inválida. Entre novamente." }, 401);
    if (!allowedEmail(user.email)) return json({ error: "Este e-mail não tem acesso." }, 403);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));

    switch (body.action) {
      case "connect-token": {
        const token = Deno.env.get("PLUGGY_WEBHOOK_TOKEN");
        const options: Record<string, string> = { clientUserId: user.id };
        if (token) options.webhookUrl = `${SUPABASE_URL}/functions/v1/pluggy-webhook?token=${encodeURIComponent(token)}`;
        const payload: Record<string, unknown> = { options };
        if (body.itemId) payload.itemId = body.itemId;
        const res = await pluggy<any>("/connect_token", { method: "POST", body: JSON.stringify(payload) });
        return json({ accessToken: res.accessToken });
      }

      case "item-saved": {
        const itemId = String(body.itemId ?? "");
        if (!itemId) return json({ error: "itemId ausente" }, 400);
        const { data: owned } = await admin.from("pluggy_items").select("user_id").eq("id", itemId).maybeSingle();
        if (owned && owned.user_id !== user.id) return json({ error: "Conexão pertence a outro usuário." }, 403);
        const item = await pluggy<any>(`/items/${encodeURIComponent(itemId)}`);
        if (item?.clientUserId && item.clientUserId !== user.id) return json({ error: "Conexão pertence a outro usuário." }, 403);
        const now = new Date().toISOString();
        const { error } = await admin.from("pluggy_items").upsert({
          id: itemId,
          user_id: user.id,
          connector_name: item?.connector?.name ?? null,
          status: item?.status ?? null,
          updated_at: now,
        });
        if (error) throw error;
        return json(await syncItem(admin, itemId));
      }

      case "sync": {
        const { data: items, error } = await admin.from("pluggy_items").select("id").eq("user_id", user.id);
        if (error) throw error;
        let inserted = 0;
        const failures: string[] = [];
        for (const it of items ?? []) {
          try {
            inserted += (await syncItem(admin, it.id)).inserted;
          } catch (e) {
            console.error(e);
            failures.push(it.id);
          }
        }
        return json({ inserted, failures });
      }

      case "remove-item": {
        const itemId = String(body.itemId ?? "");
        const { data: owned } = await admin.from("pluggy_items").select("user_id").eq("id", itemId).maybeSingle();
        if (!owned || owned.user_id !== user.id) return json({ error: "Conexão não encontrada." }, 404);
        try {
          await pluggy(`/items/${encodeURIComponent(itemId)}`, { method: "DELETE" });
        } catch (e) {
          console.error(e);
        }
        const { error } = await admin.from("pluggy_items").delete().eq("id", itemId);
        if (error) throw error;
        return json({ removed: true });
      }

      case "classify": {
        const { data, error } = await admin
          .from("transactions")
          .select("id, description, amount, pluggy_category")
          .eq("user_id", user.id)
          .is("category", null)
          .limit(500);
        if (error) throw error;
        const rules = await loadRules(admin, user.id);
        const rows = (data ?? []).map((r) => ({
          id: r.id as string,
          description: r.description as string,
          amount: Number(r.amount),
          category: classifyLocal(r.description, r.pluggy_category, rules),
          ai: false,
        }));
        const ai = await classifyWithAI(rows.filter((r) => !r.category));
        const groups = new Map<string, string[]>();
        for (const r of rows) {
          if (!r.category) continue;
          const key = `${r.category}|${r.ai}`;
          groups.set(key, [...(groups.get(key) ?? []), r.id]);
        }
        for (const [key, ids] of groups) {
          const [category, isAi] = key.split("|");
          const { error: upError } = await admin
            .from("transactions")
            .update({ category, ai: isAi === "true" })
            .in("id", ids)
            .eq("user_id", user.id);
          if (upError) throw upError;
        }
        return json({
          pending: rows.length,
          classified: rows.filter((r) => r.category).length,
          aiAvailable: ai.available,
        });
      }

      default:
        return json({ error: "ação desconhecida" }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
