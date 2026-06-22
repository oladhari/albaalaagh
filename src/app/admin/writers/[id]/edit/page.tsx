"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AvatarUpload from "@/components/admin/AvatarUpload";

const ROLE_LABEL: Record<string, string> = { writer: "كاتب", editor: "محرر" };

export default function EditWriterPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", title: "", bio: "", image_url: "" });
  const [account, setAccount] = useState<{ user_id: string | null; role: string | null }>({ user_id: null, role: null });

  // Account creation form
  const [acEmail, setAcEmail]       = useState("");
  const [acPassword, setAcPassword] = useState("");
  const [acRole, setAcRole]         = useState<"writer" | "editor">("writer");
  const [acSaving, setAcSaving]     = useState(false);
  const [acError, setAcError]       = useState<string | null>(null);

  // Role change (already linked)
  const [newRole, setNewRole]       = useState<"writer" | "editor">("writer");
  const [roleSaving, setRoleSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/writers/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.name) {
          setForm({
            name:      data.name      ?? "",
            title:     data.title     ?? "",
            bio:       data.bio       ?? "",
            image_url: data.image_url ?? "",
          });
          setAccount({ user_id: data.user_id ?? null, role: data.role ?? null });
          setNewRole(data.role === "editor" ? "editor" : "writer");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.title) { setError("الاسم والصفة مطلوبان"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/admin/writers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      res.ok ? router.push("/admin/writers") : setError(data.error || "فشل الحفظ");
    } catch { setError("تعذّر الاتصال بالخادم"); }
    finally { setSaving(false); }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acEmail || !acPassword) { setAcError("البريد وكلمة المرور مطلوبان"); return; }
    setAcSaving(true); setAcError(null);
    try {
      const res = await fetch(`/api/admin/writers/${id}/account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: acEmail, password: acPassword, role: acRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setAccount({ user_id: data.writer.user_id, role: data.writer.role });
        setNewRole(data.writer.role);
        setSuccess(`تم إنشاء الحساب بنجاح لـ ${data.email}`);
        setAcEmail(""); setAcPassword("");
      } else {
        setAcError(data.error || "فشل إنشاء الحساب");
      }
    } catch { setAcError("تعذّر الاتصال بالخادم"); }
    finally { setAcSaving(false); }
  };

  const handleRoleChange = async () => {
    setRoleSaving(true);
    try {
      const res = await fetch(`/api/admin/writers/${id}/account`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setAccount((a) => ({ ...a, role: data.role }));
        setSuccess("تم تحديث الدور بنجاح");
      }
    } catch {}
    finally { setRoleSaving(false); }
  };

  const inputStyle: React.CSSProperties = {
    background: "#111008", border: "1px solid #2E2A18", color: "#F0EAD6",
    borderRadius: 8, padding: "10px 14px", width: "100%", outline: "none",
    fontFamily: "inherit", fontSize: 14,
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, color: "#9A9070", marginBottom: 6, fontWeight: 600,
  };

  if (loading) return <div className="text-center py-20" style={{ color: "#9A9070" }}>جارٍ التحميل...</div>;

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-black" style={{ color: "#F0EAD6" }}>تعديل الكاتب</h1>

      {success && (
        <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(107,203,119,0.1)", border: "1px solid rgba(107,203,119,0.3)", color: "#6BCB77" }}>
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(255,100,100,0.1)", border: "1px solid rgba(255,100,100,0.3)", color: "#FF6B6B" }}>
          {error}
        </div>
      )}

      {/* Profile form */}
      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>الاسم الكامل *</label>
            <input style={inputStyle} value={form.name} onChange={(e) => set("name", e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "#C9A844")} onBlur={(e) => (e.target.style.borderColor = "#2E2A18")} />
          </div>
          <div>
            <label style={labelStyle}>الصفة / المنصب *</label>
            <input style={inputStyle} placeholder="مثال: محرر سياسي" value={form.title} onChange={(e) => set("title", e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "#C9A844")} onBlur={(e) => (e.target.style.borderColor = "#2E2A18")} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>نبذة عن الكاتب</label>
          <textarea rows={4} style={{ ...inputStyle, resize: "vertical" }} placeholder="اكتب نبذة مختصرة..."
            value={form.bio} onChange={(e) => set("bio", e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = "#C9A844")} onBlur={(e) => (e.target.style.borderColor = "#2E2A18")} />
        </div>
        <div>
          <label style={labelStyle}>الصورة الشخصية</label>
          <AvatarUpload currentUrl={form.image_url} onUploaded={(url) => set("image_url", url)} />
          <input type="text" style={{ ...inputStyle, marginTop: 8, fontSize: 12 }} placeholder="أو الصق رابط الصورة مباشرة..."
            value={form.image_url} onChange={(e) => set("image_url", e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = "#C9A844")} onBlur={(e) => (e.target.style.borderColor = "#2E2A18")} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-full text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}>
            {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
          </button>
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 rounded-full text-sm font-medium border"
            style={{ borderColor: "#2E2A18", color: "#9A9070" }}>
            إلغاء
          </button>
        </div>
      </form>

      {/* Account section */}
      <div className="pt-4 border-t" style={{ borderColor: "#2E2A18" }}>
        <h2 className="text-base font-bold mb-4" style={{ color: "#C9A844" }}>حساب المنصة</h2>

        {account.user_id ? (
          /* Already linked */
          <div className="p-4 rounded-xl space-y-4" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(107,203,119,0.15)", color: "#6BCB77" }}>
                ✓ مرتبط بالمنصة
              </span>
              <span className="text-xs" style={{ color: "#9A9070" }}>
                الدور الحالي: <strong style={{ color: "#F0EAD6" }}>{ROLE_LABEL[account.role ?? "writer"] ?? account.role}</strong>
              </span>
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label style={labelStyle}>تغيير الدور</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value as "writer" | "editor")} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="writer">كاتب</option>
                  <option value="editor">محرر (كاتب + إرسال أخبار)</option>
                </select>
              </div>
              <button onClick={handleRoleChange} disabled={roleSaving || newRole === account.role}
                className="px-5 py-2.5 rounded-full text-sm font-bold shrink-0 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}>
                {roleSaving ? "..." : "تحديث"}
              </button>
            </div>
          </div>
        ) : (
          /* Not yet linked — create account */
          <form onSubmit={handleCreateAccount} className="p-4 rounded-xl space-y-4" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
            <p className="text-xs" style={{ color: "#9A9070" }}>
              إنشاء حساب دخول يتيح لهذا الكاتب تسجيل الدخول إلى المنصة ورفع مقالاته.
            </p>
            {acError && (
              <div className="p-2 rounded-lg text-xs" style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", color: "#FF6B6B" }}>
                {acError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>البريد الإلكتروني *</label>
                <input type="email" value={acEmail} onChange={(e) => setAcEmail(e.target.value)} required
                  style={{ ...inputStyle, direction: "ltr" }} placeholder="name@example.com"
                  onFocus={(e) => (e.target.style.borderColor = "#C9A844")} onBlur={(e) => (e.target.style.borderColor = "#2E2A18")} />
              </div>
              <div>
                <label style={labelStyle}>كلمة المرور *</label>
                <input type="text" value={acPassword} onChange={(e) => setAcPassword(e.target.value)} required
                  style={{ ...inputStyle, direction: "ltr", fontFamily: "monospace" }} placeholder="••••••••"
                  onFocus={(e) => (e.target.style.borderColor = "#C9A844")} onBlur={(e) => (e.target.style.borderColor = "#2E2A18")} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>الدور</label>
              <select value={acRole} onChange={(e) => setAcRole(e.target.value as "writer" | "editor")} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="writer">كاتب — يكتب مقالات فقط</option>
                <option value="editor">محرر — يكتب مقالات + يُرسل أخباراً</option>
              </select>
            </div>
            <button type="submit" disabled={acSaving} className="px-6 py-2.5 rounded-full text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #4A90E2, #2A6DB5)", color: "#fff" }}>
              {acSaving ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
