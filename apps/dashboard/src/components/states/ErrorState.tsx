export const ErrorState = ({ message }: { message: string }) => (
  <div className="card stack">
    <h2>Unable to load</h2>
    <p className="error">{message}</p>
  </div>
);
