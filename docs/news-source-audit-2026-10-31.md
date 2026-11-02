# News source extraction audit — 31 October 2026

## Release correction — 3 November 2026

The checks below did not establish a durable Git-backed production release.
On 3 November the production alias pointed to commit `e89e07c`, which lacked
the shortlist and publisher extraction changes still present only in the local
working tree. A subsequent main deployment therefore served the old news list.
Do not interpret the earlier live-test results as proof of current deployment.
The release correction commits these changes together so future main deployments
retain them. Fresh local checks retrieved actual article bodies from three
current Mosaïque RSS articles; regression checks also cover the India and
Switzerland stories incorrectly classified as Tunisian in the reported screen.

Local read-only checks of the original 16 configured public feeds and 38
article/event URLs were followed by live production draft-only checks. No news
was published and no historical report content was changed. Mosaïque and the
replacement BBC Arabic generated live review previews; France 24 failed live
production fetching despite passing locally.

| Source | Article/event retrieval |
|---|---|
| موزاييك FM | 2/2 |
| الجزيرة | 2/2 |
| نواة | 2/2 |
| أخبار الأمم المتحدة | 2/2 |
| رئاسة الحكومة التونسية | 2/2 |
| DW عربية | 2/2 |
| BBC World | 2/2 |
| الأناضول | 2/2 |
| USGS | 2/2 |
| GDACS | 2/2 |
| BBC Technology | 2/2 |
| MIT Technology Review | 2/2 |
| TechCrunch | 2/2 |
| NASA | 2/2 |
| Ars Technica | 2/2 |
| فرانس 24 عربي | 8/8 locally; production retrieval failed, feed replaced |
| BBC عربي (replacement) | body extraction and live draft generation passed |

Findings and corrections:

- Mosaïque: HTML article body is embedded in its matched Next.js hydration record; the visible article element can be empty.
- Anadolu: streamed prose may follow an empty initial main element.
- UN News: an earlier empty article teaser must not hide the real main content.
- France 24: scope the main article/live-blog content and omit related/promotion blocks. Production-server access remained unreliable, so BBC Arabic replaces this discovery feed.
- NASA: public 192.0.66.x addresses were rejected by an overbroad reserved-range rule. Private address protection remains.
- USGS: the browser app shell is not evidence; retrieve validated official event data through GeoJSON.
- GDACS: browser-compatible RSS request headers, HTTPS report links and labelled summary-table extraction restore retrieval. Green alerts are hidden only in the important shortlist.

All originally sampled article bodies/event records passed local retrieval after these changes. Live deployment testing additionally identified the France 24 production failure and verified the BBC Arabic replacement. This is a point-in-time sample, not a guarantee that publishers never change their markup or impose access restrictions. Insufficient/blocked bodies still stop generation.

Regression coverage checks title/metadata-only rejection, URL-matched hydration, streamed bodies, unrelated-content exclusion, private redirects, NASA addresses, official event data, shortlist limits, preserved technology choices, distinct casualty counts and story-based geography.
