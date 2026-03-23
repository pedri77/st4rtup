-- Create notifications table for user alerts and system messages
-- Migration: 011_notifications_table.sql

-- Create enums
CREATE TYPE notification_type AS ENUM (
    'system',        -- Actualizaciones del sistema, mantenimiento
    'lead',          -- Nuevo lead, cambio de estado
    'action',        -- Nueva acción, recordatorio, vencida
    'opportunity',   -- Nueva opp, cambio de etapa, cierre
    'visit',         -- Visita programada, recordatorio
    'email',         -- Email enviado, rebote, respuesta
    'review',        -- Monthly review generada
    'automation'     -- Ejecución de automatización
);

CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- FK a users table (cuando se implemente auth completo)

    type notification_type NOT NULL,
    priority notification_priority DEFAULT 'medium',

    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    -- Metadata JSON (info del evento relacionado)
    metadata TEXT,

    -- URL de acción (ej: /leads/uuid, /actions/uuid)
    action_url VARCHAR(500),

    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Comments
COMMENT ON TABLE notifications IS 'Sistema de notificaciones para alertar a usuarios sobre eventos importantes';
COMMENT ON COLUMN notifications.metadata IS 'JSON con información adicional del evento (lead_id, action_id, etc.)';
COMMENT ON COLUMN notifications.action_url IS 'URL relativa para navegar al recurso relacionado';

-- Seed: crear algunas notificaciones de ejemplo
-- (ajustar user_id según el usuario de tu sistema)
INSERT INTO notifications (user_id, type, priority, title, message, metadata, action_url) VALUES
(
    gen_random_uuid(), -- Reemplazar con user_id real
    'system',
    'medium',
    'Bienvenido a Riskitera Sales',
    'El sistema de notificaciones está activo. Recibirás alertas sobre leads, acciones y oportunidades.',
    '{"version": "1.0.0"}',
    '/dashboard'
),
(
    gen_random_uuid(),
    'action',
    'high',
    'Acción vencida: Follow-up Acme Corp',
    'Tienes una acción vencida desde hace 2 días. Por favor, actualiza el estado.',
    '{"action_id": "' || gen_random_uuid() || '", "days_overdue": 2}',
    '/actions'
);

-- Enable RLS (Row Level Security) cuando se implemente users table
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Future: CREATE POLICY solo para ver sus propias notificaciones
-- CREATE POLICY notifications_user_policy ON notifications
--     FOR ALL
--     USING (user_id = auth.uid());
