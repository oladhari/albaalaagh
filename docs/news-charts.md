# Charts in the news editor

Place a chart after the relevant paragraph in the existing HTML body field of a
news item. Each chart uses one `figure` marker with a JSON attribute. The news
detail page validates the payload and renders SVG, an expandable HTML data table
and source links on the server. Saving and publishing the news item use the
existing workflow.

```html
<figure data-article-chart='{"type":"bar","title":"عنوان الرسم","caption":"وصف الاتجاه أو تفسير الأرقام.","unit":"مليار دينار تونسي","estimateLabel":"تقديرات قانون المالية","periods":[{"label":"2025"},{"label":"2026","estimated":true}],"series":[{"label":"اسم المؤشر","color":"gold","values":[3.9,4.4]}],"sources":[{"label":"وزارة المالية التونسية","url":"https://www.finances.gov.tn/fr/les-indicateurs/depenses"}]}'></figure>
```

- Use `bar` for one series, `grouped` for two to four series, or
  `stacked-percent` for two to four series that total 100 in each period.
- Enter non-negative numbers in the order of the periods. The chart displays the
  first period on the right. All axes start at zero.
- Set the same `axisMax` on monetary charts that readers should compare directly.
- Mark forecast periods with `"estimated":true`. Supply `estimateLabel` when the
  figures have an official designation.
- Available colors are `gold`, `domestic`, `external`, `equipment` and
  `investment`. Use HTTPS source URLs.
- In a single-quoted HTML attribute encode any literal apostrophe inside the
  JSON as `&#39;` and any ampersand as `&amp;`. Invalid chart data leaves any
  existing sanitized fallback content inside the figure visible.
- The output is vector artwork. A browser can capture the entire figure as PNG
  to keep the Arabic title, legend, and source with the plot when sharing.
