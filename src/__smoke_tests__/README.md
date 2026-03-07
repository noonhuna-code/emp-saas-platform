Non-destructive smoke test scaffolding for backend service wiring.

These files are intended for local invocation with mocked Supabase clients only.
They do not execute real database writes.


## Attendance + Shift Swap smoke checklist

Use this quick manual check when local smoke infra is unavailable:

1. Employee clock in/out
   - Open `/app/attendance`
   - Attempt clock in, then clock out
   - Expect non-crashing success state or friendly 403 message

2. Employee shift swap request
   - Open `/app/attendance/shift-swaps`
   - Submit request with date + target shift + reason
   - Expect request row in "My requests" or friendly 403 state

3. Team Lead/Manager review queue
   - Open `/app/attendance/shift-swaps` as reviewer
   - Approve or reject pending request
   - Expect status update and no runtime crash
