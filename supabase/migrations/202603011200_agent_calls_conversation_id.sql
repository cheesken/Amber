-- Migration: Add conversation_id to agent_calls for ElevenLabs correlation
-- Created at: 2026-03-01 12:00

ALTER TABLE agent_calls
    ADD COLUMN conversation_id TEXT;

CREATE INDEX idx_agent_calls_conversation_id ON agent_calls(conversation_id);
