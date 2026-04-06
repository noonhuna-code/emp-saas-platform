import { useMemo, useState } from "react";
import type { LeaveApplyInput, LeaveBalance, LeaveTypeOption } from "@/lib/types/leave";
import { Button } from "@/components/ui/button";

const fieldClassName =
  "h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400";
const labelClassName = "grid gap-2 text-sm font-medium text-slate-700";
const panelClassName = "rounded-[20px] border border-slate-200 bg-slate-50/70 p-4";

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
    if (balances.length > 0) {
      return balances
        .filter((balance) => balance.leave_type_id)
        .map((balance) => ({
          id: balance.leave_type_id,
          name: balance.leave_type_name ?? "Leave",
        }));
    }

    return (leaveTypes ?? []).map((type) => ({
      id: type.id,
      name: type.name ?? "Leave",
    }));
  }, [balances, leaveTypes]);

  const selectedBalance = useMemo(
    () => balances.find((balance) => balance.leave_type_id === payload.leave_type_id) ?? null,
    [balances, payload.leave_type_id],
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit({ ...payload, employeeId: employeeId ?? "" });
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <div className={panelClassName}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className={labelClassName}>
              <span>Leave type</span>
              <select
                className={fieldClassName}
                value={payload.leave_type_id}
                onChange={(event) => setPayload((prev) => ({ ...prev, leave_type_id: event.target.value }))}
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
              <span>Start date</span>
              <input
                className={fieldClassName}
                type="date"
                value={payload.start_date}
                onChange={(event) => setPayload((prev) => ({ ...prev, start_date: event.target.value }))}
                required
              />
            </label>

            <label className={labelClassName}>
              <span>End date</span>
              <input
                className={fieldClassName}
                type="date"
                value={payload.end_date}
                onChange={(event) => setPayload((prev) => ({ ...prev, end_date: event.target.value }))}
                required
              />
            </label>

            <label className={labelClassName}>
              <span>Reason</span>
              <input
                className={`${fieldClassName} md:col-span-2 xl:col-span-3`}
                value={payload.reason ?? ""}
                placeholder="Short reason"
                onChange={(event) => setPayload((prev) => ({ ...prev, reason: event.target.value }))}
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_280px] md:items-end">
            <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                type="checkbox"
                checked={payload.is_half_day ?? false}
                onChange={(event) => setPayload((prev) => ({ ...prev, is_half_day: event.target.checked }))}
              />
              Submit as half day
            </label>

            {payload.is_half_day ? (
              <label className={labelClassName}>
                <span>Half day slot</span>
                <select
                  className={fieldClassName}
                  value={payload.half_day_type ?? ""}
                  onChange={(event) =>
                    setPayload((prev) => ({
                      ...prev,
                      half_day_type: event.target.value as "first_half" | "second_half",
                    }))
                  }
                  required
                >
                  <option value="">Select slot</option>
                  <option value="first_half">First half</option>
                  <option value="second_half">Second half</option>
                </select>
              </label>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 md:min-h-[44px] md:flex md:items-center">
                Full-day request
              </div>
            )}
          </div>
        </div>

        <div className={panelClassName}>
          <p className="text-sm font-semibold text-slate-900">Balance preview</p>
          {selectedBalance ? (
            <div className="mt-3 grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Entitled</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{selectedBalance.entitled_days} days</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Used</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{selectedBalance.used_days} days</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Remaining</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{selectedBalance.remaining_days} days</p>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
              Select a leave type to preview the current balance.
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button className="rounded-full px-5" type="submit" disabled={loading || leaveTypeOptions.length === 0 || !employeeId}>
          {loading ? "Submitting..." : "Submit request"}
        </Button>
      </div>
    </form>
  );
};
