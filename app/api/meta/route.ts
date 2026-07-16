import { NextRequest, NextResponse } from "next/server";

const AD_ACCOUNT = "2670890493222140";
const ACCESS_TOKEN = "EAAN3q0wCnlEBRPqfL4NFQLzOiSkiY5zXYbSSQwZBcOrZB02paZBEen01JniFSm25QyYHGwveSf773tQgPWLa2ZCs4ZBKpvu7TPGZAYQ203MCyAJ8kRY06aHwXx8G2YPJJNiZAZC6VSJWNUvqfBY1EK8UHRua53WQ0vqtcKa6bBpZBBmZC3wUyzb3g6xtHZCXXkW8AZDZD";

interface GraphRow {
  ad_name: string;
  ad_id: string;
  adset_name: string;
  campaign_name: string;
  spend: string;
  impressions: string;
  clicks: string;
  cpc: string;
  cpm: string;
  ctr: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
  cost_per_action_type?: { action_type: string; value: string }[];
  date_start: string;
  date_stop: string;
}

async function fetchAllPages(url: string): Promise<GraphRow[]> {
  const rows: GraphRow[] = [];
  let nextUrl: string | null = url;
  while (nextUrl) {
    const res: Response = await fetch(nextUrl, { cache: "no-store" });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    rows.push(...(json.data || []));
    nextUrl = json.paging?.next || null;
  }
  return rows;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const since = searchParams.get("since");
  const until = searchParams.get("until");
  const level = searchParams.get("level") || "ad";

  if (!since || !until) {
    return NextResponse.json({ error: "since and until required" }, { status: 400 });
  }

  const timeRange = JSON.stringify({ since, until });

  let fields: string;
  if (level === "account") {
    fields = "spend,impressions,reach,clicks,cpc,cpm,ctr,actions,action_values,cost_per_action_type";
  } else if (level === "campaign") {
    fields = "campaign_name,campaign_id,spend,impressions,reach,clicks,cpc,cpm,ctr,actions,action_values,cost_per_action_type";
  } else if (level === "daily") {
    fields = "spend,impressions,reach,clicks,cpc,cpm,ctr,actions,action_values,cost_per_action_type";
  } else {
    fields = "ad_name,ad_id,adset_name,campaign_name,spend,impressions,clicks,cpc,ctr,actions,action_values,cost_per_action_type";
  }

  try {
    let url = `https://graph.facebook.com/v21.0/act_${AD_ACCOUNT}/insights?fields=${encodeURIComponent(fields)}&time_range=${encodeURIComponent(timeRange)}&limit=500&access_token=${ACCESS_TOKEN}`;

    if (level === "campaign") url += "&level=campaign";
    else if (level === "daily") url += "&time_increment=1";
    else if (level === "ad") url += "&level=ad";

    const data = await fetchAllPages(url);
    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
