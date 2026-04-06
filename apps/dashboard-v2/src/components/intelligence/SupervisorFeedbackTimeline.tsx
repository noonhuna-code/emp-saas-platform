import type { SupervisorFeedbackItem } from "@/lib/types/intelligence";

export const SupervisorFeedbackTimeline = ({ feedback }: { feedback: SupervisorFeedbackItem[] }) => {
  return (
    <div className="card stack">
      <h3>Team Lead Feedback</h3>
      <ul className="stack">
        {feedback.map((item) => (
          <li key={item.id} className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>{item.employee_name ?? item.employee_id}</strong>
              <span className="badge">{item.category}</span>
            </div>
            <div className="muted">{item.feedback_date}</div>
            <p style={{ marginTop: "8px" }}>{item.feedback_text}</p>
          </li>
        ))}
        {feedback.length === 0 ? <li className="muted">No feedback yet.</li> : null}
      </ul>
    </div>
  );
};
