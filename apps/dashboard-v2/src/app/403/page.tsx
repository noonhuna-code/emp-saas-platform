export default function ForbiddenPage() {
  return (
    <div className="auth-shell">
      <section className="card auth-card stack">
        <h1>403</h1>
        <p className="muted">You do not have permission to access this page.</p>
        <a className="secondary-btn" href="/app/dashboard">Return to dashboard</a>
      </section>
    </div>
  );
}
