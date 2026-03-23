"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchEmployeeDashboard,
  fetchWorkspaceChat,
  fetchWorkspaceContacts,
  peekCachedResult,
  sendWorkspaceChat,
} from "@/lib/client/api";
import type { WorkspaceChatMessage, WorkspaceContact } from "@/lib/types/workspace";
import {
  DashboardRail,
  FeatureCallout,
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  SurfacePanel,
} from "@/components/dashboard-v2/PagePrimitives";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusChip } from "@/components/ui/StatusChip";

const formatStamp = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const ChatPageClient = () => {
  const cachedChat = peekCachedResult<{ rows: WorkspaceChatMessage[] }>("/api/workspace/chat?limit=120");
  const cachedContacts = peekCachedResult<{ rows: WorkspaceContact[] }>("/api/workspace/contacts?limit=300");

  const [rows, setRows] = useState<WorkspaceChatMessage[]>(cachedChat?.ok ? (cachedChat.data?.rows ?? []) : []);
  const initialContacts = cachedContacts?.ok ? (cachedContacts.data?.rows ?? []).filter((item) => !item.is_self) : [];
  const [contacts, setContacts] = useState<WorkspaceContact[]>(initialContacts);
  const [loading, setLoading] = useState(!(cachedChat?.ok || cachedContacts?.ok));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialContacts[0]?.employee_id ?? "");

  const load = async () => {
    setError(null);

    const [chatResult, contactsResult, dashboardResult] = await Promise.all([
      fetchWorkspaceChat({ limit: 120 }),
      fetchWorkspaceContacts(300),
      fetchEmployeeDashboard(),
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
    return rows.filter(
      (row) => row.recipient_employee_id === selectedEmployeeId || row.sender_employee_id === selectedEmployeeId
    );
  }, [rows, selectedEmployeeId]);

  const stats = useMemo(() => {
    const leadCount = contacts.filter((contact) => contact.is_team_lead).length;
    return {
      contacts: contacts.length,
      conversationCount: conversation.length,
      teamLeads: leadCount,
      selectedLabel: selectedContact?.full_name ?? selectedContact?.employee_code ?? "No contact selected",
    };
  }, [contacts, conversation.length, selectedContact]);

  const onSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEmployeeId || !message.trim()) return;

    setSending(true);
    const result = await sendWorkspaceChat({
      recipientEmployeeId: selectedEmployeeId,
      message,
    });

    if (!result.ok) {
      setError(result.error ?? "Unable to send message");
      setSending(false);
      return;
    }

    setMessage("");
    await load();
    setSending(false);
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingState label="Loading team chat..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorState message={error} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Inbox / Chat"
        title="Direct company-scoped coordination"
        description="Keep collaboration close to requests, attendance issues, and team ownership so action stays inside the operating system instead of leaking into disconnected inboxes."
        chips={["Employee identity", "Team context", "Operational coordination", "Scoped collaboration"]}
      />

      <FeatureCallout
        badge="Collaboration"
        title="Messages should help work move, not become another disconnected system."
        description="This workspace keeps direct conversation tied to real employee identity, reporting context, and team ownership. It is built for operational coordination, not social chatter."
      />

      <StatGrid>
        <StatCard label="Contacts" value={stats.contacts} hint="Available people in the current workspace scope" />
        <StatCard label="Current thread" value={stats.conversationCount} hint="Messages with the selected contact" />
        <StatCard label="Team leads" value={stats.teamLeads} hint="Lead contacts visible in this directory" />
        <StatCard label="Selected" value={stats.selectedLabel} hint="Current active conversation" />
      </StatGrid>

      <DashboardRail className="xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.45fr)]">
        <SurfacePanel title="Contacts" description="Choose the person you need to coordinate with right now.">
          {contacts.length === 0 ? (
            <EmptyState title="No contacts available" subtitle="Ask HR or operations to complete team assignments." compact />
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => {
                const isActive = contact.employee_id === selectedEmployeeId;
                const name = contact.full_name ?? contact.employee_code ?? "Employee";
                return (
                  <button
                    key={contact.employee_id}
                    type="button"
                    className={`flex w-full items-start gap-3 rounded-[22px] border px-4 py-4 text-left transition ${
                      isActive
                        ? "border-blue-300 bg-blue-50/80 shadow-sm"
                        : "border-slate-200/80 bg-white/92 hover:border-slate-300"
                    }`}
                    onClick={() => setSelectedEmployeeId(contact.employee_id)}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                      {(name[0] ?? "U").toUpperCase()}
                    </span>
                    <span className="min-w-0 space-y-1">
                      <span className="block truncate text-sm font-semibold text-slate-950">{name}</span>
                      <span className="block text-xs text-slate-500">
                        {contact.designation ?? "Employee"}{contact.team_name ? ` | ${contact.team_name}` : ""}
                      </span>
                      {contact.is_team_lead ? <StatusChip label="Team lead" tone="info" compact /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </SurfacePanel>

        <SurfacePanel title="Conversation" description="Stay focused on the current thread without losing who owns what.">
          {!selectedEmployeeId ? (
            <EmptyState title="Select a contact" subtitle="Choose a teammate from the left list to open a conversation." compact />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-950">
                    {selectedContact?.full_name ?? selectedContact?.employee_code ?? "Selected contact"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedContact?.designation ?? "Employee"}{selectedContact?.department_name ? ` | ${selectedContact.department_name}` : ""}
                  </p>
                </div>
                {selectedContact?.is_team_lead ? <StatusChip label="Team lead" tone="info" compact /> : null}
              </div>

              <div className="space-y-3">
                {conversation.length === 0 ? (
                  <EmptyState title="No messages yet" subtitle="Use the composer below to start the conversation." compact />
                ) : (
                  conversation.map((row) => (
                    <article
                      key={row.id}
                      className={`rounded-[22px] border px-4 py-4 ${
                        row.direction === "out"
                          ? "border-blue-200 bg-blue-50/70"
                          : "border-slate-200/80 bg-white/92"
                      }`}
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <StatusChip label={row.direction === "out" ? "Sent" : "Received"} compact tone={row.direction === "out" ? "info" : "default"} />
                        <span className="text-xs text-slate-500">{formatStamp(row.created_at)}</span>
                      </div>
                      <p className="text-sm leading-6 text-slate-700">{row.message_text}</p>
                    </article>
                  ))
                )}
              </div>

              <form className="space-y-3 rounded-[22px] border border-slate-200/80 bg-white/92 p-4" onSubmit={onSend}>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Write a concise operational update, question, or handoff note..."
                  className="min-h-[112px] w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                  disabled={!selectedEmployeeId || sending}
                />
                <div className="flex justify-end">
                  <button type="submit" className="primary-btn" disabled={!selectedEmployeeId || message.trim().length === 0 || sending}>
                    {sending ? "Sending..." : "Send message"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </SurfacePanel>
      </DashboardRail>
    </PageContainer>
  );
};

export default ChatPageClient;
