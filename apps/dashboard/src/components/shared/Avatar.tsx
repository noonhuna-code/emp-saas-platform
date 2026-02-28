export const Avatar = ({ name, url }: { name: string; url?: string | null }) => {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "?";
  return (
    <div className="avatar">
      {url ? <img src={url} alt={name} /> : <span>{initial}</span>}
    </div>
  );
};
