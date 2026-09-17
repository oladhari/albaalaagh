# Albaalaagh — Financial & Business Handoff

Context for the Claude session working in the albaalaagh.com project. This summarizes findings from a separate conversation (personal credit card / subscription cleanup) that are directly relevant to building out Albaalaagh's CRM / income-tracking section. Written 2026-08-28.

## Background

Albaalaagh (البلاغ) is a YouTube + Facebook content channel run by the user, who personally handles nearly all production work: banner/graphic design (Photoshop, and now AI tools — Grok, ChatGPT), livestreaming, cutting livestreams into Reels/Shorts via a custom-built tool called **araclip** (took days to develop and is still being enhanced), uploading, and writing titles/descriptions. A small team helps "through the platform" in a more limited capacity. Only the user has access to the full financial picture (cards, subscriptions, revenue dashboards) — the team currently sees none of this.

The user wants to:

1. Start treating Albaalaagh as a real company with proper income/expense tracking.
2. Build an income/CRM section on albaalaagh.com so the team can see results.
3. Eventually reach enough independent income to pay the team from actual profits (not there yet).
4. Send the team a monthly report of results — but wants to frame it carefully (share the numbers plainly rather than emphasizing "this is mainly my work," to avoid team friction).

## Current financial reality (important — read before designing anything)

The business is **not yet self-sustaining**. All tool/subscription costs are currently paid personally, mostly on the user's credit cards (which have separate, serious problems: poor credit history, a card currently suspended for non-payment, ~¥124,348 in revolving debt, and salary-date/due-date mismatches causing repeated missed payments). The user is in the process of moving personal and business subscription payments off credit cards onto a **Resona Bank debit Visa card**, funded manually each month, specifically to stop the credit-card payment-failure cycle.

**Do not assume the business has spare cash.** Any CRM/reporting feature should default to showing the business is currently running at a loss funded by the user's personal salary, until real numbers say otherwise.

## Monthly subscription/tool costs (business + personal, mostly business)

Compiled from actual Gmail receipts and Moneyforward transaction history (Jan–Aug 2026), not estimates:

| Service                            | Monthly cost                                                             | Purpose                                                              |
| ---------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| StreamYard (Advanced, 4 seats)     | ~¥14,500 ($88.99)                                                       | Livestreaming — core of the content pipeline                        |
| Claude AI (Anthropic subscription) | ~¥3,450 ($22)                                                           | AI tooling / araclip development                                     |
| Vercel                             | ~¥3,257 ($22)                                                           | Hosting (albaalaagh.com and/or araclip)                              |
| AutoDS                             | ~¥6,452 ($49.80)                                                        | Separate dropshipping side-business tool                             |
| Adobe                              | ¥2,380                                                                  | Photoshop — banner/graphic design                                   |
| Meta ads                           | ¥4,182 (baseline; was briefly ¥12,547 during a heavier ad-spend month) | Facebook/Instagram ad spend                                          |
| Squarespace                        | ¥1,386                                                                  | Website hosting/plan                                                 |
| Suno Pro                           | ~¥1,650 ($10)                                                           | AI music generation for content                                      |
| X (Twitter) Premium                | ¥918                                                                    | Discovered via transaction history, not email — genuinely recurring |
| Railway                            | ~¥800 (usage-based)                                                     | Hosting/infra, no email receipts, found via bank data only           |
| Webshare                           | ~¥500 ($3.50)                                                           | Proxy service                                                        |
| DigitalOcean                       | ~¥600–3,700 (usage-based)                                              | Infra                                                                |
| Cloudflare                         | ~¥0–2,150 (usage-based)                                                | Domain/Workers                                                       |
| ChatGPT (individual)               | $22 (~¥3,300)                                                           | Currently on spouse's card; user wants to move this to himself       |

**/Total: roughly ¥43,000–48,000/month.** Two items are NOT business subscriptions and should be excluded from any business P&L: PayPal "SAIDSHOP" charges (family halal meat shopping) and recurring PayPal "Roblox" charges (Robux for the user's kids). An OpenAI Business seat that also appeared in the data has been cancelled (was temporary, for a friend's studies, now finished).

## Revenue findings (as of screenshots dated 2026-08-28)

**Facebook Professional Dashboard:**

- Last 28 days (Jul 31–Aug 27): $119.37 approximate earnings (+392%), 4,501,477 views (+407%)
- Last 90 days (May 30–Aug 27): $180.85 total (+199.1%) — meaning ~$61 came from the first ~62 days and ~$119 came from just the most recent 28 days. This is a real, recent inflection point, not a stable average.
- Earnings breakdown (90 days): Content monetization $167.54, Subscriptions $6.81, Stars $6.50 — monetization is almost entirely Reels-driven.

**YouTube Studio:**

- 2026 YTD (Jan 1–Aug 26): $1,686.63 estimated revenue, 33,395 subscribers, 1,280,336 views. Views graph shows the same kind of recent acceleration spike seen on Facebook.
- A clean "last 28 days" YouTube figure (to match the Facebook number) was requested but **not yet captured** — this is the first thing to pull for an accurate current combined run-rate.

**Seasonality noted by the user:** June/July activity and revenue dipped due to the World Cup and summer holidays — considered a seasonal effect, not a structural problem. Autumn is expected to recover. The user also flagged that some planned livestreams were cancelled, and since the content pipeline is livestream → araclip → clips → both platforms, every cancelled stream directly reduces output on both channels that month.

## Recommended next steps for the albaalaagh.com project

1. **Build a simple monthly income/expense ledger first**, before anything fancier — pull in the subscription cost table above as the expense side, and a manual or API-based entry for YouTube/Facebook revenue as the income side. The goal is a clear monthly profit/loss number, most likely negative for now.
2. **Track revenue by platform and by source** (YouTube ad revenue; Facebook content monetization / subscriptions / stars) — the user is already checking these manually in each platform's dashboard, so ingesting or replicating that breakdown would be useful.
3. **Design the team-facing CRM/income section to show results, not raw financials.** The user explicitly does not want to frame reports around "this is mainly due to my work" — team-facing views should present shared numbers plainly (views, revenue, growth) rather than a breakdown that assigns credit.
4. **Do not build any "pay the team" feature yet.** The user's stated target is to reach independent income before committing to team payments — a payout/compensation module is premature until the ledger shows sustained positive monthly profit.
5. **Consider a livestream-schedule tracker** tied to output — since cancelled streams measurably hurt both platforms' monthly numbers, a simple calendar/reminder view showing planned vs. completed streams could directly support the revenue goal.
6. **Keep personal and business expenses separated** going forward — the user is actively working on this on the personal-finance side (Moneyforward, a dedicated debit card for subscriptions); the albaalaagh.com project should assume clean business-only inputs once that separation is in place, and flag anything that looks personal (as SAIDSHOP/Roblox turned out to be) for confirmation rather than auto-including it.
