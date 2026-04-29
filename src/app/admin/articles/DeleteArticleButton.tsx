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
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-danger/20 text-danger"
        >
          {deleting ? "..." : "تأكيد"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text-muted"
        >
          إلغاء
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-danger/[0.08] text-danger"
    >
      حذف
    </button>
  );
}
