import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { pluggy } from "./pluggy.ts";
import { classifyLocal, classifyWithAI, isIgnored } from "./classify.ts";
 
const DAY = 86_400_000;
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
 
type Row = {
  id: string;
  user_id: string;
  item_id: string;
  account_id: string;
  date: string;
  description: string;
  amount: number;
  category: string | null;
  pluggy_category: string | null;
  ai: boolean;
  manual: boolean;
  source: "pluggy";
  raw: unknown;
};
 
export async function loadRules(admin: SupabaseClient, userId: string): Promise<Record<string, string>> {
  const { data } = await admin.from("settings").select("data").eq("user_id", userId).maybeSingle();
  return (data?.data?.rules ?? {}) as Record<string, string>;
}
 
function nextPath(res: any, accountId: string): string | null {
  const raw = res?.next ?? res?.nextCursor ?? res?.cursor ?? res?.pagination?.next ?? res?.pagination?.nextCursor ?? null;
  if (typeof raw !== "string" || !raw) return null;
  if (raw.startsWith("http")) {
    const u = new URL(raw);
    return u.pathname + u.search;
  }
  if (raw.startsWith("/")) return raw;
  return `/v2/transactions?${new URLSearchParams({ accountId, cursor: raw })}`;
}
 
async function fetchTransactions(accountId: string, from: string): Promise<any[]> {
  const out: any[] = [];
  const seen = new Set<string>();
  let path: string | null = `/v2/transactions?${new URLSearchParams({ accountId })}`;
  for (let i = 0; i < 200 && path; i++) {
    const res = await pluggy<any>(path);
    out.push(...(res?.results ?? []).filter((t: any) => String(t?.date ?? "").slice(0, 10) >= from));
    const next = nextPath(res, accountId);
    if (!next || seen.has(next)) break;
    seen.add(next);
    path = next;
  }
  return out;
}
 
const num = (v: unknown): number | null => {
  const n = Number(v);
  return v === null || v === undefined || v === "" || !Number.isFinite(n) ? null : n;
};
const day = (v: unknown): string | null => (v ? String(v).slice(0, 10) : null);

async function syncAccounts(admin: SupabaseClient, userId: string, itemId: string, accounts: any[]) {
  const stamp = new Date().toISOString();
  const rows = accounts.map((a) => ({
    id: a.id,
    user_id: userId,
    item_id: itemId,
    name: a.name ?? a.marketingName ?? null,
    type: a.type ?? null,
    subtype: a.subtype ?? null,
    number: a.number ?? null,
    balance: num(a.balance),
    currency: a.currencyCode ?? null,
    credit_limit: num(a.creditData?.creditLimit),
    available_credit: num(a.creditData?.availableCreditLimit),
    minimum_payment: num(a.creditData?.minimumPayment),
    close_date: day(a.creditData?.balanceCloseDate),
    due_date: day(a.creditData?.balanceDueDate),
    brand: a.creditData?.brand ?? null,
    raw: a,
    updated_at: stamp,
  }));
  if (rows.length) {
    const { error } = await admin.from("pluggy_accounts").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }
}

async function syncBills(admin: SupabaseClient, userId: string, itemId: string, accounts: any[]) {
  const stamp = new Date().toISOString();
  for (const account of accounts.filter((a) => a.type === "CREDIT")) {
    const res = await pluggy<any>(`/bills?${new URLSearchParams({ accountId: account.id })}`);
    const rows = (res?.results ?? []).map((b: any) => ({
      id: `b_${b.id}`,
      user_id: userId,
      item_id: itemId,
      account_id: account.id,
      due_date: day(b.dueDate),
      total: num(b.totalAmount),
      minimum_payment: num(b.minimumPaymentAmount),
      currency: b.totalAmountCurrencyCode ?? null,
      raw: b,
      updated_at: stamp,
    }));
    if (rows.length) {
      const { error } = await admin.from("pluggy_bills").upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }
  }
}

async function syncInvestmentTransactions(admin: SupabaseClient, userId: string, itemId: string, investmentId: string, pluggyId: string) {
  const stamp = new Date().toISOString();
  const all: any[] = [];
  let page = 1;
  for (let i = 0; i < 20; i++) {
    const res = await pluggy<any>(`/investments/${encodeURIComponent(pluggyId)}/transactions?${new URLSearchParams({ pageSize: "500", page: String(page) })}`);
    all.push(...(res?.results ?? []));
    if (!res?.totalPages || page >= res.totalPages) break;
    page++;
  }
  const rows = all.map((t) => ({
    id: `vt_${t.id}`,
    user_id: userId,
    item_id: itemId,
    investment_id: investmentId,
    type: t.type ?? null,
    movement_type: t.movementType ?? null,
    date: day(t.date),
    trade_date: day(t.tradeDate),
    description: t.description ?? null,
    quantity: num(t.quantity),
    unit_value: num(t.value),
    amount: num(t.amount),
    net_amount: num(t.netAmount),
    raw: t,
    updated_at: stamp,
  }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin.from("pluggy_investment_transactions").upsert(rows.slice(i, i + 500), { onConflict: "id" });
    if (error) throw error;
  }
}

async function syncInvestments(admin: SupabaseClient, userId: string, itemId: string) {
  const stamp = new Date().toISOString();
  const all: any[] = [];
  let page = 1;
  for (let i = 0; i < 20; i++) {
    const res = await pluggy<any>(`/investments?${new URLSearchParams({ itemId, pageSize: "500", page: String(page) })}`);
    all.push(...(res?.results ?? []));
    if (!res?.totalPages || page >= res.totalPages) break;
    page++;
  }
  const rows = all.map((v) => ({
    id: `v_${v.id}`,
    user_id: userId,
    item_id: itemId,
    name: v.name ?? null,
    type: v.type ?? null,
    subtype: v.subtype ?? null,
    issuer: v.issuer ?? v.institution?.name ?? null,
    balance: num(v.balance),
    amount_original: num(v.amountOriginal),
    amount_profit: num(v.amountProfit),
    amount_withdrawal: num(v.amountWithdrawal),
    quantity: num(v.quantity),
    unit_value: num(v.value),
    annual_rate: num(v.annualRate),
    last_month_rate: num(v.lastMonthRate),
    last_twelve_months_rate: num(v.lastTwelveMonthsRate),
    due_date: day(v.dueDate),
    status: v.status ?? null,
    currency: v.currencyCode ?? null,
    raw: v,
    updated_at: stamp,
  }));
  if (rows.length) {
    const { error } = await admin.from("pluggy_investments").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }
  for (const v of all) {
    try {
      await syncInvestmentTransactions(admin, userId, itemId, `v_${v.id}`, v.id);
    } catch (e) {
      console.error(e);
    }
  }
  const keep = rows.map((r) => r.id);
  const del = admin.from("pluggy_investments").delete().eq("item_id", itemId);
  const { error } = keep.length ? await del.not("id", "in", `(${keep.map((k) => `"${k}"`).join(",")})`) : await del;
  if (error) throw error;
}

export async function syncItem(admin: SupabaseClient, itemId: string): Promise<{ inserted: number }> {
  const { data: item, error } = await admin.from("pluggy_items").select("*").eq("id", itemId).maybeSingle();
  if (error) throw error;
  if (!item) return { inserted: 0 };
 
  const info = await pluggy<any>(`/items/${encodeURIComponent(itemId)}`);
  const { count: missingRaw } = await admin
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("item_id", itemId)
    .eq("source", "pluggy")
    .is("raw", null);
  const since = item.last_sync_at && !missingRaw
    ? new Date(new Date(item.last_sync_at).getTime() - 10 * DAY)
    : new Date(Date.now() - 90 * DAY);
 
  const accounts = (await pluggy<any>(`/accounts?itemId=${encodeURIComponent(itemId)}`))?.results ?? [];
  const rows: Row[] = [];

  for (const step of [
    () => syncAccounts(admin, item.user_id, itemId, accounts),
    () => syncBills(admin, item.user_id, itemId, accounts),
    () => syncInvestments(admin, item.user_id, itemId),
  ]) {
    try {
      await step();
    } catch (e) {
      console.error(e);
    }
  }

  for (const account of accounts) {
    for (const t of await fetchTransactions(account.id, isoDate(since))) {
      const amount = Math.abs(Number(t.amount));
      if (t.type !== "DEBIT" || !amount) {
        if (account.type === "CREDIT" && amount) console.log("fora do cartão (não é DEBIT)", JSON.stringify({ type: t.type, description: t.description, amount, date: String(t.date).slice(0, 10) }));
        continue;
      }
      const description = String(t.description ?? t.descriptionRaw ?? "Sem descrição").trim();
      const pluggyCategory = t.category ?? null;
      if (account.type !== "CREDIT" && isIgnored(description, pluggyCategory)) continue;
      rows.push({
        id: `p_${t.id}`,
        user_id: item.user_id,
        item_id: itemId,
        account_id: account.id,
        date: String(t.date).slice(0, 10),
        description,
        amount: Math.round(amount * 100) / 100,
        category: null,
        pluggy_category: pluggyCategory,
        ai: false,
        manual: false,
        source: "pluggy",
        raw: t,
      });
    }
  }
 
  const existing = new Set<string>();
  const needRaw = new Set<string>();
  for (let i = 0; i < rows.length; i += 300) {
    const ids = rows.slice(i, i + 300).map((r) => r.id);
    const { data, error: selError } = await admin.from("transactions").select("id, raw").in("id", ids);
    if (selError) throw selError;
    for (const d of data ?? []) {
      existing.add(d.id);
      if (d.raw === null) needRaw.add(d.id);
    }
  }
  for (const r of rows.filter((x) => needRaw.has(x.id))) {
    await admin.from("transactions").update({ raw: r.raw }).eq("id", r.id);
  }
 
  const fresh = rows.filter((r) => !existing.has(r.id));
  if (fresh.length) {
    const rules = await loadRules(admin, item.user_id);
    for (const r of fresh) r.category = classifyLocal(r.description, r.pluggy_category, rules);
    try {
      await classifyWithAI(fresh.filter((r) => !r.category));
    } catch (e) {
      console.error(e);
    }
    for (let i = 0; i < fresh.length; i += 500) {
      const { error: insError } = await admin
        .from("transactions")
        .upsert(fresh.slice(i, i + 500), { onConflict: "id", ignoreDuplicates: true });
      if (insError) throw insError;
    }
  }
 
  const now = new Date().toISOString();
  await admin
    .from("pluggy_items")
    .update({
      status: info?.status ?? item.status,
      connector_name: info?.connector?.name ?? item.connector_name,
      last_sync_at: now,
      updated_at: now,
    })
    .eq("id", itemId);
 
  return { inserted: fresh.length };
}