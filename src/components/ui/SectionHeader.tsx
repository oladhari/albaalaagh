"use client";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  linkHref?: string;
  linkLabel?: string;
}

export default function SectionHeader({
  title,
  subtitle,
  linkHref,
  linkLabel = "عرض الكل",
}: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between mb-8">
      <div>
        <h2
          className="text-2xl sm:text-3xl font-black mb-1"
          style={{
            background: "linear-gradient(135deg, #E8D5A3 0%, #C9A844 60%, #9A7B28 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm" style={{ color: "#9A9070" }}>
            {subtitle}
          </p>
        )}
        <div
          className="mt-2 h-0.5 w-16"
          style={{
            background: "linear-gradient(90deg, #C9A844, transparent)",
          }}
        />
      </div>
      {linkHref && (
        <a
          href={linkHref}
          className="text-sm font-medium px-4 py-1.5 rounded-full border transition-all duration-200"
          style={{
            color: "#C9A844",
            borderColor: "#2E2A18",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(201,168,68,0.08)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          {linkLabel} ←
        </a>
      )}
    </div>
  );
}
