import type { ReactNode } from "react";
import Link from "next/link";

export const ActionCard = ({
  href,
  title,
  subtitle,
  icon
}: {
  href: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}) => {
  return (
    <Link href={href} className="action-card">
      <div className="action-card__icon">{icon ?? <span aria-hidden="true">→</span>}</div>
      <div className="action-card__content">
        <strong>{title}</strong>
        {subtitle ? <span className="muted">{subtitle}</span> : null}
      </div>
    </Link>
  );
};
