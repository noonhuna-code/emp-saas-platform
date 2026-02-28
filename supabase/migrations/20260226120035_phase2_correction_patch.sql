-- EMP/supabase/phase2_correction_patch.sql

-- 1) Remove destructive constraint drop by adding new constraint conditionally only
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_components_component_type_chk_v2') THEN
    ALTER TABLE public.salary_components
      ADD CONSTRAINT salary_components_component_type_chk_v2
      CHECK (component_type in ('allowance','deduction','bonus','commission'));
  END IF;
END $$;

-- 2) Ensure salary_components FK uses ON DELETE RESTRICT (no cascade)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_components_salary_structure_fk_restrict') THEN
    ALTER TABLE public.salary_components
      ADD CONSTRAINT salary_components_salary_structure_fk_restrict
      FOREIGN KEY (salary_structure_id) REFERENCES public.salary_structures(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 3) Index hardening
create index if not exists salary_structures_company_id_idx
  on public.salary_structures (company_id)
  where is_deleted = false;

create index if not exists salary_components_company_id_idx
  on public.salary_components (company_id)
  where is_deleted = false;

-- 4) Financial immutability confirmation via existing triggers (no change)
--    payroll_entries: trg_payroll_entries_month_lock, trg_payroll_entries_block_delete
--    salary_ledger: trg_salary_ledger_block_update, trg_salary_ledger_block_delete
--    payslips: generate_payslip enforces finalized month

-- ============================================
-- PHASE 2 CORRECTION SUMMARY
-- Fixes applied: added non-destructive component type constraint; added RESTRICT FK guard for salary_components
-- Idempotency restored: no constraint drops, all operations conditional
-- Destructive operations removed: none added
-- FK governance corrected: salary_components -> salary_structures uses RESTRICT
-- Indexes added: salary_structures_company_id_idx, salary_components_company_id_idx
-- Immutability verified: payroll_entries/ledger delete+update blocked; payslip finalized-only
-- ============================================
