import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID = "e413ad7c-c670-4750-b8a4-0e99b8bf2c8c";
const CLIENT_SECRET = "976700ae-b5cc-4b9c-9a36-f1fe59a683fa";
const BASIC = "Basic ZTQxM2FkN2MtYzY3MC00NzUwLWI4YTQtMGU5OWI4YmYyYzhjOjk3NjcwMGFlLWI1Y2MtNGI5Yy05YTM2LWYxZmU1OWE2ODNmYQ==";

interface HotmartSale {
  purchase: {
    price: { currency_code: string; value: number };
    hotmart_fee?: { total: number };
    transaction: string;
    status: string;
    approved_date?: number;
    order_date: number;
    payment?: { method: string };
    is_subscription?: boolean;
  };
  product: { id: number; name: string };
  buyer?: { name: string };
}

async function getToken(): Promise<string> {
  const res = await fetch(
    `https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`,
    { method: "POST", headers: { Authorization: BASIC }, cache: "no-store" }
  );
  const json = await res.json();
  if (!json.access_token) throw new Error("Hotmart auth falhou");
  return json.access_token;
}

async function fetchAllSales(token: string, start: number, end: number): Promise<HotmartSale[]> {
  const sales: HotmartSale[] = [];
  let pageToken: string | null = null;
  do {
    const params = new URLSearchParams({
      start_date: String(start),
      end_date: String(end),
      max_results: "500",
    });
    if (pageToken) params.set("page_token", pageToken);
    const res: Response = await fetch(
      `https://developers.hotmart.com/payments/api/v1/sales/history?${params}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    const json = await res.json();
    if (json.error || json.error_description) throw new Error(json.error_description || json.error);
    sales.push(...(json.items || []));
    pageToken = json.page_info?.next_page_token || null;
  } while (pageToken);
  return sales;
}

const APPROVED = new Set(["APPROVED", "COMPLETE"]);
const REFUNDED = new Set(["REFUNDED", "CHARGEBACK"]);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const since = searchParams.get("since");
  const until = searchParams.get("until");
  if (!since || !until) {
    return NextResponse.json({ error: "since and until required" }, { status: 400 });
  }

  const start = new Date(`${since}T00:00:00-03:00`).getTime();
  const end = Math.min(new Date(`${until}T23:59:59-03:00`).getTime(), Date.now());

  try {
    const token = await getToken();
    const sales = await fetchAllSales(token, start, end);

    let vendas = 0, bruto = 0, taxas = 0, reembolsos = 0, reembolsoValor = 0;
    const porProduto: Record<string, { vendas: number; bruto: number; liquido: number; reembolsos: number }> = {};
    const porDia: Record<string, { vendas: number; bruto: number }> = {};

    for (const s of sales) {
      const valor = s.purchase.price?.value || 0;
      const taxa = s.purchase.hotmart_fee?.total || 0;
      const prod = s.product?.name || "—";
      if (!porProduto[prod]) porProduto[prod] = { vendas: 0, bruto: 0, liquido: 0, reembolsos: 0 };

      if (APPROVED.has(s.purchase.status)) {
        vendas++;
        bruto += valor;
        taxas += taxa;
        porProduto[prod].vendas++;
        porProduto[prod].bruto += valor;
        porProduto[prod].liquido += valor - taxa;
        const dia = new Date(s.purchase.approved_date || s.purchase.order_date)
          .toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
        if (!porDia[dia]) porDia[dia] = { vendas: 0, bruto: 0 };
        porDia[dia].vendas++;
        porDia[dia].bruto += valor;
      } else if (REFUNDED.has(s.purchase.status)) {
        reembolsos++;
        reembolsoValor += valor;
        porProduto[prod].reembolsos++;
      }
    }

    return NextResponse.json({
      vendas,
      bruto,
      taxas,
      liquido: bruto - taxas,
      reembolsos,
      reembolsoValor,
      porProduto: Object.entries(porProduto)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.bruto - a.bruto),
      porDia,
      totalTransacoes: sales.length,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro Hotmart" },
      { status: 500 }
    );
  }
}
