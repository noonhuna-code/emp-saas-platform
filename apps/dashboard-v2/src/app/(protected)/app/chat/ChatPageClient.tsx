"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchEmployeeDashboard,
  fetchWorkspaceChat,
  fetchWorkspaceContacts,
  peekCachedResult,
  sendWorkspaceChat
} from "@/lib/client/api";
import type { WorkspaceChatMessage, WorkspaceContact } from "@/lib/types/workspace";
import { ErrorState } from "@/components/states/ErrorState";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { StatusChip } from "@/components/ui/StatusChip";

const ChatPageClient = () => {
  const cachedChat = peekCachedResult<{ rows: WorkspaceChatMessage[] }>("/api/workspace/chat?limit=120");
  const cachedContacts = peekCachedResult<{ rows: WorkspaceContact[] }>("/api/workspace/contacts?limit=300");

  const [rows, setRows] = useState<WorkspaceChatMessage[]>(cachedChat?.ok ? (cachedChat.data?.rows ?? []) : []);
  const initialContacts = cachedContacts?.ok ? (cachedContacts.data?.rows ?? []).filter((item) => !item.is_self) : [];
  const [contacts, setContacts] = useState<WorkspaceContact[]>(initialContacts);
  const [loading, setLoading] = useState(!(cachedChat?.ok || cachedContacts?.ok));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialContacts[0]?.employee_id ?? "");

  const load = async () => {
    setError(null);

    const [chatResult, contactsResult, dashboardResult] = await Promise.all([
      fetchWorkspaceChat({ limit: 120 }),
      fetchWorkspaceContacts(300),
      fetchEmployeeDashboard()
    ]);

    const allFailed = [chatResult, contactsResult, dashboardResult].every((result) => !result.ok || !result.data);
    if (allFailed) {
      setError(chatResult.error ?? contactsResult.error ?? dashboardResult.error ?? "Unable to load chat");
      setLoading(false);
      return;
    }

    if (chatResult.ok && chatResult.data) {
      setRows(chatResult.data.rows);
    }

    if (contactsResult.ok && contactsResult.data) {
      const recipients = contactsResult.data.rows.filter((item) => !item.is_self);
      setContacts(recipients);
      if (!selectedEmployeeId && recipients[0]) {
        setSelectedEmployeeId(recipients[0].employee_id);
      }
    }

    const teamLeadEmployeeId = dashboardResult.ok ? dashboardResult.data?.workspace.teamLead?.employee_id ?? "" : "";
    if (teamLeadEmployeeId) {
      setSelectedEmployeeId((prev) => prev || teamLeadEmployeeId);
    }

    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.employee_id === selectedEmployeeId) ?? null,
    [contacts, selectedEmployeeId]
  );

  const conversation = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return rows.filter((row) => (
      row.recipient_employee_id === selectedEmployeeId || row.sender_employee_id === selectedEmployeeId
    ));
  }, [rows, selectedEmployeeId]);

  const onSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEmployeeId || !message.trim()) return;

    const result = await sendWorkspaceChat({
      recipientEmployeeId: selectedEmployeeId,
      message
    });

    if (!result.ok) {
      setError(result.error ?? "Unable to send message");
      return;
    }

    setMessage("");
    await load();
  };

  if (loading) {
    return (
      <div className="page-wrap page-grid">
        <SectionContainer title="Team Chat" subtitle="Workspace messaging" tone="spotlight">
          <SkeletonLoader rows={5} />
        </SectionContainer>
      </div>
    );
  }

  if (error) return <ErrorState message={error} />;

  return (
    <div className="page-wrap page-grid">
      <SectionContainer title="Team Chat" subtitle="Direct company-scoped messaging" tone="spotlight">
        <div className="chat-shell">
          <aside className="chat-shell__contacts">
            <div className="chat-shell__contacts-head">
              <h3>Contacts</h3>
              <StatusChip label={`${contacts.length} available`} compact />
            </div>
            {contacts.length === 0 ? (
              <EmptyState title="No contacts available" subtitle="Ask HR to complete team assignments." compact />
            ) : (
              <div className="chat-shell__contacts-list">
                {contacts.map((contact) => {
                  const isActive = contact.employee_id === selectedEmployeeId;
                  const name = contact.full_name ?? contact.employee_code ?? "Employee";
                  return (
                    <button
                      key={contact.employee_id}
                      type="button"
                      className={`chat-contact ${isActive ? "chat-contact--active" : ""}`}
                      onClick={() => setSelectedEmployeeId(contact.employee_id)}
                    >
                      <span className="chat-contact__avatar">{(name[0] ?? "U").toUpperCase()}</span>
                      <span className="chat-contact__meta">
                        <strong>{name}</strong>
                        <span className="muted">
                          {contact.is_team_lead ? "Team lead" : "Employee"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="chat-shell__thread">
            <header className="chat-shell__thread-head">
              <div>
                <h3>{selectedContact?.full_name ?? selectedContact?.employee_code ?? "Select contact"}</h3>
                <p className="muted">Conversation thread</p>
              </div>
              {selectedContact?.is_team_lead ? <StatusChip label="Team lead" compact tone="info" /> : null}
            </header>

            <div className="chat-shell__messages">
              {!selectedEmployeeId ? (
                <EmptyState title="Select a contact" subtitle="Choose a teammate from the left list." compact />
              ) : conversation.length === 0 ? (
                <EmptyState title="No messages yet" subtitle="Send your first message below." compact />
              ) : (
                conversation.map((row) => (
                  <article key={row.id} className={`chat-bubble ${row.direction === "out" ? "chat-bubble--out" : "chat-bubble--in"}`}>
                    <div className="chat-bubble__meta">
                      <StatusChip label={row.direction === "out" ? "Sent" : "Received"} compact />
                      <span className="muted">{new Date(row.created_at).toLocaleString()}</span>
                    </div>
                    <p>{row.message_text}</p>
                  </article>
                ))
              )}
            </div>

            <form className="chat-shell__composer" onSubmit={onSend}>
              <textarea
                rows={3}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write your message..."
                disabled={!selectedEmployeeId}
              />
              <button type="submit" className="primary-btn" disabled={!selectedEmployeeId || message.trim().length === 0}>
                Send
              </button>
            </form>
          </section>
        </div>
      </SectionContainer>
    </div>
  );
};

export default ChatPageClient;
