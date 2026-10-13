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
          className="px-2 py-1.5 rounded-lg text-xs font-bold bg-danger/15 text-danger"
        >
          تأكيد
        </button>
        <button
          onClick={() => setState("idle")}
          className="px-2 py-1.5 rounded-lg text-xs font-bold bg-bg-card text-text-muted border border-border"
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
      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-danger/30 text-danger shrink-0"
    >
      {state === "loading" ? "..." : "إلغاء النشر"}
    </button>
  );
}
