-- ============================================================================
-- Migration 012: Users Table
-- ============================================================================
-- Description: Creates users table with role-based access control
-- Author: Claude (AI)
-- Date: 2026-02-27
-- Depends on: Supabase Auth (auth.users)
-- ============================================================================

-- ─── Create User Role Enum ────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('admin', 'comercial', 'viewer');

COMMENT ON TYPE user_role IS 'Roles de usuario: admin (acceso total), comercial (CRM completo), viewer (solo lectura)';


-- ─── Create Users Table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    -- Primary key (synced with auth.users.id)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Supabase Auth sync
    email VARCHAR(255) NOT NULL UNIQUE,

    -- Profile
    full_name VARCHAR(255),
    avatar_url VARCHAR(500),
    phone VARCHAR(50),

    -- Role & Permissions
    role user_role NOT NULL DEFAULT 'viewer',
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Settings
    preferences JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    last_login_at TIMESTAMPTZ,
    invited_at TIMESTAMPTZ,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Notes
    notes TEXT,

    -- Timestamps (auto-managed)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ─── Trigger for Updated At ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- ─── Comments ─────────────────────────────────────────────────────────────

COMMENT ON TABLE users IS 'Usuarios del sistema CRM con control de acceso basado en roles';
COMMENT ON COLUMN users.id IS 'UUID sincronizado con auth.users.id de Supabase';
COMMENT ON COLUMN users.email IS 'Email del usuario (único, sincronizado con Supabase Auth)';
COMMENT ON COLUMN users.role IS 'Rol del usuario: admin, comercial, viewer';
COMMENT ON COLUMN users.is_active IS 'Usuario activo o desactivado';
COMMENT ON COLUMN users.preferences IS 'Preferencias del usuario en formato JSON (tema, idioma, notificaciones)';
COMMENT ON COLUMN users.invited_by IS 'Usuario que invitó a este usuario (FK self-reference)';

-- ─── Row Level Security (RLS) ─────────────────────────────────────────────

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "users_select_own"
    ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Policy: Admins can view all users
CREATE POLICY "users_select_admin"
    ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
            AND u.is_active = true
        )
    );

-- Policy: Admins can insert users (invitations)
CREATE POLICY "users_insert_admin"
    ON users
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
            AND u.is_active = true
        )
    );

-- Policy: Users can update their own profile (limited fields)
CREATE POLICY "users_update_own"
    ON users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        -- Prevent non-admins from changing role or is_active
        AND (role = (SELECT role FROM users WHERE id = auth.uid()))
        AND (is_active = (SELECT is_active FROM users WHERE id = auth.uid()))
    );

-- Policy: Admins can update any user
CREATE POLICY "users_update_admin"
    ON users
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
            AND u.is_active = true
        )
    );

-- Policy: Admins can delete users (except themselves via app logic)
CREATE POLICY "users_delete_admin"
    ON users
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
            AND u.is_active = true
        )
        -- Additional check: prevent self-deletion (handled in app too)
        AND id != auth.uid()
    );

-- ─── Seed Initial Admin User ──────────────────────────────────────────────

-- Note: You need to replace 'YOUR_AUTH_USER_ID' with the actual UUID from auth.users
-- To get it, run: SELECT id, email FROM auth.users;

-- Example (commented out - update with real UUID):
-- INSERT INTO users (id, email, full_name, role, is_active, invited_at)
-- VALUES (
--     'YOUR_AUTH_USER_ID'::uuid,
--     'admin@riskitera.com',
--     'Admin Riskitera',
--     'admin',
--     true,
--     NOW()
-- )
-- ON CONFLICT (id) DO UPDATE
-- SET role = 'admin', is_active = true;

-- ─── Grant Permissions ────────────────────────────────────────────────────

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;

-- ============================================================================
-- End of Migration 012
-- ============================================================================

-- Verification Query:
-- SELECT * FROM users ORDER BY created_at DESC;
-- SELECT email, role, is_active, created_at FROM users;
