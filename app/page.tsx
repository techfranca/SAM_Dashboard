"use client";

import { useState, useEffect, useCallback } from "react";

interface Action { action_type: string; value: string }
interface AdRow {
  ad_name: string; campaign_name: string; spend: string; impressions: string;
  clicks: string; cpc: string; ctr: string;
  actions?: Action[]; action_values?: Action[]; cost_per_action_type?: Action[];
  date_start: string; date_stop: string;
}

function getAction(actions: Action[] | undefined, type: string): number {
  return Number(actions?.find(a => a.action_type === type)?.value || 0);
}

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtMoney(n: number): string { return `R$ ${fmt(n)}`; }
function fmtPct(n: number): string { return `${fmt(n, 1)}%`; }

function getDefaultDates() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - diff);
  const toStr = (d: Date) => d.toISOString().split("T")[0];
  return { since: toStr(monday), until: toStr(today) };
}

export default function Dashboard() {
  const defaults = getDefaultDates();
  const [since, setSince] = useState(defaults.since);
  const [until, setUntil] = useState(defaults.until);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adData, setAdData] = useState<AdRow[]>([]);
  const [dailyData, setDailyData] = useState<AdRow[]>([]);
  const [lastUpdate, setLastUpdate] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [adRes, dailyRes] = await Promise.all([
        fetch(`/api/meta?since=${since}&until=${until}&level=ad`),
        fetch(`/api/meta?since=${since}&until=${until}&level=daily`),
      ]);
      const adJson = await adRes.json();
      const dailyJson = await dailyRes.json();
      if (adJson.error) throw new Error(adJson.error);
      if (dailyJson.error) throw new Error(dailyJson.error);
      setAdData(adJson.data || []);
      setDailyData(dailyJson.data || []);
      setLastUpdate(new Date().toLocaleString("pt-BR"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [since, until]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalSpend = adData.reduce((s, r) => s + Number(r.spend), 0);
  const totalImpressions = adData.reduce((s, r) => s + Number(r.impressions), 0);
  const totalClicks = adData.reduce((s, r) => s + Number(r.clicks), 0);
  const totalLinkClicks = adData.reduce((s, r) => s + getAction(r.actions, "link_click"), 0);
  const totalLPV = adData.reduce((s, r) => s + getAction(r.actions, "landing_page_view"), 0);
  const totalCheckouts = adData.reduce((s, r) => s + getAction(r.actions, "initiate_checkout"), 0);
  const totalPurchases = adData.reduce((s, r) => s + getAction(r.actions, "purchase"), 0);
  const totalAddPayment = adData.reduce((s, r) => s + getAction(r.actions, "offsite_conversion.fb_pixel_add_payment_info"), 0);

  const connectRate = totalLinkClicks > 0 ? (totalLPV / totalLinkClicks) * 100 : 0;
  const convPage = totalLPV > 0 ? (totalCheckouts / totalLPV) * 100 : 0;
  const convCheckout = totalCheckouts > 0 ? (totalPurchases / totalCheckouts) * 100 : 0;
  const convFunnel = totalLinkClicks > 0 ? (totalPurchases / totalLinkClicks) * 100 : 0;
  const cpa = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const cpcLink = totalLinkClicks > 0 ? totalSpend / totalLinkClicks : 0;
  const days = dailyData.length || 1;

  const adsSorted = [...adData].sort((a, b) => Number(b.spend) - Number(a.spend));
  const funnelMax = Math.max(totalLinkClicks, 1);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "'Inter', sans-serif" }}>
      {/* HEADER */}
      <div style={{ padding: "36px 40px 32px", borderBottom: "1px solid var(--border)", background: "linear-gradient(180deg, rgba(168,85,247,0.06) 0%, transparent 100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>Dashboard de Performance</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Cremasco & Vianna — Ética OAB</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <input type="date" value={since} onChange={e => setSince(e.target.value)}
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 13 }} />
            <span style={{ color: "var(--muted)", fontSize: 13 }}>ate</span>
            <input type="date" value={until} onChange={e => setUntil(e.target.value)}
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 13 }} />
            <button onClick={loadData} disabled={loading}
              style={{ background: loading ? "var(--surface3)" : "var(--purple)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: loading ? "wait" : "pointer", letterSpacing: "0.03em" }}>
              {loading ? "Carregando..." : "Atualizar"}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
            {days} dias · {lastUpdate && `Atualizado: ${lastUpdate}`}
          </p>
        </div>
      </div>

      {error && (
        <div style={{ margin: "20px 40px", padding: 16, background: "rgba(255,59,48,0.1)", border: "1px solid rgba(255,59,48,0.3)", borderRadius: 12, color: "#ff3b30", fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ padding: "40px", maxWidth: 1100, margin: "0 auto" }}>
        {/* HERO CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 40 }}>
          <HeroCard label="Vendas Pixel" value={totalPurchases.toString()} sub="no periodo" color="green" />
          <HeroCard label="CPA" value={totalPurchases > 0 ? fmtMoney(cpa) : "—"} sub="Custo por venda" color="orange" />
          <HeroCard label="Investimento" value={fmtMoney(totalSpend)} sub={`${fmtMoney(totalSpend / days)}/dia`} color="purple" />
          <HeroCard label="Connect Rate" value={fmtPct(connectRate)} sub={connectRate < 80 ? "Abaixo de 80%" : "Saudavel"} color={connectRate < 80 ? "orange" : "green"} />
        </div>

        {/* FUNNEL */}
        <SectionTitle text="Funil Completo" />
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, marginBottom: 40, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--purple), var(--blue))" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            <FunnelStep label="Cliques no link" value={totalLinkClicks} width={100} rate="" color="linear-gradient(135deg, var(--purple), #7c3aed)" />
            <FunnelStep label="Landing Page Views" value={totalLPV} width={(totalLPV / funnelMax) * 100} rate={`CR: ${fmtPct(connectRate)}`} color="linear-gradient(135deg, #6366f1, var(--blue))" />
            <FunnelStep label="Checkouts" value={totalCheckouts} width={Math.max((totalCheckouts / funnelMax) * 100, 8)} rate={`Conv: ${fmtPct(convPage)}`} color="linear-gradient(135deg, var(--blue), var(--orange))" />
            <FunnelStep label="Compras" value={totalPurchases} width={Math.max((totalPurchases / funnelMax) * 100, 5)} rate={`Conv: ${fmtPct(convCheckout)}`} color="linear-gradient(135deg, var(--orange), var(--green))" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <FooterStat label="CPM" value={fmtMoney(cpm)} />
            <FooterStat label="Conv. Funil" value={fmtPct(convFunnel)} />
            <FooterStat label="CPA" value={totalPurchases > 0 ? fmtMoney(cpa) : "—"} />
            <FooterStat label="CPC Link" value={fmtMoney(cpcLink)} />
          </div>
        </div>

        {/* METRICAS */}
        <SectionTitle text="Metricas Gerais" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 40 }}>
          <Card>
            <StatRow label="Impressoes" value={totalImpressions.toLocaleString("pt-BR")} />
            <StatRow label="CPM" value={fmtMoney(cpm)} />
            <StatRow label="CTR" value={fmtPct(totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0)} />
            <StatRow label="Cliques totais" value={totalClicks.toLocaleString("pt-BR")} />
            <StatRow label="Link clicks" value={totalLinkClicks.toLocaleString("pt-BR")} />
            <StatRow label="CPC link" value={fmtMoney(cpcLink)} />
          </Card>
          <Card>
            <StatRow label="Landing Page Views" value={totalLPV.toLocaleString("pt-BR")} />
            <StatRow label="Connect Rate" value={fmtPct(connectRate)} color={connectRate < 80 ? "orange" : "green"} />
            <StatRow label="Checkouts" value={totalCheckouts.toLocaleString("pt-BR")} />
            <StatRow label="Add Payment Info" value={totalAddPayment.toLocaleString("pt-BR")} />
            <StatRow label="Conv. Pagina" value={fmtPct(convPage)} />
            <StatRow label="Conv. Checkout" value={fmtPct(convCheckout)} />
            <StatRow label="Conv. Funil" value={fmtPct(convFunnel)} color={convFunnel > 2.5 ? "green" : undefined} />
          </Card>
        </div>

        {/* ANUNCIOS TABLE */}
        <SectionTitle text="Performance por Anuncio" />
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 40, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Anuncio", "Tipo", "Gasto", "%", "Vendas", "CPA", "Cliques", "CPC", "LPV", "CR"].map(h => (
                  <th key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", textAlign: h === "Anuncio" ? "left" : "right", padding: "0 8px 12px", borderBottom: "1px solid var(--border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adsSorted.map((ad, i) => {
                const spend = Number(ad.spend);
                const linkClicks = getAction(ad.actions, "link_click");
                const lpv = getAction(ad.actions, "landing_page_view");
                const purchases = getAction(ad.actions, "purchase");
                const cr = linkClicks > 0 ? (lpv / linkClicks) * 100 : 0;
                const adCpa = purchases > 0 ? spend / purchases : 0;
                const adCpc = linkClicks > 0 ? spend / linkClicks : 0;
                const pctGasto = totalSpend > 0 ? (spend / totalSpend) * 100 : 0;
                const tipo = ad.ad_name.includes("[VD]") ? "VD" : ad.ad_name.includes("[FT]") ? "FT" : ad.ad_name.includes("[CR]") ? "CR" : "—";
                const name = ad.ad_name.replace(/^\d{2}\.\d{2}\.\d{2} - /, "").replace(/\[.*?\] - /, "").replace(/\[(VD|FT|CR)\] /, "");
                return (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 8px", fontSize: 12, fontWeight: 600, textAlign: "left", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</td>
                    <td style={{ padding: "10px 8px", fontSize: 11, textAlign: "right", color: "var(--muted)" }}>{tipo}</td>
                    <td style={{ padding: "10px 8px", fontSize: 12, fontWeight: 600, textAlign: "right" }}>{fmtMoney(spend)}</td>
                    <td style={{ padding: "10px 8px", fontSize: 11, textAlign: "right", color: "var(--muted)" }}>{fmtPct(pctGasto)}</td>
                    <td style={{ padding: "10px 8px", fontSize: 12, fontWeight: 700, textAlign: "right", color: purchases > 0 ? "var(--green)" : "var(--muted)" }}>{purchases || "—"}</td>
                    <td style={{ padding: "10px 8px", fontSize: 12, fontWeight: 600, textAlign: "right", color: "var(--orange)" }}>{purchases > 0 ? fmtMoney(adCpa) : "—"}</td>
                    <td style={{ padding: "10px 8px", fontSize: 12, textAlign: "right" }}>{linkClicks || "—"}</td>
                    <td style={{ padding: "10px 8px", fontSize: 12, textAlign: "right" }}>{linkClicks > 0 ? fmtMoney(adCpc) : "—"}</td>
                    <td style={{ padding: "10px 8px", fontSize: 12, textAlign: "right" }}>{lpv || "—"}</td>
                    <td style={{ padding: "10px 8px", fontSize: 12, textAlign: "right", color: cr > 0 && cr < 80 ? "var(--orange)" : cr >= 80 ? "var(--green)" : "var(--muted)" }}>{cr > 0 ? fmtPct(cr) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* DAILY TABLE */}
        <SectionTitle text="Performance Diaria" />
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 40, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Data", "Invest", "Cliques", "LPV", "CR", "Checkouts", "Vendas"].map(h => (
                  <th key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", textAlign: h === "Data" ? "left" : "right", padding: "0 8px 12px", borderBottom: "1px solid var(--border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dailyData.sort((a, b) => a.date_start.localeCompare(b.date_start)).map((d, i) => {
                const spend = Number(d.spend);
                const lc = getAction(d.actions, "link_click");
                const lpv = getAction(d.actions, "landing_page_view");
                const ck = getAction(d.actions, "initiate_checkout");
                const p = getAction(d.actions, "purchase");
                const cr = lc > 0 ? (lpv / lc) * 100 : 0;
                const dateStr = new Date(d.date_start + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", weekday: "short" });
                return (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 8px", fontSize: 12, textAlign: "left", color: "var(--muted)" }}>{dateStr}</td>
                    <td style={{ padding: "10px 8px", fontSize: 12, fontWeight: 600, textAlign: "right" }}>{fmtMoney(spend)}</td>
                    <td style={{ padding: "10px 8px", fontSize: 12, textAlign: "right" }}>{lc}</td>
                    <td style={{ padding: "10px 8px", fontSize: 12, textAlign: "right" }}>{lpv}</td>
                    <td style={{ padding: "10px 8px", fontSize: 12, textAlign: "right", color: cr < 80 ? "var(--orange)" : "var(--green)" }}>{lc > 0 ? fmtPct(cr) : "—"}</td>
                    <td style={{ padding: "10px 8px", fontSize: 12, textAlign: "right" }}>{ck}</td>
                    <td style={{ padding: "10px 8px", fontSize: 12, fontWeight: 700, textAlign: "right", color: p > 0 ? "var(--green)" : "var(--muted)" }}>{p || "0"}</td>
                  </tr>
                );
              })}
              <tr>
                <td style={{ padding: "10px 8px", fontSize: 12, fontWeight: 800, textAlign: "left" }}>TOTAL</td>
                <td style={{ padding: "10px 8px", fontSize: 12, fontWeight: 800, textAlign: "right" }}>{fmtMoney(totalSpend)}</td>
                <td style={{ padding: "10px 8px", fontSize: 12, fontWeight: 800, textAlign: "right" }}>{totalLinkClicks}</td>
                <td style={{ padding: "10px 8px", fontSize: 12, fontWeight: 800, textAlign: "right" }}>{totalLPV}</td>
                <td style={{ padding: "10px 8px", fontSize: 12, fontWeight: 800, textAlign: "right", color: connectRate < 80 ? "var(--orange)" : "var(--green)" }}>{fmtPct(connectRate)}</td>
                <td style={{ padding: "10px 8px", fontSize: 12, fontWeight: 800, textAlign: "right" }}>{totalCheckouts}</td>
                <td style={{ padding: "10px 8px", fontSize: 12, fontWeight: 800, textAlign: "right", color: "var(--green)" }}>{totalPurchases}</td>
              </tr>
            </tbody>
          </table>
        </div>


        {/* WEEKLY TABLE */}
        <SectionTitle text="Análise por Semana" />
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 40, overflowX: "auto" }}>
          <WeeklyTable dailyData={dailyData} />
        </div>

        <div style={{ padding: "24px 0", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)" }}>
          <span><strong style={{ color: "var(--text)" }}>Franca Marketing</strong> · Dashboard ao vivo</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>Dados: Meta Ads Graph API</span>
        </div>
      </div>
    </div>
  );
}

function HeroCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, { main: string; border: string; glow: string }> = {
    green: { main: "var(--green)", border: "rgba(0,217,126,0.2)", glow: "rgba(0,217,126,0.15)" },
    blue: { main: "var(--blue)", border: "rgba(0,104,255,0.2)", glow: "rgba(0,104,255,0.15)" },
    orange: { main: "var(--orange)", border: "rgba(255,107,43,0.2)", glow: "rgba(255,107,43,0.15)" },
    purple: { main: "var(--purple)", border: "rgba(168,85,247,0.2)", glow: "rgba(168,85,247,0.15)" },
  };
  const c = colors[color] || colors.blue;
  return (
    <div style={{ background: "var(--surface)", border: `1px solid ${c.border}`, borderRadius: 16, padding: "24px 20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: c.main }} />
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: c.main }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{sub}</div>
      <div style={{ position: "absolute", bottom: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)` }} />
    </div>
  );
}

function SectionTitle({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
      {text}
      <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </div>
  );
}

function FunnelStep({ label, value, width, rate, color }: { label: string; value: number; width: number; rate: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", width: 130, textAlign: "right", flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 40, background: "var(--surface3)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.max(width, 5)}%`, background: color, borderRadius: 8, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", transition: "width 0.6s ease" }}>
          {value}
        </div>
      </div>
      <div style={{ width: 120, textAlign: "right", fontSize: 12, color: "var(--muted)", flexShrink: 0 }}>{rate}</div>
    </div>
  );
}

function FooterStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", color: "var(--muted)", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>{children}</div>;
}


function WeeklyTable({ dailyData }: { dailyData: AdRow[] }) {
  if (!dailyData.length) return <p style={{ fontSize: 13, color: "var(--muted)" }}>Sem dados</p>;

  // Group by week (Mon-Sun)
  const weeks: Record<string, AdRow[]> = {};
  const sorted = [...dailyData].sort((a, b) => a.date_start.localeCompare(b.date_start));

  sorted.forEach(d => {
    const date = new Date(d.date_start + "T12:00:00");
    const day = date.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(date);
    monday.setDate(date.getDate() - diff);
    const key = monday.toISOString().split("T")[0];
    if (!weeks[key]) weeks[key] = [];
    weeks[key].push(d);
  });

  const weekKeys = Object.keys(weeks).sort();

  const weekStats = weekKeys.map(key => {
    const rows = weeks[key];
    const spend = rows.reduce((s, r) => s + Number(r.spend), 0);
    const impressions = rows.reduce((s, r) => s + Number(r.impressions), 0);
    const clicks = rows.reduce((s, r) => s + Number(r.clicks), 0);
    const linkClicks = rows.reduce((s, r) => s + getAction(r.actions, "link_click"), 0);
    const lpv = rows.reduce((s, r) => s + getAction(r.actions, "landing_page_view"), 0);
    const checkouts = rows.reduce((s, r) => s + getAction(r.actions, "initiate_checkout"), 0);
    const purchases = rows.reduce((s, r) => s + getAction(r.actions, "purchase"), 0);
    const cr = linkClicks > 0 ? (lpv / linkClicks) * 100 : 0;
    const convPage = lpv > 0 ? (checkouts / lpv) * 100 : 0;
    const convCheckout = checkouts > 0 ? (purchases / checkouts) * 100 : 0;
    const convFunnel = linkClicks > 0 ? (purchases / linkClicks) * 100 : 0;
    const cpa = purchases > 0 ? spend / purchases : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    const cpc = linkClicks > 0 ? spend / linkClicks : 0;
    const cps = lpv > 0 ? spend / lpv : 0;

    const monday = new Date(key + "T12:00:00");
    const lastDay = new Date(rows[rows.length - 1].date_start + "T12:00:00");
    const fmtD = (dt: Date) => dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const label = fmtD(monday) + " a " + fmtD(lastDay);

    return { label, spend, impressions, clicks, linkClicks, lpv, checkouts, purchases, cr, convPage, convCheckout, convFunnel, cpa, cpm, cpc, cps };
  });

  const metrics: { label: string; key: string; format: (v: number) => string; color?: (v: number) => string }[] = [
    { label: "Investimento", key: "spend", format: fmtMoney },
    { label: "CPM", key: "cpm", format: fmtMoney },
    { label: "Cliques link", key: "linkClicks", format: v => v.toLocaleString("pt-BR") },
    { label: "CPC", key: "cpc", format: fmtMoney },
    { label: "Landing Page Views", key: "lpv", format: v => v.toLocaleString("pt-BR") },
    { label: "Connect Rate", key: "cr", format: fmtPct, color: v => v < 80 ? "var(--orange)" : "var(--green)" },
    { label: "Checkouts", key: "checkouts", format: v => v.toLocaleString("pt-BR") },
    { label: "Vendas", key: "purchases", format: v => v.toLocaleString("pt-BR"), color: v => v > 0 ? "var(--green)" : "var(--muted)" },
    { label: "CPA", key: "cpa", format: v => v > 0 ? fmtMoney(v) : "—", color: () => "var(--orange)" },
    { label: "CPS (custo/sessão)", key: "cps", format: fmtMoney },
    { label: "Conv. Página", key: "convPage", format: fmtPct },
    { label: "Conv. Checkout", key: "convCheckout", format: fmtPct },
    { label: "Conv. Funil", key: "convFunnel", format: fmtPct, color: v => v > 2.5 ? "var(--green)" : "var(--text)" },
  ];

  const colW = Math.max(120, 100);

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", textAlign: "left", padding: "0 8px 12px", borderBottom: "1px solid var(--border)", minWidth: 160 }}>Métrica</th>
          {weekStats.map((w, i) => (
            <th key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", textAlign: "right", padding: "0 8px 12px", borderBottom: "1px solid var(--border)", minWidth: colW }}>{w.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {metrics.map((m, mi) => (
          <tr key={mi} style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={{ padding: "10px 8px", fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>{m.label}</td>
            {weekStats.map((w, wi) => {
              const val = (w as Record<string, number>)[m.key];
              return (
                <td key={wi} style={{ padding: "10px 8px", fontSize: 12, fontWeight: 600, textAlign: "right", color: m.color ? m.color(val) : "var(--text)" }}>
                  {m.format(val)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 13, color: "var(--muted)" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: color ? `var(--${color})` : "var(--text)" }}>{value}</span>
    </div>
  );
}
