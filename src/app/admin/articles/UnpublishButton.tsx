"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UnpublishButton({ articleId }: { articleId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "loading">("idle");

  const unpublish = async () => {
    setState("loading");
    await fetch(`/api/admin/articles/${articleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "draft" }),
    });
    router.refresh();
  };

  if (state === "confirm") {
    return (
      <div className="flex gap-1 shrink-0">
        <button
          onClick={unpublish}
          className="px-2 py-1.5 rounded-lg text-xs font-bold"
          style={{ background: "rgba(255,107,107,0.15)", color: "#FF6B6B" }}
        >
          تأكيد
        </button>
        <button
          onClick={() => setState("idle")}
          className="px-2 py-1.5 rounded-lg text-xs font-bold"
          style={{ background: "#1A1810", color: "#9A9070", border: "1px solid #2E2A18" }}
        >
          إلغاء
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setState("confirm")}
      disabled={state === "loading"}
      className="px-3 py-1.5 rounded-lg text-xs font-medium border shrink-0"
      style={{ borderColor: "rgba(255,107,107,0.3)", color: "#FF6B6B" }}
    >
      {state === "loading" ? "..." : "إلغاء النشر"}
    </button>
  );
}
