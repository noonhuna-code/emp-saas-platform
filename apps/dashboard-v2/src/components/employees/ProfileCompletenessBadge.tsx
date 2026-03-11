export const ProfileCompletenessBadge = ({ score }: { score: number | null | undefined }) => {
  if (score == null) {
    return <span className="badge">Profile completeness: n/a</span>;
  }

  const tone = score >= 80 ? "#067647" : score >= 50 ? "#b54708" : "#b42318";
  return (
    <span className="badge" style={{ borderColor: tone, color: tone }}>
      Profile completeness: {score}%
    </span>
  );
};
