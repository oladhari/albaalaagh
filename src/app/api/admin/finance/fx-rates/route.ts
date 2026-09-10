import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const res = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
  if (!res.ok) return NextResponse.json({ error: "تعذّر جلب أسعار الصرف" }, { status: 502 });

  const data = await res.json();
  const usdToTnd = data?.rates?.TND;
  const usdToJpy = data?.rates?.JPY;
  if (!usdToTnd || !usdToJpy) return NextResponse.json({ error: "تعذّر جلب أسعار الصرف" }, { status: 502 });

  const jpyToTnd = usdToTnd / usdToJpy;

  return NextResponse.json({
    fx_usd_to_tnd: Number(usdToTnd.toFixed(4)),
    fx_jpy_to_tnd: Number(jpyToTnd.toFixed(5)),
    updated: data.time_last_update_utc,
  });
}
