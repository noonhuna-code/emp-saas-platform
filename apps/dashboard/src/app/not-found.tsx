export default function NotFound() {
  return (
    <div className="auth-shell">
      <section className="card auth-card stack">
        <h1>404</h1>
        <p className="muted">The page you requested was not found.</p>
        <a className="secondary-btn" href="/app/dashboard">Return to dashboard</a>
      </section>
    </div>
  );
}
