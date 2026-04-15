"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteWriterButton({ writerId }: { writerId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/writers/${writerId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || "فشل الحذف");
      setLoading(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex gap-1 shrink-0 self-start">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{ background: "rgba(255,107,107,0.2)", color: "#FF6B6B" }}
        >
          {loading ? "..." : "تأكيد"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border"
          style={{ borderColor: "#2E2A18", color: "#9A9070" }}
        >
          إلغاء
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border self-start"
      style={{ borderColor: "#2E2A18", color: "#FF6B6B" }}
    >
      حذف
    </button>
  );
}
