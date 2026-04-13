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
  title: string;
  excerpt: string;
  url: string;
  source: string;
  source_logo?: string;
  image_url?: string;
  published_at: string;
  status: "pending" | "approved" | "rejected";
  category?: string;
  created_at: string;
}

export interface Writer {
  id: string;
  name: string;
  title: string;
  bio: string;
  image_url?: string;
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
  { name: "يوتيوب",    url: "https://www.youtube.com/@albaalaagh",        icon: "youtube"   },
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

export const VIDEO_CATEGORIES = [
  "مقابلات سياسية", "حوارات فكرية", "شهادات", "تحليلات", "متنوع"
] as const;

export const NEWS_SOURCES = [
  { name: "موزاييك FM",       rss: "https://www.mosaiquefm.net/rss/ar/news/last",          logo: "" },
  { name: "نواة",             rss: "https://nawaat.org/feed/",                              logo: "" },
  { name: "بزنس نيوز",        rss: "https://www.businessnews.com.tn/feed",                  logo: "" },
  { name: "الجزيرة",          rss: "https://www.aljazeera.net/xml/rss/all.xml",             logo: "" },
  { name: "العربي الجديد",    rss: "https://www.alaraby.co.uk/rss.xml",                     logo: "" },
  { name: "القدس العربي",     rss: "https://www.alquds.co.uk/feed/",                        logo: "" },
] as const;
