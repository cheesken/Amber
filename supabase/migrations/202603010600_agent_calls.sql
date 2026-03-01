-- Migration: Add agent_calls and agent_call_transcripts
-- Created at: 2026-03-01 06:00

CREATE TABLE agent_calls (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    contact_id      UUID REFERENCES emergency_contacts(id) ON DELETE SET NULL,
    contact_name    TEXT,                   -- snapshot of contact name at time of call
    duration        TEXT,                   -- e.g. "0:05"
    status          TEXT DEFAULT 'completed', -- completed | active | failed
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE agent_call_transcripts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id         UUID REFERENCES agent_calls(id) ON DELETE CASCADE,
    speaker         TEXT NOT NULL,          -- "AI Agent" | contact name
    text            TEXT NOT NULL,
    sequence_number INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexing for performance
CREATE INDEX idx_agent_calls_user_id ON agent_calls(user_id);
CREATE INDEX idx_agent_call_transcripts_call_id ON agent_call_transcripts(call_id);
