-- 046: MCP audit trail for agent tool calls
CREATE TABLE IF NOT EXISTS mcp_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) DEFAULT 'default',
    agent_id VARCHAR(100),
    server VARCHAR(100) NOT NULL,
    tool VARCHAR(100) NOT NULL,
    input_summary TEXT,
    outcome VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    duration_ms INTEGER,
    user_id VARCHAR(36),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_mcp_audit_agent ON mcp_audit_trail(agent_id);
CREATE INDEX IF NOT EXISTS ix_mcp_audit_server ON mcp_audit_trail(server);
CREATE INDEX IF NOT EXISTS ix_mcp_audit_created ON mcp_audit_trail(created_at);
