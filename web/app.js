import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY, PLUGGY_CONNECT_SRC, PLUGGY_SANDBOX } from "./config.js";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const topBar = document.querySelector(".top");
if (topBar) new ResizeObserver(() => document.documentElement.style.setProperty("--top-h", topBar.offsetHeight + "px")).observe(topBar);

const CATS = [
  { id: "mercado", name: "Mercado", color: "#4ADE80" },
  { id: "restaurantes", name: "Alimentação", color: "#FB923C" },
  { id: "transporte", name: "Transporte", color: "#38BDF8" },
  { id: "moradia", name: "Moradia", color: "#A78BFA" },
  { id: "contas", name: "Contas da casa", color: "#FACC15" },
  { id: "saude", name: "Saúde", color: "#F472B6" },
  { id: "lazer", name: "Lazer", color: "#2DD4BF" },
  { id: "compras", name: "Compras", color: "#818CF8" },
  { id: "assinaturas", name: "Assinaturas", color: "#BEF264" },
  { id: "educacao", name: "Educação", color: "#F0ABFC" },
  { id: "outros", name: "Outros", color: "#94A3B8" },
];
const CAT = Object.fromEntries(CATS.map((c) => [c.id, c]));
const DANGER = "#FF4D6D";
const KEYWORDS = [
  [/ mercado ?livre | mercadolivre | amazon | shopee | magalu | magazine | americanas | aliexpress | shein | renner | riachuelo | c&a | zara | centauro | netshoes | kabum | casas bahia /, "compras"],
  [/ ifood | rappi | uber ?eats | restaurante| lanchonete| pizzaria| burger| mcdonald| bk | outback | padaria| cafeteria| starbucks | bar | churrascaria| sushi/, "restaurantes"],
  [/ netflix | spotify | disney| hbo | max | prime video | youtube | apple ?com | icloud | google one | deezer | globoplay | chatgpt | openai | claude | anthropic | github /, "assinaturas"],
  [/ mercado| supermerc| carrefour | assai | atacad| pao de acucar | hortifruti| sacolao | oba | sams club /, "mercado"],
  [/ uber | 99 ?app | 99pop | cabify | posto| shell | ipiranga | petrobras | br mania | combust| estacion| sem parar | conectcar | veloe | metro | onibus | bilhete unico /, "transporte"],
  [/ aluguel | condominio | iptu | imobiliaria/, "moradia"],
  [/ enel | sabesp | copel | cemig | light | energia | agua | comgas | vivo | claro | tim | oi | internet | sanepar | celesc /, "contas"],
  [/ farmacia| drogaria| drogasil | raia | pague menos | panvel | hospital| clinica| laborat| unimed | amil | hapvida | sulamerica | dentista| odonto/, "saude"],
  [/ cinema| cinemark | ingresso| sympla | steam | playstation | xbox | nintendo | hotel| airbnb | booking | decolar | latam | gol | azul /, "lazer"],
  [/ escola| faculdade| universidade| curso| udemy | alura | livraria| mensalidade /, "educacao"],
];
const WAVE = "M-100 0 Q-87.5 -5 -75 0 T-50 0 T-25 0 T0 0 T25 0 T50 0 T75 0 T100 0 T125 0 T150 0 T175 0 T200 0 L200 230 L-100 230 Z";
const XICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const STATUS = {
  UPDATED: ["Atualizado", "ok"],
  UPDATING: ["Atualizando", ""],
  WAITING_USER_INPUT: ["Aguardando sua confirmação", "bad"],
  LOGIN_ERROR: ["Precisa reconectar", "bad"],
  OUTDATED: ["Desatualizado", "bad"],
};

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (v) => fmt.format(Math.round((+v || 0) * 100) / 100);
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9& ]/g, " ").replace(/\s+/g, " ").trim();
const merchantKey = (s) => norm(s).replace(/\d+/g, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 3).join(" ");
const keyOf = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
const shiftKey = (k, n) => { const [y, m] = k.split("-").map(Number); return keyOf(new Date(y, m - 1 + n, 1)); };
const monthRange = (k) => [k + "-01", shiftKey(k, 1) + "-01"];
const monthName = (k) => { const [y, m] = k.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long" }); };
const monthLabel = (k) => { const [y, m] = k.split("-").map(Number); const s = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }); return s.charAt(0).toUpperCase() + s.slice(1); };
const shortMonth = (k) => { const [y, m] = k.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""); };
const compact = (v) => (v >= 1000 ? (v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil" : String(Math.round(v)));
const numVal = (v) => (v ? String(Math.round(v * 100) / 100).replace(".", ",") : "");
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
const defaults = () => ({ income: 0, fixed: [], goals: {}, rules: {}, bankNames: {}, objectives: [] });

function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

function parseMoney(s) {
  s = String(s == null ? "" : s).replace(/[^\d,.\-]/g, "");
  if (!s) return NaN;
  if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{3}$/.test(s)) s = s.replace(/\./g, "");
  return parseFloat(s);
}

function lsGet(k) { try { return JSON.parse(localStorage.getItem("contagotas:" + k)); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem("contagotas:" + k, JSON.stringify(v)); } catch (e) {} }

let user = null;
let S = defaults();
const TX = {};
let items = [];
let accounts = [];
let bills = [];
let IND = null;
let objEdit = null;
let objArmed = null;
let INV = [];
let INVTX = [];
let OFF = [];
let ABAT = {};
let RESERVED = {};
let oMode = "abat";
let oAuto = true;
let lancMode = "gastos";
let abatArmed = null;
let oDraft = {};
let cur = keyOf(new Date());
let tab = "resumo";
let catFilter = null;
let metaMode = lsGet("metaMode") || "garrafas";
let classifying = false;
let syncing = false;
let booting = true;
let loadingData = false;
let connecting = false;
let linking = "";
let pendingCSV = null;
let clearArmed = false;
let removeArmed = null;
let authSent = "";
let channel = null;
let reloadT = null;

function toast(msg, loading) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.toggle("loading", !!loading);
  t.classList.add("show");
  clearTimeout(toast.t);
  if (!loading) toast.t = setTimeout(() => t.classList.remove("show"), 4200);
}

async function api(action, extra = {}) {
  const { data, error } = await sb.functions.invoke("pluggy", { body: { action, ...extra } });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j && j.error) msg = j.error; } catch (e) {}
    throw new Error(msg);
  }
  return data;
}

const fromRow = (r) => ({ id: r.id, date: r.date, desc: r.description, amount: +r.amount, cat: r.category, ai: r.ai, manual: r.manual, src: r.source, item: r.item_id, acc: r.account_id });

async function loadSettings() {
  const { data, error } = await sb.from("settings").select("data").eq("user_id", user.id).maybeSingle();
  if (error) { toast("Não consegui carregar seus ajustes."); return; }
  S = Object.assign(defaults(), (data && data.data) || {});
}

let saveT;
function saveSettings() {
  clearTimeout(saveT);
  saveT = setTimeout(async () => {
    const { error } = await sb.from("settings").upsert({ user_id: user.id, data: S, updated_at: new Date().toISOString() });
    if (error) toast("Não consegui salvar os ajustes.");
  }, 400);
}

async function loadItems() {
  const { data, error } = await sb.from("pluggy_items").select("*").eq("user_id", user.id).order("created_at");
  items = error ? [] : data || [];
  const [a, b] = await Promise.all([
    sb.from("pluggy_accounts").select("*").eq("user_id", user.id).eq("type", "CREDIT"),
    sb.from("pluggy_bills").select("*").eq("user_id", user.id).order("due_date", { ascending: false }),
  ]);
  accounts = a.error ? [] : a.data || [];
  bills = b.error ? [] : b.data || [];
  const [iv, it] = await Promise.all([
    sb.from("pluggy_investments").select("*").eq("user_id", user.id),
    sb.from("pluggy_investment_transactions").select("id,investment_id,type,date,description,amount").eq("user_id", user.id).order("date", { ascending: false }).limit(5000),
  ]);
  INV = iv.error ? [] : (iv.data || []).filter((v) => +v.balance > 0.005);
  INVTX = it.error ? [] : it.data || [];
  const o = await sb.from("offsets").select("*").eq("user_id", user.id).order("date", { ascending: false });
  OFF = o.error ? [] : o.data || [];
  ABAT = {};
  RESERVED = {};
  for (const x of OFF) for (const al of x.allocations || []) {
    const map = x.status === "pending" ? RESERVED : ABAT;
    map[al.tx] = (map[al.tx] || 0) + (+al.amount || 0);
  }
}

const net = (t) => Math.max(Math.round((t.amount - (ABAT[t.id] || 0)) * 100) / 100, 0);

async function loadMonth(k, force) {
  if (TX[k] && !force) return TX[k];
  const [a, b] = monthRange(k);
  const { data, error } = await sb.from("transactions").select("id,date,description,amount,category,ai,manual,source,item_id,account_id").eq("user_id", user.id).gte("date", a).lt("date", b).order("date", { ascending: false });
  if (error) { toast("Não consegui carregar os gastos."); TX[k] = TX[k] || []; return TX[k]; }
  TX[k] = data.map(fromRow);
  return TX[k];
}

async function refresh(force, doRender = true) {
  if (!user) return;
  const keys = [...Array(6)].map((_, i) => shiftKey(cur, i - 5));
  await Promise.all(keys.map((k) => loadMonth(k, force)));
  if (doRender) render();
}

function scheduleReload() {
  clearTimeout(reloadT);
  reloadT = setTimeout(async () => {
    for (const k in TX) delete TX[k];
    await loadItems();
    await refresh(true, tab !== "ajustes");
  }, 900);
}

function totals(k) {
  const by = {};
  let fixed = 0, vari = 0;
  for (const f of S.fixed) {
    const v = +f.amount || 0;
    if (!v || (f.since && k < f.since)) continue;
    const c = CAT[f.cat] ? f.cat : "outros";
    fixed += v;
    by[c] = (by[c] || 0) + v;
  }
  for (const t of TX[k] || []) {
    const v = net(t);
    vari += v;
    const c = CAT[t.cat] ? t.cat : "outros";
    by[c] = (by[c] || 0) + v;
  }
  return { by, fixed, vari, total: fixed + vari };
}

function classifyLocal(desc) {
  const k = merchantKey(desc);
  if (S.rules[k] && CAT[S.rules[k]]) return S.rules[k];
  const t = " " + norm(desc) + " ";
  for (const [re, c] of KEYWORDS) if (re.test(t)) return c;
  return null;
}

function catOptions(sel, emptyLabel) {
  return (emptyLabel != null ? `<option value=""${!sel ? " selected" : ""}>${esc(emptyLabel)}</option>` : "") + CATS.map((c) => `<option value="${c.id}"${c.id === sel ? " selected" : ""}>${esc(c.name)}</option>`).join("");
}

function viewLogin() {
  if (authSent) {
    return `<section class="login card"><h1>Confira seu e-mail</h1><p>Enviamos um link de acesso para <strong>${esc(authSent)}</strong>. Abra o link neste mesmo navegador para entrar.</p><button class="link" data-action="auth-reset">Usar outro e-mail</button></section>`;
  }
  return `<section class="login card"><h1>Conta-gotas</h1><p class="muted">Entre com seu e-mail para acessar seus gastos. Você recebe um link de acesso, sem senha.</p><label class="field"><span>E-mail</span><input id="loginEmail" type="email" autocomplete="email" placeholder="voce@exemplo.com"></label><button class="btn primary" data-action="login">Enviar link de acesso</button></section>`;
}

function viewResumo() {
  const t = totals(cur);
  const inc = +S.income || 0;
  const free = inc - t.total;
  const used = inc ? Math.min(t.total / inc, 1) * 100 : 0;
  let html = '<section class="hero">';
  if (inc) {
    html += `<p class="hero-k">${free >= 0 ? "Livre para gastar em " + monthName(cur) : "Acima da renda em " + monthName(cur)}</p><p class="hero-v${free < 0 ? " neg" : ""}">${money(Math.abs(free))}</p><div class="meter" aria-hidden="true"><span data-w="${used}" class="${t.total > inc ? "neg" : ""}"></span></div>`;
  } else {
    html += `<p class="hero-k">Gasto em ${monthName(cur)}</p><p class="hero-v">${money(t.total)}</p><p class="muted">Informe sua renda mensal para ver quanto ainda sobra. <button class="link" data-action="tab" data-tab="ajustes">Informar renda</button></p>`;
  }
  html += `<dl class="stats"><div><dt>Renda</dt><dd>${money(inc)}</dd></div><div><dt>Gastos fixos</dt><dd>${money(t.fixed)}</dd></div><div><dt>Gastos variáveis</dt><dd>${money(t.vari)}</dd></div></dl></section>`;
  const entries = Object.entries(t.by).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  let donut;
  if (!t.total) {
    donut = `<div class="empty"><p class="muted">Nenhum gasto em ${monthName(cur)} ainda. Conecte um banco em Ajustes, importe um extrato ou adicione um gasto.</p><div class="row"><button class="btn primary" data-action="tab" data-tab="ajustes">Conectar banco</button><button class="btn" data-action="import">Importar extrato</button></div></div>`;
  } else {
    const R = 70, C = 2 * Math.PI * R;
    let off = 0;
    const segs = entries.map(([id, v]) => {
      const len = (v / t.total) * C;
      const gap = entries.length > 1 ? 1.6 : 0;
      const s = `<circle class="seg" cx="100" cy="100" r="${R}" style="stroke:${CAT[id].color};stroke-dasharray:0 ${C};stroke-dashoffset:${-off}" data-dash="${Math.max(len - gap, 0.01)} ${C}" transform="rotate(-90 100 100)"/>`;
      off += len;
      return s;
    }).join("");
    donut = `<div class="donut-wrap"><svg viewBox="0 0 200 200" class="donut" role="img" aria-label="Gastos por categoria"><circle cx="100" cy="100" r="${R}" class="donut-track"/>${segs}<text x="100" y="94" class="donut-k">total do mês</text><text x="100" y="118" class="donut-v">${money(t.total)}</text></svg><ul class="legend">${entries.map(([id, v]) => `<li class="go-cat" data-action="filter-cat" data-cat="${id}"><span class="dot" style="background:${CAT[id].color}"></span><span>${esc(CAT[id].name)}</span><span class="lg-val">${money(v)}</span><span class="lg-pct">${Math.round((v / t.total) * 100)}%</span></li>`).join("")}</ul></div>`;
  }
  const keys = [...Array(6)].map((_, i) => shiftKey(cur, i - 5));
  const data = keys.map((k) => ({ k, t: totals(k) }));
  const max = Math.max(inc, ...data.map((d) => d.t.total), 1);
  const bars = data.map((d) => `<div class="bar-col${d.k === cur ? " cur" : ""}"><div class="bar-wrap" data-h="${(d.t.total / max) * 100}">${d.t.total ? `<span class="bar-v">${compact(d.t.total)}</span>` : ""}<div class="bar">${Object.entries(d.t.by).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([id, v]) => `<i style="flex:${v} 0 0;background:${CAT[id].color}"></i>`).join("")}</div></div></div>`).join("");
  const line = inc ? `<div class="inc-line" style="bottom:${(inc / max) * 100}%"><span>renda</span></div>` : "";
  html += `<div class="grid2"><section class="card"><h2>Para onde foi o dinheiro</h2>${donut}</section><section class="card"><h2>Últimos 6 meses</h2><div class="plot" role="img" aria-label="Gasto total dos últimos seis meses">${bars}${line}</div><div class="months">${keys.map((k) => `<span class="${k === cur ? "cur" : ""}">${shortMonth(k)}</span>`).join("")}</div></section></div>`;
  return html;
}

function caption(it) {
  const r = it.spent / it.goal;
  const over = it.spent > it.goal;
  return `<div class="cap"><p class="cap-name">${esc(it.name)}</p><p class="cap-pct${over ? " neg" : r >= 0.85 ? " warn" : ""}">${Math.round(r * 100)}%</p><p class="cap-val">${money(it.spent)} de ${money(it.goal)}</p>${over ? `<p class="cap-over">${money(it.spent - it.goal)} acima da meta</p>` : `<p class="cap-left">${money(it.goal - it.spent)} restantes</p>`}</div>`;
}

function tubeSVG(it, i) {
  const r = it.spent / it.goal;
  const over = r > 1;
  const H = 192;
  const depth = Math.min(r, 1) * H;
  const top = 4 + H - depth;
  const col = over ? DANGER : it.color;
  let bubbles = "";
  if (depth > 26) {
    for (let j = 0; j < 6; j++) {
      const x = 14 + ((j * 37 + i * 13) % 32);
      const rad = 1.4 + ((j * 7 + i) % 5) * 0.5;
      const dur = (2.4 + ((j * 11 + i * 3) % 9) * 0.25) * (over ? 0.6 : 1);
      const delay = ((j * 17 + i * 5) % 20) * 0.18;
      bubbles += `<circle class="bubble" cx="${x}" cy="${(depth - 4).toFixed(1)}" r="${rad}" style="--rise:${(-(depth - 12)).toFixed(1)}px;--d:${dur.toFixed(2)}s;--delay:${delay.toFixed(2)}s"/>`;
    }
  }
  return `<svg viewBox="0 0 60 200" class="tube" role="img" aria-label="${esc(it.name)}: ${Math.round(r * 100)}% da meta"><defs><clipPath id="tc${i}"><rect x="4" y="4" width="52" height="192" rx="16"/></clipPath></defs><rect x="4" y="4" width="52" height="192" rx="16" class="tube-bg"/><g clip-path="url(#tc${i})"><g class="liquid" data-top="${top}" style="transform:translateY(200px)"><path class="wave w2" d="${WAVE}" style="fill:${col};opacity:.45"/><path class="wave w1" d="${WAVE}" style="fill:${col}"/>${bubbles}</g></g><rect x="4" y="4" width="52" height="192" rx="16" class="tube-edge"/></svg>`;
}

function pieSVG(it) {
  const r = it.spent / it.goal;
  const over = r > 1;
  const C = 2 * Math.PI * 24;
  return `<svg viewBox="0 0 100 100" class="pie" role="img" aria-label="${esc(it.name)}: ${Math.round(r * 100)}% da meta"><circle cx="50" cy="50" r="48" class="pie-bg"/><circle cx="50" cy="50" r="24" class="pie-slice" style="stroke:${over ? DANGER : it.color};stroke-dasharray:0 ${C}" data-dash="${Math.min(r, 1) * C} ${C}" transform="rotate(-90 50 50)"/>${over ? '<circle cx="50" cy="50" r="49" class="pie-ring"/>' : ""}</svg>`;
}

function viewMetas() {
  const t = totals(cur);
  const list = CATS.filter((c) => +S.goals[c.id] > 0).map((c) => ({ id: c.id, name: c.name, color: c.color, goal: +S.goals[c.id], spent: t.by[c.id] || 0 }));
  if (!list.length) return `<section class="card empty"><h2>Metas de ${monthName(cur)}</h2><p class="muted">Você ainda não definiu metas. Escolha um limite de gasto para cada categoria e acompanhe aqui quanto já foi usado.</p><button class="btn primary" data-action="tab" data-tab="ajustes">Definir metas</button></section>`;
  const all = { id: "all", name: "Todas as metas", color: "#8C8EFF", goal: list.reduce((a, b) => a + b.goal, 0), spent: list.reduce((a, b) => a + b.spent, 0) };
  const full = [all, ...list];
  const head = `<div class="sec-head"><div><h2>Metas de ${monthName(cur)}</h2><p class="muted">${money(all.spent)} usados de ${money(all.goal)} planejados</p></div><div class="seg-ctl" role="tablist" aria-label="Modo de visualização"><button role="tab" aria-selected="${metaMode === "pizza"}" data-action="meta-mode" data-mode="pizza">Pizza</button><button role="tab" aria-selected="${metaMode === "garrafas"}" data-action="meta-mode" data-mode="garrafas">Barras</button></div></div>`;
  const body = metaMode === "pizza"
    ? `<div class="pies">${full.map((it, i) => `<figure class="p-item${i === 0 ? " all" : " go-cat"}"${i === 0 ? "" : ` data-action="filter-cat" data-cat="${it.id}"`}>${pieSVG(it)}${caption(it)}</figure>`).join("")}</div>`
    : `<section class="card"><div class="tubes">${full.map((it, i) => `<figure class="t-item${i === 0 ? " all" : " go-cat"}"${i === 0 ? "" : ` data-action="filter-cat" data-cat="${it.id}"`}>${tubeSVG(it, i)}${caption(it)}</figure>`).join("")}</div></section>`;
  return head + body;
}

function lancSwitch() {
  return `<div class="seg-ctl lanc-switch" role="tablist" aria-label="Seção de lançamentos"><button role="tab" aria-selected="${lancMode === "gastos"}" data-action="lanc-mode" data-mode="gastos">Gastos</button><button role="tab" aria-selected="${lancMode === "abatimentos"}" data-action="lanc-mode" data-mode="abatimentos">Abatimentos</button><button role="tab" aria-selected="${lancMode === "cobrancas"}" data-action="lanc-mode" data-mode="cobrancas">Cobranças${OFF.some((x) => x.status === "pending") ? ` (${OFF.filter((x) => x.status === "pending").length})` : ""}</button></div>`;
}

function viewAbat() {
  const byId = {};
  for (const k in TX) for (const t of TX[k]) byId[t.id] = t;
  const recvd = OFF.filter((x) => x.status !== "pending");
  const total = recvd.reduce((a, x) => a + (+x.amount || 0), 0);
  let html = `${lancSwitch()}<div class="sec-head"><div><h2>Abatimentos</h2><p class="muted">${recvd.length ? `${money(total)} recebidos em ${recvd.length} ${recvd.length === 1 ? "abatimento" : "abatimentos"}` : "Valores recebidos que reduzem seus gastos"}</p></div><div class="row"><button class="btn primary" data-action="abat-new">Novo abatimento</button></div></div>`;
  if (!recvd.length) return html + `<section class="card empty"><p class="muted">Nenhum abatimento ainda. Quando alguém te devolver um valor, registre aqui e escolha quais lançamentos ele abate. Valores parciais são aceitos.</p></section>`;
  for (const x of recvd) {
    const al = x.allocations || [];
    const used = al.reduce((a, l) => a + (+l.amount || 0), 0);
    const left = Math.round((+x.amount - used) * 100) / 100;
    const [y, m, d] = String(x.date).split("-");
    html += `<section class="card abat-card"><div class="abat-top"><div><p class="abat-v">${money(+x.amount)}</p><p class="muted small">${d}/${m}/${y}${x.person ? " · " + esc(x.person) : ""}${x.note ? " · " + esc(x.note) : ""}</p></div><button class="btn danger sm" data-action="abat-del" data-id="${esc(x.id)}">${abatArmed === x.id ? "Confirmar" : "Excluir"}</button></div><ul class="abat-lines">${al.map((l) => { const t = byId[l.tx]; return `<li><span>${t ? esc(t.desc) + " · " + t.date.slice(8, 10) + "/" + t.date.slice(5, 7) : "Lançamento em outro mês ou removido"}</span><span>${money(+l.amount)}</span></li>`; }).join("")}${left > 0.005 ? `<li><span class="muted">Não alocado</span><span class="muted">${money(left)}</span></li>` : ""}</ul></section>`;
  }
  return html;
}

function viewCobr() {
  const byId = {};
  for (const k in TX) for (const t of TX[k]) byId[t.id] = t;
  const pend = OFF.filter((x) => x.status === "pending");
  const total = pend.reduce((a, x) => a + (+x.amount || 0), 0);
  let html = `${lancSwitch()}<div class="sec-head"><div><h2>Lembretes de cobrança</h2><p class="muted">${pend.length ? `${money(total)} a receber de ${pend.length} ${pend.length === 1 ? "cobrança" : "cobranças"}` : "Valores que você precisa cobrar de alguém"}</p></div><div class="row"><button class="btn primary" data-action="cobr-new">Nova cobrança</button></div></div>`;
  if (!pend.length) return html + `<section class="card empty"><p class="muted">Nenhuma cobrança pendente. Registre quanto alguém te deve e quais lançamentos ele cobre. Quando a pessoa pagar, confirme aqui e vira um abatimento.</p></section>`;
  for (const x of pend) {
    const al = x.allocations || [];
    const left = Math.round((+x.amount - al.reduce((a, l) => a + (+l.amount || 0), 0)) * 100) / 100;
    const [y, m, d] = String(x.date).split("-");
    html += `<section class="card abat-card"><div class="abat-top"><div><p class="abat-v">${money(+x.amount)}</p><p class="muted small">${esc(x.person || "Sem nome")} · cobrança de ${d}/${m}/${y}${x.note ? " · " + esc(x.note) : ""}</p></div><div class="row"><button class="btn primary sm" data-action="cobr-paid" data-id="${esc(x.id)}">${abatArmed === "p:" + x.id ? "Confirmar recebimento" : "Recebi"}</button><button class="btn danger sm" data-action="abat-del" data-id="${esc(x.id)}">${abatArmed === x.id ? "Confirmar" : "Excluir"}</button></div></div><ul class="abat-lines">${al.map((l) => { const t = byId[l.tx]; return `<li><span>${t ? esc(t.desc) + " · " + t.date.slice(8, 10) + "/" + t.date.slice(5, 7) : "Lançamento em outro mês ou removido"}</span><span>${money(+l.amount)}</span></li>`; }).join("")}${left > 0.005 ? `<li><span class="muted">Não alocado</span><span class="muted">${money(left)}</span></li>` : ""}</ul></section>`;
  }
  return html;
}

function viewLanc() {
  if (lancMode === "abatimentos") return viewAbat();
  if (lancMode === "cobrancas") return viewCobr();
  const monthList = TX[cur] || [];
  const list = monthList.filter((t) => !catFilter || t.cat === catFilter).sort((a, b) => b.date.localeCompare(a.date));
  const pending = list.filter((t) => !t.cat).length;
  const fixedSum = S.fixed.reduce((a, f) => a + (+f.amount || 0), 0);
  let html = `${lancSwitch()}<div class="sec-head"><div><h2>Lançamentos</h2><p class="muted">${list.length} ${list.length === 1 ? "gasto" : "gastos"} em ${monthName(cur)}</p>${catFilter ? `<p class="filter-chip"><span class="dot" style="background:${CAT[catFilter].color}"></span>${esc(CAT[catFilter].name)}<button class="icon-btn" data-action="clear-filter" aria-label="Remover filtro">${XICON}</button></p>` : ""}</div><div class="row">${pending ? `<button class="btn" data-action="classify"${classifying ? " disabled" : ""}>${classifying ? "Classificando..." : `Classificar ${pending} pendentes`}</button>` : ""}${items.length ? `<button class="btn" data-action="sync"${syncing ? " disabled" : ""}>${syncing ? "Sincronizando..." : "Sincronizar bancos"}</button>` : ""}<button class="btn" data-action="add">Adicionar gasto</button><button class="btn primary" data-action="import">Importar extrato</button></div></div>`;
  if (fixedSum) html += `<section class="card fixed-note"><p>${money(fixedSum)} em gastos fixos entram automaticamente todo mês.</p><button class="link" data-action="tab" data-tab="ajustes">Editar gastos fixos</button></section>`;
  if (!list.length) return html + `<section class="card empty"><p class="muted">${catFilter ? `Nenhum gasto de ${esc(CAT[catFilter].name)} em ${monthName(cur)}.` : `Nenhum gasto em ${monthName(cur)}. Os gastos dos bancos conectados aparecem aqui sozinhos, e você também pode importar um extrato OFX ou CSV.`}</p></section>`;
  let lastDay = "", body = "";
  for (const t of list) {
    if (t.date !== lastDay) {
      if (lastDay) body += "</ul>";
      const [y, m, d] = t.date.split("-").map(Number);
      body += `<p class="day">${new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p><ul class="tx-list">`;
      lastDay = t.date;
    }
    const c = CAT[t.cat];
    const bank = t.item ? bankName(t.item) : "";
    const ab = ABAT[t.id] ? `<span class="tag">abatido ${money(ABAT[t.id])}</span>` : "";
    const tag = ab + (t.ai ? '<span class="tag">IA</span>' : "") + (t.src === "pluggy" ? `<span class="tag">${esc(bank || "Open Finance")}</span>` : "");
    body += `<li class="tx"><span class="dot" style="background:${c ? c.color : "transparent"};border:${c ? "0" : "1.5px dashed var(--warn)"}"></span><div><p class="tx-desc" title="${esc(t.desc)}">${esc(t.desc)}</p><div class="tx-sub"><select class="cat-select${c ? "" : " none"}" data-id="${esc(t.id)}" aria-label="Categoria de ${esc(t.desc)}">${catOptions(t.cat, "Sem categoria")}</select>${tag}</div></div><p class="tx-amt">${ABAT[t.id] ? `<span class="was">${money(t.amount)}</span>` : ""}${money(net(t))}</p><button class="icon-btn" data-action="del-tx" data-id="${esc(t.id)}" aria-label="Remover ${esc(t.desc)}">${XICON}</button></li>`;
  }
  return html + `<section class="card">${body}</ul></section>`;
}

function avgRecent(cat) {
  let sum = 0, n = 0;
  for (let i = 1; i <= 3; i++) {
    const k = shiftKey(cur, -i);
    if (!(TX[k] && TX[k].length)) continue;
    n++;
    sum += totals(k).by[cat] || 0;
  }
  return n ? sum / n : 0;
}

function bankName(id) {
  const it = items.find((x) => x.id === id);
  return (S.bankNames && S.bankNames[id]) || (it && it.connector_name) || "";
}

const dm = (iso) => (iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) : "");

const BANK_STYLES = [
  [/nubank|nu pagamentos/, "linear-gradient(135deg,#7A12C2,#3A0868)", "#fff"],
  [/btg/, "linear-gradient(135deg,#0F131C,#000)", "#E8D9A8"],
  [/inter/, "linear-gradient(135deg,#FF8A3D,#E24E00)", "#fff"],
  [/itau/, "linear-gradient(135deg,#FF8A00,#0B3C8C)", "#fff"],
  [/bradesco/, "linear-gradient(135deg,#E3244B,#8A0F2A)", "#fff"],
  [/santander/, "linear-gradient(135deg,#EC0000,#8F0000)", "#fff"],
  [/c6/, "linear-gradient(135deg,#3A3A3C,#0C0C0D)", "#fff"],
  [/banco do brasil|\bbb\b/, "linear-gradient(135deg,#FCE000,#2A5CAA)", "#0B1F4D"],
  [/caixa/, "linear-gradient(135deg,#0070AF,#F39200)", "#fff"],
  [/xp/, "linear-gradient(135deg,#2B2B2B,#000)", "#F5C518"],
  [/mercado pago|mercadopago/, "linear-gradient(135deg,#00B1EA,#0069A8)", "#fff"],
];
const LEVEL_STYLES = { BLACK: ["linear-gradient(135deg,#17171A,#000)", "#D9C48A"], INFINITE: ["linear-gradient(135deg,#17171A,#000)", "#D9C48A"], PLATINUM: ["linear-gradient(135deg,#8E9099,#4D4F57)", "#fff"], GOLD: ["linear-gradient(135deg,#D9B24C,#8A6A1B)", "#2B2105"] };

function brandMark(brand) {
  const b = String(brand || "").toUpperCase();
  if (b.includes("MASTER")) return '<span class="cv-mc"><i></i><i></i></span>';
  if (b.includes("VISA")) return '<span class="cv-text">VISA</span>';
  if (b.includes("ELO")) return '<span class="cv-text">elo</span>';
  if (b.includes("AMEX") || b.includes("AMERICAN")) return '<span class="cv-text">AMEX</span>';
  return b ? `<span class="cv-text">${esc(b)}</span>` : "";
}

function cardVisual(c) {
  const hay = norm(bankName(c.item_id) + " " + (c.name || ""));
  const level = String((c.raw && c.raw.creditData && c.raw.creditData.level) || "").toUpperCase();
  const bank = BANK_STYLES.find(([re]) => re.test(hay));
  const lv = LEVEL_STYLES[level] || Object.entries(LEVEL_STYLES).find(([k]) => hay.includes(k.toLowerCase()))?.[1];
  const bg = bank ? bank[1] : lv ? lv[0] : "linear-gradient(135deg,#3B3D46,#17181B)";
  const fg = bank ? bank[2] : lv ? lv[1] : "#fff";
  const last4 = String(c.number || "").replace(/\D/g, "").slice(-4);
  const tier = level || (Object.keys(LEVEL_STYLES).find((k) => hay.includes(k.toLowerCase())) || "");
  return `<div class="cv" style="background:${bg};color:${fg}"><div class="cv-top"><span class="cv-bank">${esc(bankName(c.item_id) || "Cartão")}</span>${tier ? `<span class="cv-tier">${esc(tier)}</span>` : ""}</div><div class="cv-chip"></div><div class="cv-bot"><span class="cv-num">${last4 ? "•••• " + last4 : esc(c.name || "")}</span>${brandMark(c.brand)}</div></div>`;
}

function viewFaturas() {
  if (!accounts.length) return `<section class="card empty"><h2>Faturas</h2><p class="muted">Nenhum cartão de crédito encontrado. Conecte um banco em Ajustes e sincronize para ver as faturas aqui.</p><button class="btn primary" data-action="tab" data-tab="ajustes">Ir para Ajustes</button></section>`;
  const owed = (c) => (c.balance !== null && c.balance !== undefined ? +c.balance : (+c.credit_limit || 0) - (+c.available_credit || 0));
  const sum = accounts.reduce((a, c) => a + owed(c), 0);
  let html = `<div class="sec-head"><div><h2>Faturas</h2><p class="muted">${money(sum)} restantes a pagar em ${accounts.length} ${accounts.length === 1 ? "cartão" : "cartões"}, incluindo parcelas futuras</p></div><div class="row">${items.length ? `<button class="btn" data-action="sync"${syncing ? " disabled" : ""}>${syncing ? "Sincronizando..." : "Atualizar faturas"}</button>` : ""}</div></div><div class="grid2">`;
  for (const c of accounts) {
    const limit = +c.credit_limit || 0;
    const avail = c.available_credit === null ? null : +c.available_credit;
    const used = limit && avail !== null ? Math.max(limit - avail, 0) : 0;
    const pct = limit ? Math.min((used / limit) * 100, 100) : 0;
    const own = bills.filter((x) => x.account_id === c.id).slice(0, 6);
    const lim = limit ? `<p class="bill-k sub">Limite</p><div class="meter sm" aria-hidden="true"><span data-w="${pct}"></span></div><p class="muted small">${money(used)} usados de ${money(limit)}${avail !== null ? ` · ${money(avail)} disponíveis` : ""}</p>` : "";
    const hist = own.length ? `<p class="bill-k sub">Faturas anteriores</p><ul class="bill-hist">${own.map((x) => `<li><span>Vencimento ${dm(x.due_date)}/${(x.due_date || "").slice(2, 4)}</span><span>${money(+x.total || 0)}</span></li>`).join("")}</ul>` : "";
    html += `<section class="card bill-card">${cardVisual(c)}<h2>${esc(c.name || "Cartão")}</h2><p class="bill-k">Restante a pagar</p><p class="bill-v">${money(owed(c))}</p>${lim}${hist}</section>`;
  }
  return html + "</div>";
}

const INV_TYPE = { FIXED_INCOME: "Renda fixa", MUTUAL_FUND: "Fundo", EQUITY: "Ações", ETF: "ETF", COE: "COE", SECURITY: "Previdência", OTHER: "Outro" };
const invType = (v) => INV_TYPE[v.type] || v.type || "Investimento";
const invOriginal = (v) => (v.amount_original !== null && v.amount_original !== undefined ? +v.amount_original : null);
const invProfit = (v) => {
  if (v.amount_profit !== null && v.amount_profit !== undefined) return +v.amount_profit;
  const o = invOriginal(v);
  return o !== null && v.balance !== null ? +v.balance - o : null;
};
const isBuy = (t) => t.type === "BUY" && +t.amount > 0;

function aportes(invs) {
  const by = {};
  let estimated = false;
  for (const v of invs) {
    const buys = INVTX.filter((t) => t.investment_id === v.id && isBuy(t) && t.date);
    if (buys.length) {
      for (const t of buys) by[t.date.slice(0, 7)] = (by[t.date.slice(0, 7)] || 0) + +t.amount;
      continue;
    }
    const d = String((v.raw && (v.raw.issueDate || v.raw.date)) || "").slice(0, 7);
    const o = invOriginal(v);
    if (d && o > 0) { by[d] = (by[d] || 0) + o; estimated = true; }
  }
  return { by, estimated };
}

function monthlyBars(by, months) {
  const keys = [...Array(months)].map((_, i) => shiftKey(keyOf(new Date()), i - (months - 1)));
  const max = Math.max(...keys.map((k) => by[k] || 0), 1);
  const bars = keys.map((k) => `<div class="bar-col cur"><div class="bar-wrap" data-h="${((by[k] || 0) / max) * 100}">${by[k] ? `<span class="bar-v">${compact(by[k])}</span>` : ""}<div class="bar"><i style="flex:1;background:var(--accent)"></i></div></div></div>`).join("");
  const total = keys.reduce((a, k) => a + (by[k] || 0), 0);
  return { html: `<div class="plot" role="img" aria-label="Aportes por mês">${bars}</div><div class="months">${keys.map((k) => `<span>${shortMonth(k)}</span>`).join("")}</div>`, total };
}

function stackBar(orig, bal) {
  if (!orig) return `<p class="muted small">O banco não informou o valor investido.</p>`;
  const total = Math.max(orig, bal);
  const a = Math.min(orig, bal);
  const gain = Math.max(bal - orig, 0);
  const loss = Math.max(orig - bal, 0);
  const bubbles = (seed) => [...Array(5)].map((_, j) => `<span class="sb" style="left:${8 + ((j * 23 + seed * 11) % 80)}%;--d:${(2.6 + ((j * 7 + seed) % 5) * 0.4).toFixed(1)}s;--delay:${(((j * 13 + seed * 3) % 10) * 0.25).toFixed(2)}s"></span>`).join("");
  const seg = (cls, val, color, seed) => (val > 0 ? `<div class="stack-seg ${cls}" data-w="${(val / total) * 100}" style="--c:${color}">${bubbles(seed)}</div>` : "");
  const pct = orig ? (gain / orig) * 100 : 0;
  return `<div class="stack" role="img" aria-label="Aportes ${money(a)}, rendimento ${money(gain)}">${seg("a", a, "var(--accent)", 1)}${seg("g", gain, "#4ADE80", 2)}${seg("l", loss, "var(--danger)", 3)}</div><div class="stack-legend"><span><i style="background:var(--accent)"></i>Aportes ${money(a)}</span>${gain ? `<span><i style="background:#4ADE80"></i>Rendimento ${money(gain)} (+${pct.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%)</span>` : ""}${loss ? `<span><i style="background:var(--danger)"></i>Perda ${money(loss)}</span>` : ""}<span class="stack-tot">Total ${money(bal)}</span></div>`;
}

function hbars(list) {
  const max = Math.max(...list.map((x) => x.value), 1);
  list = list.map((x) => ({ ...x, value: Math.max(x.value, 0) }));
  return `<ul class="hbars">${list.map((x) => `<li><span class="hb-l">${esc(x.label)}</span><span class="hb-t"><span class="hb-f" data-w="${(x.value / max) * 100}" style="background:${x.color || "var(--accent)"}"></span></span><span class="hb-v">${x.text !== undefined ? x.text : money(x.value)}</span></li>`).join("")}</ul>`;
}

function cumulativeLine(txs) {
  const list = txs.filter((t) => t.date && (t.type === "BUY" || t.type === "SELL") && +t.amount).slice().sort((a, b) => a.date.localeCompare(b.date));
  if (list.length < 2) return "";
  let acc = 0;
  const pts = list.map((t) => { acc += (t.type === "BUY" ? 1 : -1) * Math.abs(+t.amount); return acc; });
  const max = Math.max(...pts, 1);
  const W = 300, H = 90;
  const path = pts.map((v, i) => `${i ? "L" : "M"}${((i / (pts.length - 1)) * W).toFixed(1)} ${(H - (Math.max(v, 0) / max) * (H - 6) - 3).toFixed(1)}`).join(" ");
  const f = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(2, 4)}`;
  return `<svg viewBox="0 0 ${W} ${H}" class="inv-line" role="img" aria-label="Valor aplicado acumulado"><path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="inv-line-k"><span>${f(list[0].date)}</span><span>aplicado acumulado ${money(acc)}</span><span>${f(list[list.length - 1].date)}</span></div>`;
}

function viewInvest() {
  if (!INV.length) return indCard() + `<section class="card empty"><h2>Investimentos</h2><p class="muted">Nenhum investimento encontrado. Conecte um banco em Ajustes e sincronize. Se o seu banco tem investimentos e nada apareceu, o MeuPluggy pode não estar compartilhando esses dados.</p><button class="btn primary" data-action="tab" data-tab="ajustes">Ir para Ajustes</button></section>`;
  const balance = INV.reduce((a, v) => a + (+v.balance || 0), 0);
  const orig = INV.reduce((a, v) => a + (invOriginal(v) || 0), 0);
  const profit = INV.reduce((a, v) => a + (invProfit(v) || 0), 0);
  const ap = aportes(INV);
  const chart = monthlyBars(ap.by, 12);
  const sumBy = (fn) => Object.entries(INV.reduce((m, v) => { const k = fn(v); m[k] = (m[k] || 0) + (+v.balance || 0); return m; }, {}));
  const bankList = sumBy((v) => v.item_id).map(([k, val]) => ({ label: bankName(k) || "Banco", value: val })).sort((a, b) => b.value - a.value);
  const palette = CATS.map((c) => c.color);
  const typeList = sumBy(invType).map(([k, val]) => ({ label: k, value: val })).sort((a, b) => b.value - a.value).map((x, i) => ({ ...x, color: palette[i % palette.length] }));
  const banks = new Set(INV.map((v) => v.item_id)).size;
  let html = `<div class="sec-head"><div><h2>Investimentos</h2><p class="muted">${INV.length} ${INV.length === 1 ? "investimento" : "investimentos"} em ${banks} ${banks === 1 ? "banco" : "bancos"}</p></div><div class="row">${items.length ? `<button class="btn" data-action="sync"${syncing ? " disabled" : ""}>${syncing ? "Sincronizando..." : "Atualizar"}</button>` : ""}</div></div>`;
  html += `<section class="hero"><p class="hero-k">Valor atual</p><p class="hero-v">${money(balance)}</p><dl class="stats"><div><dt>Aplicado</dt><dd>${orig ? money(orig) : "-"}</dd></div><div><dt>Rendimento</dt><dd class="${profit < 0 ? "neg" : ""}">${orig ? money(profit) : "-"}</dd></div></dl></section>`;
  html += `<section class="card"><h2>Aportes por mês</h2>${chart.html}<p class="muted small">${chart.total ? `${money(chart.total)} aplicados nos últimos 12 meses.` : "Nenhum aporte nos últimos 12 meses."}${ap.estimated ? " Alguns valores são estimados pela data de emissão, porque o banco não enviou o histórico de movimentações." : ""}</p></section><div class="grid2"><section class="card"><h2>Por banco</h2>${hbars(bankList)}</section><section class="card"><h2>Por tipo</h2>${hbars(typeList)}</section></div>`;
  const rated = INV.filter((v) => v.last_twelve_months_rate !== null && v.last_twelve_months_rate !== undefined && +v.balance > 0);
  const wBal = rated.reduce((a, v) => a + +v.balance, 0);
  const port12 = wBal ? rated.reduce((a, v) => a + +v.last_twelve_months_rate * +v.balance, 0) / wBal : null;
  html += indCard();
  if (IND) html += `<section class="card"><h2>Carteira x mercado</h2>${cmpBlock(port12).replace(/^<h3[^>]*>[^<]*<\/h3>/, "")}</section>`;
  const groups = {};
  for (const v of INV) (groups[v.item_id] = groups[v.item_id] || []).push(v);
  for (const [itemId, list] of Object.entries(groups)) {
    const sum = list.reduce((a, v) => a + (+v.balance || 0), 0);
    html += `<section class="card"><div class="abat-top"><h2>${esc(bankName(itemId) || "Banco")}</h2><p class="abat-v">${money(sum)}</p></div><ul class="inv-list">${list.slice().sort((a, b) => (+b.balance || 0) - (+a.balance || 0)).map((v) => {
      const p = invProfit(v), o = invOriginal(v);
      const pct = p !== null && o ? (p / o) * 100 : null;
      return `<li><button class="inv-row" data-action="inv-open" data-id="${esc(v.id)}"><span class="inv-name"><b>${esc(v.name || "Investimento")}</b><span class="muted small">${esc(invType(v))}${v.issuer ? " · " + esc(v.issuer) : ""}</span></span><span class="inv-val"><b>${money(+v.balance || 0)}</b>${pct !== null ? `<span class="small ${pct < 0 ? "neg" : "pos"}">${pct >= 0 ? "+" : ""}${pct.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</span>` : ""}</span></button></li>`;
    }).join("")}</ul></section>`;
  }
  return html;
}

function openInvest(id) {
  const v = INV.find((x) => x.id === id);
  if (!v) return;
  const txs = INVTX.filter((t) => t.investment_id === id);
  const o = invOriginal(v), p = invProfit(v);
  const row = (k, val) => (val ? `<div><dt>${k}</dt><dd>${val}</dd></div>` : "");
  const pct = (n) => (n === null || n === undefined ? "" : (+n).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%");
  const lm = v.last_month_rate !== null && v.last_month_rate !== undefined ? +v.last_month_rate : null;
  const lm12 = v.last_twelve_months_rate !== null && v.last_twelve_months_rate !== undefined ? +v.last_twelve_months_rate : null;
  const lmValue = lm !== null && v.balance ? +v.balance - +v.balance / (1 + lm / 100) : null;
  const ap = aportes([v]);
  const bars = monthlyBars(ap.by, 12);
  const buys = txs.filter(isBuy);
  const first = buys.length ? buys.reduce((m, t) => (t.date < m ? t.date : m), buys[0].date) : null;
  const fmtDate = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "");
  const histRows = txs.slice(0, 40).map((t) => `<li><span>${fmtDate(t.date)} · ${esc(t.description || t.type || "Movimentação")}</span><span>${t.amount === null ? "" : money(+t.amount)}</span></li>`).join("");
  const line = cumulativeLine(txs);
  $("#invBody").innerHTML = `<h2>${esc(v.name || "Investimento")}</h2><p class="muted small">${esc(bankName(v.item_id))} · ${esc(invType(v))}${v.issuer ? " · " + esc(v.issuer) : ""}</p>
<dl class="inv-facts">${row("Valor atual", money(+v.balance || 0))}${row("Valor investido", o !== null ? money(o) : "")}${row("Rendimento total", p !== null ? `<span class="${p < 0 ? "neg" : "pos"}">${p >= 0 ? "+" : ""}${money(p)}</span>` : "")}${row("Rendimento no último mês", lm !== null ? `${pct(lm)}${lmValue !== null ? ` (≈ ${money(lmValue)})` : ""}` : "")}${row("Últimos 12 meses", pct(v.last_twelve_months_rate))}${row("Taxa anual", pct(v.annual_rate))}${row("Disponível para resgate", v.amount_withdrawal ? money(+v.amount_withdrawal) : "")}${row("Primeiro aporte", fmtDate(first))}${row("Vencimento", fmtDate(v.due_date))}${row("Quantidade", v.quantity ? (+v.quantity).toLocaleString("pt-BR", { maximumFractionDigits: 6 }) : "")}</dl>
<h3 class="inv-h">Aporte e rendimento</h3>${stackBar(o, +v.balance || 0)}
${cmpBlock(lm12)}
<h3 class="inv-h">Aportes por mês</h3>${bars.html}${ap.estimated ? '<p class="muted small">Estimado pela data de emissão: o banco não enviou o histórico de movimentações.</p>' : ""}
${line ? `<h3 class="inv-h">Valor aplicado acumulado</h3>${line}` : ""}
${histRows ? `<h3 class="inv-h">Movimentações</h3><ul class="abat-lines inv-hist">${histRows}</ul>` : ""}
<div class="row end"><button class="btn" data-action="close-dlg">Fechar</button></div>`;
  $("#invDlg").showModal();
  animateIn();
}

const bcb = async (code, n) => {
  const res = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/${n}?formato=json`);
  if (!res.ok) throw new Error("BCB " + res.status);
  return (await res.json()).map((x) => ({ d: x.data, v: parseFloat(x.valor) })).filter((x) => Number.isFinite(x.v));
};
const compound = (arr) => (arr.reduce((a, x) => a * (1 + x.v / 100), 1) - 1) * 100;
const bcbMonth = (d) => shortMonth(d.slice(6, 10) + "-" + d.slice(3, 5)) + "/" + d.slice(8, 10);
const pctFmt = (n, d = 2) => (+n).toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d }) + "%";

async function loadIndicators() {
  const c = lsGet("ind");
  if (c && Date.now() - c.t < 6 * 3600 * 1000) { IND = c.data; return; }
  try {
    const [selic, cdi, ipca, usd, cdiM] = await Promise.all([bcb(432, 1), bcb(4389, 1), bcb(433, 12), bcb(1, 2), bcb(4391, 12)]);
    IND = { selic: selic[selic.length - 1], cdi: cdi[cdi.length - 1], ipca12: compound(ipca), ipcaLast: ipca[ipca.length - 1], usd: usd[usd.length - 1], usdPrev: usd.length > 1 ? usd[0] : null, cdi12: compound(cdiM), cdiMonth: cdiM[cdiM.length - 1] };
    lsSet("ind", { t: Date.now(), data: IND });
  } catch (e) {
    if (c) IND = c.data;
  }
}

function indCard() {
  if (!IND) return `<section class="card"><h2>Indicadores do mercado</h2><p class="muted">Carregando indicadores do Banco Central...</p></section>`;
  const dolar = IND.usdPrev ? ((IND.usd.v - IND.usdPrev.v) / IND.usdPrev.v) * 100 : null;
  const item = (k, v, sub) => `<div><dt>${k}</dt><dd>${v}</dd>${sub ? `<span class="muted small">${sub}</span>` : ""}</div>`;
  return `<section class="card"><h2>Indicadores do mercado</h2><dl class="stats ind-stats">${item("Selic meta", pctFmt(IND.selic.v) + " a.a.")}${item("CDI", pctFmt(IND.cdi.v) + " a.a.", "CDI no mês " + pctFmt(IND.cdiMonth.v))}${item("CDI 12 meses", pctFmt(IND.cdi12), "acumulado")}${item("IPCA 12 meses", pctFmt(IND.ipca12), "último mês " + pctFmt(IND.ipcaLast.v) + " (" + bcbMonth(IND.ipcaLast.d) + ")")}${item("Dólar", "R$ " + IND.usd.v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }), dolar === null ? "" : `<span class="${dolar < 0 ? "pos" : "neg"}">${dolar >= 0 ? "+" : ""}${pctFmt(dolar)} no dia</span>`)}</dl><p class="muted small ind-src">Fonte: Banco Central do Brasil (SGS), atualizado a cada 6 horas.</p></section>`;
}

function cmpBlock(r12) {
  if (!IND) return "";
  const list = [];
  if (r12 !== null) list.push({ label: "Este investimento", value: r12, text: pctFmt(r12), color: "var(--accent)" });
  list.push({ label: "CDI", value: IND.cdi12, text: pctFmt(IND.cdi12), color: "#38BDF8" }, { label: "IPCA", value: IND.ipca12, text: pctFmt(IND.ipca12), color: "#FACC15" });
  const real = r12 !== null ? ((1 + r12 / 100) / (1 + IND.ipca12 / 100) - 1) * 100 : null;
  const note = r12 !== null
    ? `Equivale a ${Math.round((r12 / IND.cdi12) * 100)}% do CDI. Ganho real sobre a inflação: ${real >= 0 ? "+" : ""}${pctFmt(real)}.`
    : "O banco não informou a rentabilidade de 12 meses deste investimento.";
  return `<h3 class="inv-h">Comparação em 12 meses</h3>${hbars(list)}<p class="muted small">${note}</p>`;
}

const bubbleSpans = (seed) => [...Array(5)].map((_, j) => `<span class="sb" style="left:${8 + ((j * 23 + seed * 11) % 80)}%;--d:${(2.6 + ((j * 7 + seed) % 5) * 0.4).toFixed(1)}s;--delay:${(((j * 13 + seed * 3) % 10) * 0.25).toFixed(2)}s"></span>`).join("");

function objSaved(o) {
  const linked = (o.inv || []).reduce((a, id) => { const v = INV.find((x) => x.id === id); return a + (v ? +v.balance || 0 : 0); }, 0);
  return linked + (+o.manual || 0);
}

function monthsLeft(deadline) {
  if (!deadline) return null;
  const [y, m] = deadline.split("-").map(Number);
  const n = new Date();
  return (y - n.getFullYear()) * 12 + (m - 1 - n.getMonth());
}

function viewObjetivos() {
  const list = S.objectives || [];
  const hasEmergency = list.some((o) => o.kind === "emergency");
  let html = `<div class="sec-head"><div><h2>Objetivos</h2><p class="muted">${list.length ? `${list.length} ${list.length === 1 ? "objetivo" : "objetivos"} em andamento` : "Metas de patrimônio, como reserva de emergência ou uma viagem"}</p></div><div class="row">${hasEmergency ? "" : '<button class="btn" data-action="obj-emergency">Reserva de emergência</button>'}<button class="btn primary" data-action="obj-new">Novo objetivo</button></div></div>`;
  if (!list.length) return html + `<section class="card empty"><p class="muted">Crie um objetivo, defina o valor-alvo e o prazo, e escolha quais investimentos contam para ele. O app mostra quanto já foi guardado e quanto falta por mês.</p></section>`;
  list.forEach((o, i) => {
    const saved = objSaved(o);
    const target = +o.target || 0;
    const pct = target ? Math.min((saved / target) * 100, 100) : 0;
    const left = Math.max(target - saved, 0);
    const ml = monthsLeft(o.deadline);
    const color = o.color || CATS[i % CATS.length].color;
    let status;
    if (left <= 0) status = "Objetivo alcançado";
    else if (ml === null) status = `Faltam ${money(left)}`;
    else if (ml > 0) status = `Guardar ${money(left / ml)} por mês`;
    else status = "Prazo vencido";
    const linked = (o.inv || []).map((id) => INV.find((x) => x.id === id)).filter(Boolean);
    const when = o.deadline ? `até ${monthName(o.deadline)} de ${o.deadline.slice(0, 4)}${ml !== null && ml > 0 ? ` · ${ml} ${ml === 1 ? "mês" : "meses"}` : ""}` : "sem prazo";
    html += `<section class="card obj-card"><div class="abat-top"><div><h2>${esc(o.name)}</h2><p class="muted small">${when}</p></div><div class="row"><button class="btn sm" data-action="obj-edit" data-id="${esc(o.id)}">Editar</button><button class="btn danger sm" data-action="obj-del" data-id="${esc(o.id)}">${objArmed === o.id ? "Confirmar" : "Excluir"}</button></div></div><p class="abat-v obj-v">${money(saved)} <span class="muted small">de ${money(target)}</span></p><div class="stack" role="img" aria-label="${Math.round(pct)}% de ${esc(o.name)}">${pct > 0 ? `<div class="stack-seg a" data-w="${pct}" style="--c:${color}">${bubbleSpans(i + 1)}</div>` : ""}</div><div class="stack-legend"><span><i style="background:${color}"></i>${Math.round(pct)}% concluído</span><span class="stack-tot">${status}</span></div>${linked.length || +o.manual ? `<p class="muted small obj-links">${[...linked.map((v) => esc(v.name || "Investimento") + " " + money(+v.balance || 0)), +o.manual ? "Guardado à parte " + money(+o.manual) : ""].filter(Boolean).join(" · ")}</p>` : ""}</section>`;
  });
  return html;
}

function openObj(id, preset) {
  objEdit = id;
  const o = id ? (S.objectives || []).find((x) => x.id === id) : null;
  const base = o || preset || {};
  $("#obTitle").textContent = o ? "Editar objetivo" : "Novo objetivo";
  $("#obName").value = base.name || "";
  $("#obTarget").value = numVal(base.target);
  $("#obDeadline").value = base.deadline || "";
  $("#obManual").value = numVal(base.manual);
  $("#obErr").textContent = "";
  const takenElsewhere = new Set((S.objectives || []).filter((x) => x.id !== id).flatMap((x) => x.inv || []));
  const mine = new Set(base.inv || []);
  $("#obInvList").innerHTML = INV.length
    ? INV.map((v) => `<li class="o-row"><input type="checkbox" data-ob-inv="${esc(v.id)}"${mine.has(v.id) ? " checked" : ""}${takenElsewhere.has(v.id) ? " disabled" : ""} aria-label="Incluir ${esc(v.name || "investimento")}"><div><p>${esc(v.name || "Investimento")}</p><p class="muted small">${esc(bankName(v.item_id))}${takenElsewhere.has(v.id) ? " · já usado em outro objetivo" : ""}</p></div><span class="muted small">${money(+v.balance || 0)}</span></li>`).join("")
    : '<li class="muted small">Nenhum investimento sincronizado. Você pode informar um valor guardado à parte.</li>';
  $("#objDlg").dataset.kind = base.kind || "";
  $("#objDlg").showModal();
}

function saveObj() {
  const name = $("#obName").value.trim();
  const target = parseMoney($("#obTarget").value);
  if (!name) { $("#obErr").textContent = "Dê um nome ao objetivo."; return; }
  if (!(target > 0)) { $("#obErr").textContent = "Informe o valor-alvo."; return; }
  const manual = parseMoney($("#obManual").value);
  const rec = {
    id: objEdit || uid(),
    name,
    target: Math.round(target * 100) / 100,
    deadline: $("#obDeadline").value || "",
    manual: manual > 0 ? Math.round(manual * 100) / 100 : 0,
    inv: [...document.querySelectorAll("[data-ob-inv]:checked")].map((el) => el.dataset.obInv),
    kind: $("#objDlg").dataset.kind || "",
  };
  if (!S.objectives) S.objectives = [];
  const i = S.objectives.findIndex((x) => x.id === rec.id);
  if (i >= 0) { rec.color = S.objectives[i].color; S.objectives[i] = rec; } else { rec.color = CATS[(S.objectives.length + 3) % CATS.length].color; S.objectives.push(rec); }
  saveSettings();
  $("#objDlg").close();
  render();
  toast("Objetivo salvo.");
}

function emergencyPreset() {
  const vals = [1, 2, 3].map((i) => shiftKey(cur, -i)).filter((k) => TX[k] && TX[k].length).map((k) => totals(k).total);
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  return { name: "Reserva de emergência", target: Math.round(avg * 6), kind: "emergency" };
}

function viewBancos() {
  const pendingRow = linking ? `<li class="bank-pending"><span class="spinner" aria-hidden="true"></span><div><p class="bank-name-static">Conectando banco...</p><p class="muted small">${esc(linking)}</p></div></li>` : "";
  const list = items.length || linking
    ? `<ul class="bank-list">${pendingRow}${items.map((i) => {
      const [label, cls] = STATUS[i.status] || [i.status || "Conectado", ""];
      const when = i.last_sync_at ? new Date(i.last_sync_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
      return `<li><div><input class="bank-name" data-bank="${esc(i.id)}" value="${esc(bankName(i.id) || "Banco")}" maxlength="40" aria-label="Nome do banco" placeholder="${esc(i.connector_name || "Banco")}"><p class="muted small bank-meta"><span class="status ${cls}">${esc(label)}</span>${when ? ` <span>Sincronizado em ${when}</span>` : ""}</p></div><div class="row">${cls === "bad" ? `<button class="btn sm" data-action="reconnect" data-id="${esc(i.id)}">Reconectar</button>` : ""}<button class="btn danger sm" data-action="remove-item" data-id="${esc(i.id)}">${removeArmed === i.id ? "Confirmar" : "Desconectar"}</button></div></li>`;
    }).join("")}</ul>`
    : '<p class="muted" style="margin-bottom:16px">Nenhum banco conectado ainda.</p>';
  return `<section class="card"><h2>Bancos conectados</h2><p class="muted">Conexão pelo Open Finance. Os gastos novos chegam sozinhos quando o banco atualiza os dados.</p>${list}<div class="row"><button class="btn primary" data-action="connect"${connecting ? " disabled" : ""}>${connecting ? "Abrindo..." : "Conectar banco"}</button>${items.length ? `<button class="btn" data-action="sync"${syncing ? " disabled" : ""}>${syncing ? "Sincronizando..." : "Sincronizar agora"}</button>` : ""}</div></section>`;
}

const GOAL_R = 70;
const GOAL_C = 2 * Math.PI * GOAL_R;

function goalMax(id) {
  const a = avgRecent(id);
  return Math.ceil(Math.max(a * 2, (+S.goals[id] || 0) * 1.25, (+S.income || 0) * 0.35, 1000) / 500) * 500;
}

function viewGoals() {
  const rows = CATS.map((c) => {
    const a = avgRecent(c.id);
    const g = +S.goals[c.id] || 0;
    return `<div class="goal2"><span class="dot" style="background:${c.color}"></span><span class="goal-name">${esc(c.name)}${a ? `<small>média recente ${money(a)}</small>` : ""}</span><input inputmode="decimal" data-goal="${c.id}" value="${numVal(S.goals[c.id])}" placeholder="Sem meta" aria-label="Meta de ${esc(c.name)}"><input type="range" class="goal-range" data-goal-range="${c.id}" min="0" max="${goalMax(c.id)}" step="50" value="${g}" style="--c:${c.color}" aria-label="Ajustar meta de ${esc(c.name)}"></div>`;
  }).join("");
  const segs = CATS.map((c) => `<circle class="seg live" id="gc-${c.id}" cx="100" cy="100" r="${GOAL_R}" style="stroke:${c.color};stroke-dasharray:0 ${GOAL_C};stroke-dashoffset:0" transform="rotate(-90 100 100)"/>`).join("");
  return `<section class="card"><h2>Metas por categoria</h2><p class="muted">Arraste o controle ou digite o valor. Deixe em zero a categoria que não precisa de meta.</p><div class="goals-layout"><div class="goals2">${rows}</div><aside class="goal-chart" id="goalChart"><svg viewBox="0 0 200 200" class="donut" role="img" aria-label="Distribuição das metas"><circle cx="100" cy="100" r="${GOAL_R}" class="donut-track"/>${segs}<text x="100" y="94" class="donut-k">planejado</text><text x="100" y="118" class="donut-v" id="goalTotal">R$ 0,00</text></svg><p class="goal-income muted small" id="goalIncome"></p><ul class="legend" id="goalLegend"></ul></aside></div></section>`;
}

function paintGoalChart() {
  const root = $("#goalChart");
  if (!root) return;
  const total = CATS.reduce((a, c) => a + (+S.goals[c.id] || 0), 0);
  let off = 0;
  for (const c of CATS) {
    const v = +S.goals[c.id] || 0;
    const el = document.getElementById("gc-" + c.id);
    const len = total ? (v / total) * GOAL_C : 0;
    const gap = v && len > 3 ? 1.6 : 0;
    el.style.strokeDasharray = `${Math.max(len - gap, 0)} ${GOAL_C}`;
    el.style.strokeDashoffset = String(-off);
    off += len;
  }
  $("#goalTotal").textContent = money(total);
  const inc = +S.income || 0;
  const info = $("#goalIncome");
  if (!inc) info.textContent = "Informe sua renda para comparar.";
  else if (total > inc) { info.textContent = `${money(total - inc)} acima da renda (${Math.round((total / inc) * 100)}%)`; info.classList.add("neg"); }
  else { info.textContent = `${Math.round((total / inc) * 100)}% da renda · sobram ${money(inc - total)}`; info.classList.remove("neg"); }
  $("#goalLegend").innerHTML = CATS.filter((c) => +S.goals[c.id] > 0).sort((a, b) => S.goals[b.id] - S.goals[a.id]).map((c) => `<li><span class="dot" style="background:${c.color}"></span><span>${esc(c.name)}</span><span class="lg-val">${money(S.goals[c.id])}</span><span class="lg-pct">${Math.round((S.goals[c.id] / total) * 100)}%</span></li>`).join("") || '<li class="muted">Nenhuma meta definida.</li>';
}

function setGoalLive(id, v, from) {
  if (v > 0) S.goals[id] = v; else delete S.goals[id];
  const num = document.querySelector(`[data-goal="${id}"]`);
  const rng = document.querySelector(`[data-goal-range="${id}"]`);
  if (from === "range" && num) num.value = numVal(v);
  if (from === "text" && rng) {
    if (v > +rng.max) rng.max = Math.ceil(v / 500) * 500;
    rng.value = v;
  }
  paintGoalChart();
  saveSettings();
}

document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.matches && el.matches("[data-goal-range]")) setGoalLive(el.dataset.goalRange, +el.value, "range");
  else if (el.matches && el.matches("[data-goal]")) setGoalLive(el.dataset.goal, parseMoney(el.value) || 0, "text");
});

function viewAjustes() {
  return `<div class="settings">
${viewBancos()}
<section class="card"><h2>Renda mensal</h2><p class="muted">Quanto entra por mês, já descontados impostos.</p><label class="field"><span>Renda</span><input inputmode="decimal" data-field="income" value="${numVal(S.income)}" placeholder="0,00"></label></section>
<section class="card"><h2>Gastos fixos</h2><p class="muted">Entram automaticamente em todos os meses, na categoria escolhida.</p><ul class="fixed-list">${S.fixed.map((f) => `<li><input data-fixed="${f.id}" data-key="name" value="${esc(f.name)}" placeholder="Nome, ex.: aluguel" aria-label="Nome do gasto fixo"><input data-fixed="${f.id}" data-key="amount" inputmode="decimal" value="${numVal(f.amount)}" placeholder="0,00" aria-label="Valor"><select data-fixed="${f.id}" data-key="cat" aria-label="Categoria">${catOptions(f.cat)}</select><button class="icon-btn" data-action="del-fixed" data-id="${f.id}" aria-label="Remover gasto fixo">${XICON}</button></li>`).join("")}</ul><button class="btn" data-action="add-fixed">Adicionar gasto fixo</button></section>
${viewGoals()}
<section class="card"><h2>Sua conta</h2><div class="account-row"><p class="muted">${esc(user.email || "")}</p><div class="row"><button class="btn danger" data-action="clear-month">${clearArmed ? "Clique de novo para confirmar" : "Apagar lançamentos de " + monthName(cur)}</button><button class="btn" data-action="logout">Sair</button></div></div></section>
</div>`;
}

function viewLoading() {
  return '<div class="loading" role="status" aria-live="polite"><span class="spinner big" aria-hidden="true"></span><p class="muted">Carregando seus dados...</p></div>';
}

function render() {
  const top = $("#top");
  top.classList.toggle("auth", !user);
  const v = $("#view");
  if (booting) { v.innerHTML = viewLoading(); return; }
  if (!user) { v.innerHTML = viewLogin(); return; }
  $("#monthLabel").textContent = monthLabel(cur);
  document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
  if (loadingData) { v.innerHTML = viewLoading(); return; }
  v.innerHTML = tab === "resumo" ? viewResumo() : tab === "metas" ? viewMetas() : tab === "faturas" ? viewFaturas() : tab === "investimentos" ? viewInvest() : tab === "objetivos" ? viewObjetivos() : tab === "lancamentos" ? viewLanc() : viewAjustes();
  animateIn();
  if (tab === "ajustes") requestAnimationFrame(() => requestAnimationFrame(paintGoalChart));
}

function animateIn() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll(".liquid[data-top]").forEach((g) => { g.style.transform = `translateY(${g.dataset.top}px)`; });
    document.querySelectorAll("[data-dash]").forEach((c) => { c.style.strokeDasharray = c.dataset.dash; });
    document.querySelectorAll("[data-h]").forEach((b) => { b.style.height = b.dataset.h + "%"; });
    document.querySelectorAll("[data-w]").forEach((b) => { b.style.width = b.dataset.w + "%"; });
  }));
}

function setTab(t, keepFilter) {
  tab = t;
  if (!keepFilter) catFilter = null;
  clearArmed = false;
  removeArmed = null;
  render();
  const v = $("#view");
  v.classList.remove("view-in");
  void v.offsetWidth;
  v.classList.add("view-in");
}

function decode(buf) { try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch (e) { return new TextDecoder("windows-1252").decode(buf); } }

function parseOFX(text) {
  const out = [];
  for (const b of text.split(/<STMTTRN>/i).slice(1)) {
    const g = (tag) => { const m = b.match(new RegExp("<" + tag + ">([^<\\r\\n]*)", "i")); return m ? m[1].trim() : ""; };
    const amt = parseFloat(g("TRNAMT").replace(",", "."));
    const dt = g("DTPOSTED").slice(0, 8);
    if (isNaN(amt) || amt >= 0 || !/^\d{8}$/.test(dt)) continue;
    out.push({ date: `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`, desc: g("MEMO") || g("NAME") || "Sem descrição", amount: -amt, ref: g("FITID") });
  }
  return out;
}

function splitCSV(line, d) {
  const r = [];
  let c = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === d) { r.push(c); c = ""; }
    else c += ch;
  }
  r.push(c);
  return r.map((s) => s.trim());
}

function parseDate(s) {
  let m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

function parseCSV(text, kind) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) throw new Error("O arquivo está vazio.");
  let hi = -1, di, de, vi, d;
  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const dl = (lines[i].match(/;/g) || []).length >= (lines[i].match(/,/g) || []).length ? ";" : ",";
    const H = splitCSV(lines[i], dl).map(norm);
    const a = H.findIndex((h) => /^data|^date/.test(h));
    const b = H.findIndex((h) => /descri|histor|lancamento|title|estabelecimento|memo|^nome/.test(h));
    const c = H.findIndex((h) => /valor|amount|quantia/.test(h));
    if (a > -1 && b > -1 && c > -1) { hi = i; di = a; de = b; vi = c; d = dl; break; }
  }
  if (hi < 0) throw new Error("Não encontrei colunas de data, descrição e valor nesse CSV.");
  const out = [];
  for (const l of lines.slice(hi + 1)) {
    const r = splitCSV(l, d);
    const date = parseDate(r[di]);
    const v = parseMoney(r[vi]);
    if (!date || isNaN(v)) continue;
    const amount = kind === "cartao" ? v : -v;
    if (amount <= 0) continue;
    out.push({ date, desc: r[de] || "Sem descrição", amount });
  }
  return out;
}

async function importRows(rows) {
  if (!rows.length) { toast("Nenhum gasto encontrado nesse arquivo."); return; }
  const seen = {};
  const months = new Set();
  const recs = [];
  for (const r of rows) {
    const base = r.date + "|" + r.desc + "|" + r.amount.toFixed(2) + "|" + (r.ref || "");
    seen[base] = (seen[base] || 0) + 1;
    recs.push({ id: "i_" + hash(user.id + "|" + base + "#" + seen[base]), user_id: user.id, date: r.date, description: r.desc, amount: Math.round(r.amount * 100) / 100, category: classifyLocal(r.desc), source: "import" });
    months.add(r.date.slice(0, 7));
  }
  let added = 0;
  for (let i = 0; i < recs.length; i += 500) {
    const { data, error } = await sb.from("transactions").upsert(recs.slice(i, i + 500), { onConflict: "id", ignoreDuplicates: true }).select("id");
    if (error) { toast("Não consegui salvar a importação."); return; }
    added += (data || []).length;
  }
  if (!added) { toast("Esses gastos já estavam importados."); return; }
  for (const k of months) delete TX[k];
  cur = [...months].sort().pop();
  tab = "lancamentos";
  catFilter = null;
  await refresh(true);
  toast(`${added} ${added === 1 ? "gasto importado" : "gastos importados"}.`);
  if ((TX[cur] || []).some((t) => !t.cat)) classifyPending();
}

async function classifyPending() {
  if (classifying) return;
  classifying = true;
  render();
  try {
    const r = await api("classify");
    for (const k in TX) delete TX[k];
    await refresh(true, false);
    if (!r.aiAvailable && r.classified < r.pending) toast("A classificação por IA não está configurada no servidor. Escolha as categorias que faltam manualmente.");
    else if (r.classified) toast(`${r.classified} ${r.classified === 1 ? "gasto classificado" : "gastos classificados"}.`);
  } catch (e) {
    toast("Não consegui classificar agora: " + e.message);
  } finally {
    classifying = false;
    render();
  }
}

async function changeCat(id, v) {
  const t = (TX[cur] || []).find((x) => x.id === id);
  if (!t) return;
  t.cat = v || null;
  t.manual = true;
  t.ai = false;
  const { error } = await sb.from("transactions").update({ category: t.cat, manual: true, ai: false }).eq("id", id);
  if (error) { toast("Não consegui salvar a categoria."); return; }
  let n = 0;
  if (v) {
    const key = merchantKey(t.desc);
    if (key) {
      S.rules[key] = v;
      saveSettings();
      const { data } = await sb.from("transactions").select("id, description, category").eq("user_id", user.id).eq("manual", false).limit(5000);
      const ids = (data || []).filter((o) => o.id !== id && o.category !== v && merchantKey(o.description) === key).map((o) => o.id);
      for (let i = 0; i < ids.length; i += 300) {
        const { error: e2 } = await sb.from("transactions").update({ category: v, ai: false }).in("id", ids.slice(i, i + 300));
        if (!e2) n += Math.min(300, ids.length - i);
      }
      if (n) for (const k in TX) for (const o of TX[k]) if (ids.includes(o.id)) { o.cat = v; o.ai = false; }
    }
  }
  render();
  if (v) toast(n ? `Categoria salva. ${n} ${n === 1 ? "gasto parecido também foi atualizado" : "gastos parecidos também foram atualizados"}.` : "Categoria salva. Gastos parecidos vão usar essa categoria.");
}

function openAdd() {
  $("#aDesc").value = "";
  $("#aAmt").value = "";
  $("#aErr").textContent = "";
  const now = new Date();
  $("#aDate").value = keyOf(now) === cur ? `${keyOf(now)}-${String(now.getDate()).padStart(2, "0")}` : cur + "-01";
  $("#aCat").innerHTML = catOptions("", "Classificar automaticamente");
  $("#addDlg").showModal();
}

async function saveAdd() {
  const desc = $("#aDesc").value.trim();
  const amount = parseMoney($("#aAmt").value);
  const date = $("#aDate").value;
  const chosen = $("#aCat").value;
  if (!desc) { $("#aErr").textContent = "Informe uma descrição."; return; }
  if (!(amount > 0)) { $("#aErr").textContent = "Informe um valor maior que zero."; return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { $("#aErr").textContent = "Escolha uma data."; return; }
  const cat = chosen || classifyLocal(desc);
  const { error } = await sb.from("transactions").insert({ id: "m_" + uid(), user_id: user.id, date, description: desc, amount: Math.round(amount * 100) / 100, category: cat, manual: !!chosen, source: "manual" });
  if (error) { $("#aErr").textContent = "Não consegui salvar. Tente de novo."; return; }
  $("#addDlg").close();
  const k = date.slice(0, 7);
  delete TX[k];
  cur = k;
  await refresh(true);
  toast("Gasto adicionado.");
  if (!cat) classifyPending();
}

const remaining = (t) => Math.round((t.amount - (ABAT[t.id] || 0) - (RESERVED[t.id] || 0)) * 100) / 100;

function abatCandidates() {
  const q = norm($("#oSearch").value || "");
  const all = [];
  for (const k in TX) for (const t of TX[k]) if (remaining(t) > 0.005 && (!q || norm(t.desc).includes(q) || t.id in oDraft)) all.push(t);
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

function renderAbatList() {
  const list = abatCandidates();
  $("#oList").innerHTML = list.length
    ? list.map((t) => `<li class="o-row"><input type="checkbox" data-o-check="${esc(t.id)}"${t.id in oDraft ? " checked" : ""} aria-label="Selecionar ${esc(t.desc)}"><div><p>${esc(t.desc)}</p><p class="muted small">${t.date.slice(8, 10)}/${t.date.slice(5, 7)} · restam ${money(remaining(t))}</p></div><input type="text" inputmode="decimal" data-o-amt="${esc(t.id)}" value="${esc(oDraft[t.id] || "")}" placeholder="0,00"${t.id in oDraft ? "" : " disabled"} aria-label="Valor abatido"></li>`).join("")
    : '<li class="muted small">Nenhum lançamento encontrado.</li>';
  updateAbatSum();
}

function abatAllocs() {
  return Object.entries(oDraft).map(([id, v]) => ({ tx: id, amount: parseMoney(v) || 0 }));
}

function updateAbatSum() {
  if (oAuto) {
    const sumAll = abatAllocs().reduce((a, l) => a + l.amount, 0);
    $("#oAmt").value = sumAll > 0 ? numVal(sumAll) : "";
  }
  const recv = parseMoney($("#oAmt").value) || 0;
  const used = abatAllocs().reduce((a, l) => a + l.amount, 0);
  const left = Math.round((recv - used) * 100) / 100;
  $("#oSum").innerHTML = `Recebido ${money(recv)} · alocado ${money(used)} · <span class="${left < 0 ? "neg" : ""}">${left < 0 ? "excede em " + money(-left) : "sobra " + money(left)}</span>`;
}

function openAbat(mode) {
  oMode = mode;
  const cobr = mode === "cobr";
  $("#oTitle").textContent = cobr ? "Nova cobrança" : "Novo abatimento";
  $("#oAmtLabel").textContent = cobr ? "Valor a cobrar" : "Valor recebido";
  $("#oPersonLabel").textContent = cobr ? "Quem vai pagar" : "Pessoa (opcional)";
  $("#oDateLabel").textContent = cobr ? "Data da cobrança" : "Data do recebimento";
  $("#oSave").textContent = cobr ? "Salvar cobrança" : "Salvar abatimento";
  $("#oPerson").value = "";
  oDraft = {};
  oAuto = true;
  $("#oLinesLabel").textContent = cobr ? "Lançamentos cobrados" : "Lançamentos abatidos";
  $("#oAmt").value = "";
  $("#oNote").value = "";
  $("#oSearch").value = "";
  $("#oErr").textContent = "";
  const now = new Date();
  $("#oDate").value = `${keyOf(now)}-${String(now.getDate()).padStart(2, "0")}`;
  renderAbatList();
  $("#abatDlg").showModal();
}

async function saveAbat() {
  const amount = parseMoney($("#oAmt").value);
  const date = $("#oDate").value;
  const allocs = abatAllocs();
  const byId = {};
  for (const k in TX) for (const t of TX[k]) byId[t.id] = t;
  const person = $("#oPerson").value.trim();
  const cobr = oMode === "cobr";
  if (cobr && !person) { $("#oErr").textContent = "Informe o nome da pessoa."; return; }
  if (!(amount > 0)) { $("#oErr").textContent = cobr ? "Informe o valor a cobrar." : "Informe o valor recebido."; return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { $("#oErr").textContent = "Escolha uma data."; return; }
  if (!allocs.length) { $("#oErr").textContent = "Escolha ao menos um lançamento."; return; }
  if (allocs.some((l) => !(l.amount > 0))) { $("#oErr").textContent = "Informe o valor abatido de cada lançamento marcado."; return; }
  if (allocs.some((l) => l.amount > remaining(byId[l.tx]) + 0.005)) { $("#oErr").textContent = "Um dos valores passa do que resta no lançamento."; return; }
  if (allocs.reduce((a, l) => a + l.amount, 0) > amount + 0.005) { $("#oErr").textContent = "O total abatido passa do valor recebido."; return; }
  const rec = { id: "o_" + uid(), user_id: user.id, date, amount: Math.round(amount * 100) / 100, note: $("#oNote").value.trim() || null, person: person || null, status: cobr ? "pending" : "received", received_at: cobr ? null : date, allocations: allocs.map((l) => ({ tx: l.tx, amount: Math.round(l.amount * 100) / 100 })) };
  const { error } = await sb.from("offsets").insert(rec);
  if (error) { $("#oErr").textContent = "Não consegui salvar. Confira se a migração de abatimentos foi aplicada."; return; }
  $("#abatDlg").close();
  await loadItems();
  render();
  toast(cobr ? "Cobrança registrada." : "Abatimento registrado.");
}

const scripts = {};
function loadScript(src) {
  if (!scripts[src]) {
    scripts[src] = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = res;
      s.onerror = () => { delete scripts[src]; rej(new Error("não consegui carregar o widget do Pluggy")); };
      document.head.appendChild(s);
    });
  }
  return scripts[src];
}

async function connectBank(itemId) {
  if (connecting) return;
  connecting = true;
  render();
  try {
    toast("Abrindo a conexão com o banco...", true);
    const { accessToken } = await api("connect-token", itemId ? { itemId } : {});
    await loadScript(PLUGGY_CONNECT_SRC);
    const widget = new window.PluggyConnect({
      connectToken: accessToken,
      includeSandbox: PLUGGY_SANDBOX,
      onSuccess: async (data) => {
        const id = data && data.item && data.item.id;
        if (!id) return;
        linking = "Autorizado. Buscando seus gastos, contas e investimentos, isso pode levar alguns instantes.";
        toast("Banco autorizado. Sincronizando seus dados...", true);
        render();
        try {
          const r = await api("item-saved", { itemId: id });
          linking = "";
          await afterSync(r);
          toast(`Banco conectado e sincronizado.${r && r.inserted ? ` ${r.inserted} ${r.inserted === 1 ? "gasto importado" : "gastos importados"}.` : ""}`);
        } catch (e) {
          linking = "";
          toast("O banco foi conectado, mas a primeira sincronização falhou: " + e.message);
          await loadItems();
          render();
        }
      },
      onError: () => { linking = ""; toast("A conexão com o banco não foi concluída."); render(); },
    });
    await widget.init();
    if (!linking) $("#toast").classList.remove("show");
  } catch (e) {
    toast("Não consegui abrir a conexão: " + e.message);
  } finally {
    connecting = false;
    render();
  }
}

async function afterSync(r) {
  for (const k in TX) delete TX[k];
  await loadItems();
  await refresh(true);
  const n = (r && r.inserted) || 0;
  toast(n ? `${n} ${n === 1 ? "gasto novo" : "gastos novos"} dos seus bancos.` : "Tudo em dia. Nenhum gasto novo.");
}

async function syncNow() {
  if (syncing) return;
  syncing = true;
  render();
  try {
    const r = await api("sync");
    await afterSync(r);
    if (r.failures && r.failures.length) toast("Alguns bancos não sincronizaram. Veja o status em Ajustes.");
  } catch (e) {
    toast("Não consegui sincronizar: " + e.message);
  } finally {
    syncing = false;
    render();
  }
}

async function login() {
  const email = ($("#loginEmail").value || "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) { toast("Informe um e-mail válido."); return; }
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
  if (error) { toast("Não consegui enviar o link: " + error.message); return; }
  authSent = email;
  render();
}

async function setUser(u) {
  if ((u && u.id) === (user && user.id)) return;
  user = u;
  for (const k in TX) delete TX[k];
  S = defaults();
  items = [];
  accounts = [];
  bills = [];
  INV = [];
  INVTX = [];
  OFF = [];
  ABAT = {};
  RESERVED = {};
  if (channel) { sb.removeChannel(channel); channel = null; }
  loadingData = !!user;
  render();
  if (!user) return;
  try {
    await Promise.all([loadSettings(), loadItems(), loadIndicators()]);
    await refresh(true, false);
  } finally {
    loadingData = false;
    render();
  }
  channel = sb
    .channel("tx-" + user.id)
    .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: "user_id=eq." + user.id }, scheduleReload)
    .on("postgres_changes", { event: "*", schema: "public", table: "pluggy_items", filter: "user_id=eq." + user.id }, scheduleReload)
    .on("postgres_changes", { event: "*", schema: "public", table: "pluggy_accounts", filter: "user_id=eq." + user.id }, scheduleReload)
    .on("postgres_changes", { event: "*", schema: "public", table: "pluggy_bills", filter: "user_id=eq." + user.id }, scheduleReload)
    .subscribe();
}

document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const a = b.dataset.action;
  if (a === "login") login();
  else if (a === "auth-reset") { authSent = ""; render(); }
  else if (a === "logout") { await sb.auth.signOut(); }
  else if (a === "tab") setTab(b.dataset.tab);
  else if (a === "lanc-mode") { lancMode = b.dataset.mode; abatArmed = null; render(); }
  else if (a === "inv-open") openInvest(b.dataset.id);
  else if (a === "obj-new") openObj(null);
  else if (a === "obj-emergency") openObj(null, emergencyPreset());
  else if (a === "obj-edit") openObj(b.dataset.id);
  else if (a === "obj-save") saveObj();
  else if (a === "obj-del") {
    const id = b.dataset.id;
    if (objArmed !== id) { objArmed = id; render(); setTimeout(() => { if (objArmed === id) { objArmed = null; if (tab === "objetivos") render(); } }, 4000); return; }
    objArmed = null;
    S.objectives = (S.objectives || []).filter((x) => x.id !== id);
    saveSettings();
    render();
    toast("Objetivo excluído.");
  }
  else if (a === "abat-new") openAbat("abat");
  else if (a === "cobr-new") openAbat("cobr");
  else if (a === "cobr-paid") {
    const id = b.dataset.id;
    if (abatArmed !== "p:" + id) { abatArmed = "p:" + id; render(); setTimeout(() => { if (abatArmed === "p:" + id) { abatArmed = null; if (tab === "lancamentos") render(); } }, 4000); return; }
    abatArmed = null;
    const today = new Date();
    const day = `${keyOf(today)}-${String(today.getDate()).padStart(2, "0")}`;
    const { error } = await sb.from("offsets").update({ status: "received", received_at: day, date: day }).eq("id", id);
    if (error) { toast("Não consegui confirmar o recebimento."); render(); return; }
    await loadItems();
    render();
    toast("Recebimento confirmado. Virou um abatimento.");
  }
  else if (a === "abat-save") saveAbat();
  else if (a === "abat-del") {
    const id = b.dataset.id;
    if (abatArmed !== id) { abatArmed = id; render(); setTimeout(() => { if (abatArmed === id) { abatArmed = null; if (tab === "lancamentos") render(); } }, 4000); return; }
    abatArmed = null;
    const { error } = await sb.from("offsets").delete().eq("id", id);
    if (error) { toast("Não consegui excluir o abatimento."); render(); return; }
    await loadItems();
    render();
    toast("Abatimento excluído.");
  }
  else if (a === "filter-cat") { catFilter = b.dataset.cat; lancMode = "gastos"; setTab("lancamentos", true); }
  else if (a === "clear-filter") { catFilter = null; render(); }
  else if (a === "prev" || a === "next") { cur = shiftKey(cur, a === "prev" ? -1 : 1); clearArmed = false; await refresh(false); }
  else if (a === "meta-mode") { metaMode = b.dataset.mode; lsSet("metaMode", metaMode); render(); }
  else if (a === "import") $("#file").click();
  else if (a === "add") openAdd();
  else if (a === "add-save") saveAdd();
  else if (a === "close-dlg") b.closest("dialog").close();
  else if (a === "classify") classifyPending();
  else if (a === "sync") syncNow();
  else if (a === "connect") connectBank();
  else if (a === "reconnect") connectBank(b.dataset.id);
  else if (a === "remove-item") {
    const id = b.dataset.id;
    if (removeArmed !== id) { removeArmed = id; render(); setTimeout(() => { if (removeArmed === id) { removeArmed = null; if (tab === "ajustes") render(); } }, 4000); return; }
    removeArmed = null;
    try { await api("remove-item", { itemId: id }); await loadItems(); render(); toast("Banco desconectado. Os gastos já importados continuam salvos."); }
    catch (err) { toast("Não consegui desconectar: " + err.message); }
  }
  else if (a === "csv-confirm") {
    const kind = (document.querySelector('input[name="kind"]:checked') || {}).value || "conta";
    $("#csvDlg").close();
    try { await importRows(parseCSV(pendingCSV || "", kind)); } catch (err) { toast(err.message); }
    pendingCSV = null;
  }
  else if (a === "del-tx") {
    const id = b.dataset.id;
    const { error } = await sb.from("transactions").delete().eq("id", id);
    if (error) { toast("Não consegui remover."); return; }
    TX[cur] = (TX[cur] || []).filter((t) => t.id !== id);
    render();
    toast("Gasto removido.");
  }
  else if (a === "add-fixed") {
    S.fixed.push({ id: uid(), name: "", amount: 0, cat: "moradia", since: keyOf(new Date()) });
    saveSettings();
    render();
    const ins = document.querySelectorAll(".fixed-list li:last-child input");
    if (ins[0]) ins[0].focus();
  }
  else if (a === "del-fixed") { S.fixed = S.fixed.filter((f) => f.id !== b.dataset.id); saveSettings(); render(); }
  else if (a === "clear-month") {
    if (!clearArmed) { clearArmed = true; render(); setTimeout(() => { if (clearArmed) { clearArmed = false; if (tab === "ajustes") render(); } }, 4000); return; }
    clearArmed = false;
    const [s, f] = monthRange(cur);
    const { error } = await sb.from("transactions").delete().eq("user_id", user.id).gte("date", s).lt("date", f);
    if (error) { toast("Não consegui apagar."); return; }
    TX[cur] = [];
    render();
    toast(`Lançamentos de ${monthName(cur)} apagados.`);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "loginEmail") login();
});

document.addEventListener("change", async (e) => {
  const el = e.target;
  if (el.id === "file") {
    const f = el.files && el.files[0];
    el.value = "";
    if (!f) return;
    const text = decode(await f.arrayBuffer());
    if (/OFXHEADER|<OFX>/i.test(text)) { try { await importRows(parseOFX(text)); } catch (err) { toast("Não consegui ler esse arquivo OFX."); } }
    else { pendingCSV = text; $("#csvDlg").showModal(); }
  }
  else if (el.matches('[data-field="income"]')) { S.income = parseMoney(el.value) || 0; el.value = numVal(S.income); saveSettings(); }
  else if (el.matches("[data-goal]")) {
    const v = parseMoney(el.value);
    const id = el.dataset.goal;
    if (v > 0) S.goals[id] = v; else delete S.goals[id];
    el.value = numVal(S.goals[id]);
    saveSettings();
  }
  else if (el.matches("[data-fixed]")) {
    const f = S.fixed.find((x) => x.id === el.dataset.fixed);
    if (!f) return;
    const k = el.dataset.key;
    if (k === "amount") { f.amount = parseMoney(el.value) || 0; el.value = numVal(f.amount); } else f[k] = el.value;
    saveSettings();
  }
  else if (el.matches("[data-bank]")) {
    const v = el.value.trim();
    if (!S.bankNames) S.bankNames = {};
    if (v) S.bankNames[el.dataset.bank] = v; else delete S.bankNames[el.dataset.bank];
    el.value = bankName(el.dataset.bank);
    saveSettings();
  }
  else if (el.matches("[data-close]")) {
    const d = Math.min(Math.max(parseInt(el.value, 10) || 0, 0), 28);
    if (!S.cardClose) S.cardClose = {};
    if (d) S.cardClose[el.dataset.close] = d; else delete S.cardClose[el.dataset.close];
    saveSettings();
    render();
  }
  else if (el.matches(".cat-select")) changeCat(el.dataset.id, el.value);
});

let tiltEl = null;
const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");

function tiltReset() {
  if (!tiltEl) return;
  tiltEl.classList.remove("tilting");
  tiltEl.style.transform = "";
  tiltEl = null;
}

document.addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch" || (reduceMotion && reduceMotion.matches)) return;
  const el = e.target.closest ? e.target.closest(".cv") : null;
  if (tiltEl && tiltEl !== el) tiltReset();
  if (!el) return;
  tiltEl = el;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  el.classList.add("tilting");
  el.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
  el.style.setProperty("--my", (y * 100).toFixed(1) + "%");
  el.style.transform = `perspective(700px) rotateX(${((0.5 - y) * 16).toFixed(2)}deg) rotateY(${((x - 0.5) * 20).toFixed(2)}deg) scale(1.03)`;
});

document.addEventListener("mouseout", (e) => { if (!e.relatedTarget) tiltReset(); });

$("#abatDlg").addEventListener("input", (e) => {
  const el = e.target;
  if (el.id === "oSearch") { renderAbatList(); return; }
  if (el.id === "oAmt") oAuto = false;
  if (el.matches("[data-o-amt]")) oDraft[el.dataset.oAmt] = el.value;
  updateAbatSum();
});

$("#abatDlg").addEventListener("change", (e) => {
  const el = e.target;
  if (!el.matches("[data-o-check]")) return;
  const id = el.dataset.oCheck;
  const row = el.closest(".o-row");
  const inp = row.querySelector("[data-o-amt]");
  if (el.checked) {
    const t = Object.values(TX).flat().find((x) => x.id === id);
    oDraft[id] = numVal(remaining(t));
    inp.disabled = false;
    inp.value = oDraft[id];
  } else {
    delete oDraft[id];
    inp.disabled = true;
    inp.value = "";
  }
  updateAbatSum();
});

(async () => {
  render();
  const { data: { session } } = await sb.auth.getSession();
  booting = false;
  await setUser(session ? session.user : null);
  render();
  sb.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => setUser(session ? session.user : null), 0);
  });
})();