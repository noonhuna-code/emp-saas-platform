import { ProfileCompletenessBadge } from "./ProfileCompletenessBadge";

export const EmployeeDetailCard = ({
  employee,
  profileCompletenessScore
}: {
  employee: Record<string, unknown>;
  profileCompletenessScore: number | null;
}) => {
  const entries = Object.entries(employee);

  return (
    <section className="card stack">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="stack" style={{ gap: 4 }}>
          <h1 style={{ margin: 0 }}>Employee Detail</h1>
          <p className="muted" style={{ margin: 0 }}>Read-only Phase 1 view</p>
        </div>
        <ProfileCompletenessBadge score={profileCompletenessScore} />
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {entries.map(([key, value]) => (
          <div key={key} className="row" style={{ justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
            <strong>{key}</strong>
            <span className="muted" style={{ textAlign: "right", maxWidth: "60%" }}>{String(value ?? "-")}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
