import { AwsClient } from "aws4fetch";

const ENDPOINT  = (process.env.R2_ENDPOINT  ?? "").replace(/\/$/, "");
const BUCKET    = process.env.R2_BUCKET     ?? "albaalaagh";
const PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

const r2 = new AwsClient({
  accessKeyId:     (process.env.R2_ACCESS_KEY_ID ?? "").trim(),
  secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY ?? "").trim(),
  service: "s3",
  region:  "auto",
});

export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  const url = `${ENDPOINT}/${BUCKET}/${key}`;
  const res = await r2.fetch(url, {
    method:  "PUT",
    headers: { "Content-Type": contentType },
    body: body as unknown as BodyInit,
  });
  if (!res.ok) throw new Error(`R2 upload failed: ${res.status} ${await res.text()}`);
  return `${PUBLIC_URL}/${key}`;
}
