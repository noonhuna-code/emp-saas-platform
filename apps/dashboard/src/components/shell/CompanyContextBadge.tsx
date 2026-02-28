export const CompanyContextBadge = ({ companyId, role }: { companyId: string | null; role: string | null }) => {
  return (
    <div className="badge" title={companyId ?? "Company context pending"}>
      <span>{role ?? "unknown"}</span>
      <span style={{ margin: "0 6px" }}>|</span>
      <span>{companyId ? `${companyId.slice(0, 8)}...` : "No company context"}</span>
    </div>
  );
};
