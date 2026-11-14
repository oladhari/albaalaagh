import Link from "next/link";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  linkHref?: string;
  linkLabel?: string;
  as?: "h1" | "h2";
}

export function SectionTitleLink({ title, href }: { title: string; href: string }) {
  return <Link href={href} className="section-heading-link">
    <span className="text-gold-gradient section-heading-text">{title}</span>
    <span aria-hidden="true" className="section-heading-arrow">←</span>
  </Link>;
}

export default function SectionHeader({
  title,
  subtitle,
  linkHref,
  linkLabel = "عرض الكل",
  as = "h2",
}: SectionHeaderProps) {
  const Heading = as;
  return (
    <div className="flex items-end justify-between gap-4 mb-8">
      <div className="min-w-0">
        <Heading className="text-2xl sm:text-3xl font-black mb-1">
          {linkHref ? <SectionTitleLink title={title} href={linkHref} /> :
            <span className="text-gold-gradient">{title}</span>}
        </Heading>
        {subtitle && (
          <p className="text-sm text-text-muted">
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
        <Link href={linkHref}
          className="section-view-all text-sm font-medium px-4 py-1.5 rounded-full border text-gold border-border shrink-0">
          {linkLabel} <span aria-hidden="true">←</span>
        </Link>
      )}
    </div>
  );
}
