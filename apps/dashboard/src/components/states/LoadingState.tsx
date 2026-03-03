import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export const LoadingState = ({
  label = "Loading..."
}: {
  label?: string;
}) => (
  <section className="section-container section-container--soft">
    <div className="section-container__body">
      <p className="muted">{label}</p>
      <SkeletonLoader rows={4} />
    </div>
  </section>
);
