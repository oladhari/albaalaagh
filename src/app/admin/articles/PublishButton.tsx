"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PublishButton({ articleId }: { articleId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const publish = async () => {
    setLoading(true);
    await fetch(`/api/admin/articles/${articleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "published", published: true }),
    });
    router.refresh();
    setLoading(false);
  };

  return (
    <button
      onClick={publish}
      disabled={loading}
      className="px-3 py-1.5 rounded-lg text-xs font-bold"
      style={{ background: "rgba(107,203,119,0.15)", color: "#6BCB77" }}
    >
      {loading ? "..." : "نشر"}
    </button>
  );
}
