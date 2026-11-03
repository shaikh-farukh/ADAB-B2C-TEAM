-- Migration: Create role_permissions join table
-- Date: 2026-10-13

BEGIN;

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);

COMMIT;
