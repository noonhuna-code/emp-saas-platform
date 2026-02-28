-- ============================================
-- Migration: 71_soft_delete_disable_hard_delete.sql
-- Purpose: Prevent hard deletes on soft-delete core tables
-- Scope: RLS policy removal only
-- Non-destructive: YES (tightens access)
-- Idempotent: YES
-- RLS Impact: Removes DELETE policies for soft-delete tables
-- ============================================

drop policy if exists departments_delete on public.departments;
drop policy if exists employees_delete on public.employees;
drop policy if exists roles_delete on public.roles;
drop policy if exists teams_delete on public.teams;
drop policy if exists user_profiles_delete on public.user_profiles;
