export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT ?? "",
  credentials: {
    accessKeyId:     (process.env.R2_ACCESS_KEY_ID ?? "").trim(),
    secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY ?? "").trim(),
  },
});

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4", "video/webm", "video/quicktime", "video/x-matroska",
  "video/avi", "video/x-msvideo",
]);

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { filename, contentType } = await req.json();
  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename and contentType required" }, { status: 400 });
  }
  if (!ALLOWED_VIDEO_TYPES.has(contentType)) {
    return NextResponse.json({ error: "نوع الملف غير مدعوم. يُقبل: MP4, WebM, MOV, MKV" }, { status: 400 });
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? "mp4";
  const key = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const bucket = process.env.R2_BUCKET ?? "albaalaagh";
  const publicUrl = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  return NextResponse.json({ uploadUrl, publicUrl: `${publicUrl}/${key}` });
}
