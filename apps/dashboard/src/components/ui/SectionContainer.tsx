import type { ReactNode } from "react";

export const SectionContainer = ({
  title,
  subtitle,
  actions,
  children,
  tone = "default"
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  tone?: "default" | "soft" | "spotlight";
}) => {
  return (
    <section className={`section-container section-container--${tone}`}>
      <header className="section-container__head">
        <div>
          <h2 className="section-container__title">{title}</h2>
          {subtitle ? <p className="section-container__subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="section-container__actions">{actions}</div> : null}
      </header>
      <div className="section-container__body">{children}</div>
    </section>
  );
};
