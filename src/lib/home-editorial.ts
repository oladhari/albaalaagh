import { supabaseAdmin } from "./supabase";
import { REPORT_CATEGORIES } from "./reports";
import { PROGRAMME_ARTICLE_CATEGORY } from "./programme-articles";

const SECTIONS = [
  { key: "reports", title: "تقارير", subtitle: "شرح وتحليل بالبيانات والمصادر", href: "/reports" },
  { key: "programmes", title: "من برامجنا", subtitle: "أبرز الأفكار من حواراتنا وحلقاتنا", href: "/from-programmes" },
  { key: "articles", title: "المقالات", subtitle: "قراءات وتحليلات من أقلام متميزة", href: "/articles" },
  { key: "religion", title: "قضايا شرعية", subtitle: "قضايا وتحليلات شرعية من منظور علمي رصين", href: "/qadaya-sharia" },
] as const;

export async function getHomeEditorialSections() {
  return Promise.all(SECTIONS.map(async section => {
    let query = supabaseAdmin.from("articles").select("*, writer:writers(*)")
      .eq("status", "published").eq("published", true);
    if (section.key === "reports") query = query.in("category", [...REPORT_CATEGORIES]);
    else if (section.key === "programmes") query = query.eq("category", PROGRAMME_ARTICLE_CATEGORY);
    else if (section.key === "religion") query = query.eq("category", "دين");
    else query = query.not("category", "in", `(${[...REPORT_CATEGORIES, PROGRAMME_ARTICLE_CATEGORY, "دين"].map(c => `"${c}"`).join(",")})`);
    const { data, error } = await query.order("published_at", { ascending: false }).limit(3);
    if (error) console.error(`Unable to load home editorial section: ${section.key}`);
    return { ...section, articles: data ?? [] };
  }));
}
