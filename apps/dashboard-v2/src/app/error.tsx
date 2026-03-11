"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Avoid logging sensitive error details to users; log minimal info to console.
    console.error("Global error boundary triggered", {
      message: error.message,
      digest: error.digest
    });
  }, [error]);

  return (
    <div className="page-wrap stack">
      <section className="card stack">
        <h1 style={{ margin: 0 }}>Something went wrong</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          The app hit an unexpected error. Please try again.
        </p>
        <div className="row" style={{ marginTop: 16 }}>
          <button className="primary-btn" type="button" onClick={reset}>
            Try again
          </button>
        </div>
      </section>
    </div>
  );
}
