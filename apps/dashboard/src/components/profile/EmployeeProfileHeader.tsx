import { Avatar } from "@/components/shared/Avatar";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { StatusBadge } from "@/components/shared/StatusBadge";

export const EmployeeProfileHeader = ({
  name,
  avatarUrl,
  designation,
  department,
  employmentStatus,
  profileCompleteness
}: {
  name: string;
  avatarUrl?: string | null;
  designation?: string | null;
  department?: string | null;
  employmentStatus?: string | null;
  profileCompleteness: number | null;
}) => {
  return (
    <section className="profile-header">
      <Avatar name={name} url={avatarUrl} />
      <div className="profile-header__info">
        <div className="row" style={{ justifyContent: "space-between", width: "100%" }}>
          <div>
            <h2>{name}</h2>
            <p className="muted">{designation ?? "Employee"} - {department ?? "Unassigned"}</p>
          </div>
          {employmentStatus ? <StatusBadge status={employmentStatus} /> : null}
        </div>
        <div className="profile-header__progress">
          <span className="muted">Profile completeness</span>
          <ProgressBar value={profileCompleteness ?? 0} />
        </div>
      </div>
    </section>
  );
};
