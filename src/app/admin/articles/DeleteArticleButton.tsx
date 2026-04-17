"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteArticleButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/admin/articles/${id}`, { method: "DELETE", credentials: "include" });
    router.refresh();
  };

  if (confirm) {
    return (
      <div className="flex gap-1">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{ background: "rgba(255,107,107,0.2)", color: "#FF6B6B" }}
        >
          {deleting ? "..." : "تأكيد"}
        </button>
        <button
          onClick={() => setConfirm(false)}
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
      onClick={() => setConfirm(true)}
      className="px-3 py-1.5 rounded-lg text-xs font-medium"
      style={{ background: "rgba(255,107,107,0.08)", color: "#FF6B6B" }}
    >
      حذف
    </button>
  );
}
