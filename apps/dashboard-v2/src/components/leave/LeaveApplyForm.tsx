import { useMemo, useState } from "react";
import type { LeaveApplyInput, LeaveBalance, LeaveTypeOption } from "@/lib/types/leave";
import { Button } from "@/components/ui/button";

const fieldClassName =
  "h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400";
const labelClassName = "grid gap-2 text-sm font-medium text-slate-700";
const helperCardClassName = "rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-600";
const sectionCardClassName = "rounded-[20px] border border-slate-200 bg-slate-50/70 p-4 md:p-5";

export const LeaveApplyForm = ({
  onSubmit,
  loading,
  employeeId,
  balances,
  leaveTypes,
}: {
  onSubmit: (payload: LeaveApplyInput) => Promise<void>;
  loading?: boolean;
  employeeId?: string | null;
  balances: LeaveBalance[];
  leaveTypes?: LeaveTypeOption[];
}) => {
  const [payload, setPayload] = useState<LeaveApplyInput>({
    employeeId: employeeId ?? "",
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
    is_half_day: false,
    half_day_type: undefined,
  });

  const leaveTypeOptions = useMemo(() => {
    const map = new Map<string, string>();

    (leaveTypes ?? []).forEach((type) => {
      if (type.id) {
        map.set(type.id, type.name ?? "Leave");
      }
    });

    balances.forEach((balance) => {
      if (balance.leave_type_id && !map.has(balance.leave_type_id)) {
        map.set(balance.leave_type_id, balance.leave_type_name ?? "Leave");
      }
    });

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [balances, leaveTypes]);

  const selectedBalance = useMemo(
    () => balances.find((balance) => balance.leave_type_id === payload.leave_type_id) ?? null,
    [balances, payload.leave_type_id],
  );

  const handleChange = (field: keyof LeaveApplyInput, value: string | boolean) => {
    setPayload((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit({ ...payload, employeeId: employeeId ?? "" });
  };

  const hasTypes = leaveTypeOptions.length > 0;

  return (
    <div className="space-y-5">
      {!hasTypes ? (
        <div className={helperCardClassName}>
          No leave types configured yet. Ask HR to publish leave types such as AL, CL, SL, unpaid, maternity, or late login.
        </div>
      ) : null}

      <form className="space-y-5" onSubmit={submit}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_320px]">
          <div className="space-y-5">
            <div className={sectionCardClassName}>
              <div className="mb-4 space-y-1">
                <p className="text-sm font-semibold tracking-tight text-slate-900">Request details</p>
                <p className="text-sm leading-6 text-slate-500">Select the leave type, add context, and define the request window.</p>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <label className={labelClassName}>
                  <span>Leave type</span>
                  <select
                    className={fieldClassName}
                    value={payload.leave_type_id}
                    onChange={(event) => handleChange("leave_type_id", event.target.value)}
                    required
                  >
                    <option value="">Select leave type</option>
                    {leaveTypeOptions.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={labelClassName}>
                  <span>Reason</span>
                  <input
                    className={fieldClassName}
                    value={payload.reason ?? ""}
                    placeholder="Add a short reason for your request"
                    onChange={(event) => handleChange("reason", event.target.value)}
                  />
                </label>

                <label className={labelClassName}>
                  <span>Start date</span>
                  <input
                    className={fieldClassName}
                    type="date"
                    value={payload.start_date}
                    onChange={(event) => handleChange("start_date", event.target.value)}
                    required
                  />
                </label>

                <label className={labelClassName}>
                  <span>End date</span>
                  <input
                    className={fieldClassName}
                    type="date"
                    value={payload.end_date}
                    onChange={(event) => handleChange("end_date", event.target.value)}
                    required
                  />
                </label>
              </div>
            </div>

            <div className={sectionCardClassName}>
              <div className="mb-4 space-y-1">
                <p className="text-sm font-semibold tracking-tight text-slate-900">Duration</p>
                <p className="text-sm leading-6 text-slate-500">Choose whether this request covers a full day or a half-day slot.</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4">
                  <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
                    <input
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      type="checkbox"
                      checked={payload.is_half_day ?? false}
                      onChange={(event) => handleChange("is_half_day", event.target.checked)}
                    />
                    Submit as half day
                  </label>
                  <p className="mt-2 text-sm text-slate-500">
                    Use this when the employee needs only the first half or second half of the day off.
                  </p>
                </div>

                <div>
                  {payload.is_half_day ? (
                    <label className={labelClassName}>
                      <span>Half day slot</span>
                      <select
                        className={fieldClassName}
                        value={payload.half_day_type ?? ""}
                        onChange={(event) => handleChange("half_day_type", event.target.value as "first_half" | "second_half")}
                        required
                      >
                        <option value="">Select slot</option>
                        <option value="first_half">First half</option>
                        <option value="second_half">Second half</option>
                      </select>
                    </label>
                  ) : (
                    <div className={`${helperCardClassName} h-full`}>Full-day request selected. Enable half day only when you need a partial leave record.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className={sectionCardClassName}>
              <div className="mb-4 space-y-1">
                <p className="text-sm font-semibold tracking-tight text-slate-900">Balance preview</p>
                <p className="text-sm leading-6 text-slate-500">The selected leave type drives the remaining balance summary shown here.</p>
              </div>
              {selectedBalance ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Entitled</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{selectedBalance.entitled_days} days</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Used</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{selectedBalance.used_days} days</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Remaining</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{selectedBalance.remaining_days} days</p>
                  </div>
                </div>
              ) : (
                <div className={helperCardClassName}>Select a leave type to preview the currently entitled, used, and remaining balance.</div>
              )}
            </div>

            <div className={sectionCardClassName}>
              <div className="space-y-1">
                <p className="text-sm font-semibold tracking-tight text-slate-900">Submission checks</p>
                <p className="text-sm leading-6 text-slate-500">Requests stay within the existing validation contract and approval workflow.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button className="rounded-full px-5" type="submit" disabled={loading || !hasTypes || !employeeId}>
            {loading ? "Submitting..." : "Submit request"}
          </Button>
        </div>
      </form>
    </div>
  );
};
