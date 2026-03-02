"use client";

import { useEffect, useState } from "react";
import {
  fetchEmployeeDashboard,
  fetchWorkspaceChat,
  fetchWorkspaceContacts,
  sendWorkspaceChat
} from "@/lib/client/api";
import type { WorkspaceChatMessage, WorkspaceContact } from "@/lib/types/workspace";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";

const ChatPageClient = () => {
  const [rows, setRows] = useState<WorkspaceChatMessage[]>([]);
  const [contacts, setContacts] = useState<WorkspaceContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [recipientEmployeeId, setRecipientEmployeeId] = useState<string>("");

  const load = async () => {
    setLoading(true);
    setError(null);

    const [chatResult, dashboardResult, contactsResult] = await Promise.all([
      fetchWorkspaceChat({ limit: 80 }),
      fetchEmployeeDashboard(),
      fetchWorkspaceContacts(300)
    ]);

    if ((!chatResult.ok || !chatResult.data) && (!dashboardResult.ok || !dashboardResult.data) && (!contactsResult.ok || !contactsResult.data)) {
      setError(chatResult.error ?? dashboardResult.error ?? "Unable to load chat workspace");
      setLoading(false);
      return;
    }

    if (chatResult.ok && chatResult.data) {
      setRows(chatResult.data.rows);
    }

    if (contactsResult.ok && contactsResult.data) {
      const recipients = contactsResult.data.rows.filter((item) => !item.is_self);
      setContacts(recipients);
      const firstRecipient = recipients.at(0);
      if (!recipientEmployeeId && firstRecipient) {
        setRecipientEmployeeId(firstRecipient.employee_id);
      }
    }

    const teamLeadEmployeeId = dashboardResult.ok ? dashboardResult.data?.workspace.teamLead?.employee_id ?? "" : "";
    if (teamLeadEmployeeId) {
      setRecipientEmployeeId((prev) => prev || teamLeadEmployeeId);
    }

    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const onSend = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const result = await sendWorkspaceChat({
      recipientEmployeeId,
      message
    });

    if (!result.ok) {
      setError(result.error ?? "Unable to send message");
      return;
    }

    setMessage("");
    await load();
  };

  return (
    <div className="page-wrap page-grid">
      <section className="card stack">
        <h1>Team Chat</h1>
        <p className="muted">Direct employee-to-employee communication in your company scope.</p>
      </section>

      <section className="card stack">
        <h3>Send message</h3>
        <form className="form-grid" onSubmit={onSend}>
          <label>
            Recipient
            <select
              required
              value={recipientEmployeeId}
              onChange={(event) => setRecipientEmployeeId(event.target.value)}
              disabled={contacts.length === 0}
            >
              {contacts.map((contact) => (
                <option key={contact.employee_id} value={contact.employee_id}>
                  {contact.full_name ?? contact.employee_code ?? contact.employee_id}
                  {contact.is_team_lead ? " (team lead)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Message
            <textarea
              rows={3}
              required
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write your message"
            />
          </label>
          <button type="submit" className="primary-btn" disabled={contacts.length === 0}>
            Send
          </button>
        </form>
      </section>

      {loading ? <LoadingState label="Loading chat..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <section className="card stack">
          <h3>Recent chat</h3>
          {contacts.length === 0 ? <p className="muted">No contacts in your team scope yet.</p> : null}
          {rows.length === 0 ? <p className="muted">No messages yet.</p> : null}
          {rows.map((row) => (
            <article key={row.id} className="card card--nested stack">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="tag">{row.direction === "out" ? "Sent" : "Received"}</span>
                <span className="muted" style={{ fontSize: 12 }}>{new Date(row.created_at).toLocaleString()}</span>
              </div>
              <strong style={{ fontSize: 13 }}>
                {row.direction === "out" ? `To ${row.recipient_name ?? row.recipient_employee_id}` : `From ${row.sender_name ?? row.sender_employee_id}`}
              </strong>
              <p className="muted">{row.message_text}</p>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
};

export default ChatPageClient;
