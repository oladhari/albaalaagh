import type { Article, Writer } from "@/types";

// Listing cards never render article bodies or private writer profile fields.
export const ARTICLE_CARD_FIELDS = "id,slug,title,excerpt,cover_image,category,published_at,writer:writers(name,image_url)";
export type ArticleCardData = Pick<Article, "id" | "slug" | "title" | "excerpt" | "cover_image" | "category" | "published_at"> & {
  writer?: Pick<Writer, "name" | "image_url"> | null;
};
