export interface Video {
  id: string;
  youtube_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  published_at: string;
  duration?: string;
  view_count?: number;
  guest_id?: string;
  category?: string;
  created_at: string;
}

export interface Guest {
  id: string;
  name: string;
  title: string;
  bio?: string;
  image_url?: string;
  category: "وزير" | "برلماني" | "ناشط" | "مفكر" | "صحفي" | "أكاديمي" | "آخر";
  created_at: string;
}

export interface NewsArticle {
  id: string;
  slug?: string | null;
  title: string;
  excerpt: string;
  url: string;
  source: string;
  source_logo?: string;
  image_url?: string;
  published_at: string;
  status: "pending" | "approved" | "rejected";
  category?: string;
  geo?: "tunisia" | "arab" | "international" | "general";
  priority_score?: number;
  source_language?: "ar" | "en";
  source_kind?: "official" | "agency" | "media" | "emergency" | "science";
  source_topic?: "tunisia" | "arab" | "international" | "technology" | "disaster";
  news_citations?: NewsCitation[];
  created_at: string;
}

export interface NewsCitation {
  id?: string;
  name: string;
  url: string;
  kind: "official" | "agency" | "media" | "document" | "interview";
  is_primary: boolean;
  published_at?: string | null;
}

export interface Writer {
  id: string;
  name: string;
  title: string;
  bio: string;
  image_url?: string;
  created_at: string;
}

export interface WriterArticle {
  id: string;
  title: string;
  excerpt: string;
  url: string;
  image_url?: string;
  writer_name: string;
  source?: string;
  published_at: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  cover_image?: string;
  writer_id?: string;
  writer?: Writer;
  category: string;
  published: boolean;
  published_at: string;
  created_at: string;
}

export const SOCIAL_LINKS = [
  { name: "يوتيوب",    url: "https://www.youtube.com/@chokrimajouli",     icon: "youtube"   },
  { name: "فيسبوك",   url: "https://www.facebook.com/albaalaagh",         icon: "facebook"  },
  { name: "إكس",      url: "https://x.com/albaalaagh",                    icon: "x"         },
  { name: "إنستغرام", url: "https://www.instagram.com/albaalaagh/",       icon: "instagram" },
  { name: "تيك توك",  url: "https://www.tiktok.com/@albaalaagh",          icon: "tiktok"    },
  { name: "أمة",      url: "https://ummah.ps/@albalagh",                  icon: "ummah"     },
  { name: "لينكدإن",  url: "https://www.linkedin.com/company/albaalaagh/",icon: "linkedin"  },
  { name: "تويتش",    url: "https://www.twitch.tv/albaalaagh",            icon: "twitch"    },
  { name: "كيك",      url: "https://kick.com/albaalaagh",                 icon: "kick"      },
] as const;

export const ARTICLE_CATEGORIES = [
  "سياسة", "دين", "فكر وفلسفة", "اقتصاد", "مجتمع", "ثقافة", "دولي"
] as const;

export const NEWS_CATEGORIES = [
  "سياسة", "اقتصاد", "مجتمع", "قضاء", "أمن", "رياضة", "ثقافة", "تكنولوجيا", "بيئة", "صحة", "تعليم", "عام"
] as const;

export const VIDEO_CATEGORIES = [
  "مقابلات سياسية", "حوارات فكرية", "شهادات", "تحليلات", "متنوع"
] as const;

// Writers whose articles we auto-fetch via Google News RSS
export const WRITERS = [
  { name: "أبو يعرب المرزوقي" },
  { name: "خميس الماجري" },
  { name: "شكري مجولي" },
  { name: "صلاح الدين الجورشي" },
  { name: "صابر النفزاوي" },
  { name: "عبد المجيد النجار" },
  { name: "منصف المرزوقي" },
  { name: "الحبيب اللوز" },
  { name: "سيف الدين مخلوف" },
  { name: "ماهر زيد" },
  { name: "عبد اللطيف المكي" },
] as const;

export const NEWS_SOURCES = [
  // Tunisia: primary institutions first, followed by established local media.
  { name: "رئاسة الحكومة التونسية", rss: "https://www.pm.gov.tn/ar/rss.xml", language: "ar", kind: "official", topic: "tunisia", maxItems: 15 },
  { name: "موزاييك FM", rss: "https://www.mosaiquefm.net/ar/rss", language: "ar", kind: "media", topic: "tunisia", maxItems: 25 },
  { name: "نواة", rss: "https://nawaat.org/feed/", language: "ar", kind: "media", topic: "tunisia", maxItems: 10 },

  // Arabic regional and international coverage.
  { name: "الجزيرة", rss: "https://www.aljazeera.net/rss", language: "ar", kind: "media", topic: "arab", maxItems: 20 },
  { name: "الأناضول", rss: "https://www.aa.com.tr/ar/rss/default?cat=live", language: "ar", kind: "agency", topic: "arab", maxItems: 20 },
  { name: "أخبار الأمم المتحدة", rss: "https://news.un.org/feed/subscribe/ar/news/all/rss.xml", language: "ar", kind: "official", topic: "international", maxItems: 15 },
  { name: "DW عربية", rss: "https://rss.dw.com/rdf/rss-ar-all", language: "ar", kind: "media", topic: "international", maxItems: 15 },
  { name: "فرانس 24 عربي", rss: "https://www.france24.com/ar/rss", language: "ar", kind: "media", topic: "international", maxItems: 15 },

  // English discovery feeds. Published reports must be translated, attributed,
  // verified, and expanded with Albaalaagh context in the review screen.
  { name: "BBC World", rss: "https://feeds.bbci.co.uk/news/world/rss.xml", language: "en", kind: "media", topic: "international", maxItems: 15 },
  { name: "GDACS", rss: "https://www.gdacs.org/xml/rss.xml", language: "en", kind: "emergency", topic: "disaster", maxItems: 12 },
  { name: "USGS", rss: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.atom", language: "en", kind: "official", topic: "disaster", maxItems: 8 },

  // Technology and science.
  { name: "BBC Technology", rss: "https://feeds.bbci.co.uk/news/technology/rss.xml", language: "en", kind: "media", topic: "technology", maxItems: 12 },
  { name: "MIT Technology Review", rss: "https://www.technologyreview.com/feed/", language: "en", kind: "media", topic: "technology", maxItems: 10 },
  { name: "Ars Technica", rss: "https://feeds.arstechnica.com/arstechnica/index", language: "en", kind: "media", topic: "technology", maxItems: 10 },
  { name: "TechCrunch", rss: "https://techcrunch.com/feed/", language: "en", kind: "media", topic: "technology", maxItems: 10 },
  { name: "NASA", rss: "https://www.nasa.gov/news-release/feed/", language: "en", kind: "science", topic: "technology", maxItems: 8 },
] as const;
