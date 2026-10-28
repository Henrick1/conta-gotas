export const CATEGORIES: Record<string, string> = {
  mercado: "Mercado",
  restaurantes: "Alimentação",
  transporte: "Transporte",
  moradia: "Moradia",
  contas: "Contas da casa",
  saude: "Saúde",
  lazer: "Lazer",
  compras: "Compras",
  assinaturas: "Assinaturas",
  educacao: "Educação",
  outros: "Outros",
};

const KEYWORDS: [RegExp, string][] = [
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

const PLUGGY_MAP: [RegExp, string][] = [
  [/grocer|supermarket/, "mercado"],
  [/eating out|restaurant|food delivery|bars|coffee|bakery/, "restaurantes"],
  [/streaming|digital service|software|subscription/, "assinaturas"],
  [/taxi|ride|transport|gas station|fuel|parking|toll|automotive|vehicle/, "transporte"],
  [/rent|housing|condominium|mortgage/, "moradia"],
  [/utilit|electricity|water|telecom|internet|mobile|phone/, "contas"],
  [/health|pharma|drugstore|hospital|dental|medical/, "saude"],
  [/leisure|entertainment|travel|lodging|hotel|airline|ticket|culture|sport|gaming/, "lazer"],
  [/shopping|clothing|electronics|department store|online/, "compras"],
  [/education|school|course|university|book/, "educacao"],
];

const IGNORED_CATEGORY = /credit card payment|same person transfer|investment|proceeds|loan/;
const IGNORED_DESCRIPTION = / pagamento (de )?fatura | pgto fatura | pag fatura | pagto fatura | aplicacao | resgate /;

export function norm(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9& ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function merchantKey(s: string): string {
  return norm(s).replace(/\d+/g, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 3).join(" ");
}

export function isIgnored(description: string, pluggyCategory: string | null): boolean {
  if (pluggyCategory && IGNORED_CATEGORY.test(pluggyCategory.toLowerCase())) return true;
  return IGNORED_DESCRIPTION.test(` ${norm(description)} `);
}

export function classifyLocal(description: string, pluggyCategory: string | null, rules: Record<string, string>): string | null {
  const key = merchantKey(description);
  if (rules[key] && CATEGORIES[rules[key]]) return rules[key];
  const text = ` ${norm(description)} `;
  for (const [re, cat] of KEYWORDS) if (re.test(text)) return cat;
  if (pluggyCategory) {
    const pc = pluggyCategory.toLowerCase();
    for (const [re, cat] of PLUGGY_MAP) if (re.test(pc)) return cat;
  }
  return null;
}

export type Classifiable = { description: string; amount: number; category: string | null; ai?: boolean };

function buildPrompt(batch: Classifiable[]): string {
  return `Você classifica gastos de extratos bancários e faturas de cartão no Brasil.
Categorias permitidas, pelo id: ${Object.entries(CATEGORIES).map(([id, name]) => `${id} (${name})`).join(", ")}.
Escolha a categoria mais provável de cada item a partir da descrição do estabelecimento. Use "outros" só quando não houver pista.
Responda somente com um objeto JSON que mapeia o índice de cada item para o id da categoria, por exemplo {"0":"mercado","1":"transporte"}, sem nenhum texto fora do JSON.
Itens (índice, descrição, valor em reais):
${batch.map((r, i) => `${i}\t${r.description}\t${Number(r.amount).toFixed(2)}`).join("\n")}`;
}

export async function classifyWithAI(rows: Classifiable[]): Promise<{ available: boolean; done: number }> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return { available: false, done: 0 };
  const model = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-5-5";
  let done = 0;
  for (let i = 0; i < rows.length; i += 60) {
    const batch = rows.slice(i, i + 60);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 2048, messages: [{ role: "user", content: buildPrompt(batch) }] }),
    });
    if (!res.ok) throw new Error(`Anthropic falhou (${res.status}): ${await res.text()}`);
    const body = await res.json();
    const text = (body.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) continue;
    let map: Record<string, string>;
    try {
      map = JSON.parse(match[0]);
    } catch {
      continue;
    }
    batch.forEach((row, j) => {
      const cat = map[String(j)];
      if (cat && CATEGORIES[cat]) {
        row.category = cat;
        row.ai = true;
        done++;
      }
    });
  }
  return { available: true, done };
}
