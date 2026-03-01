CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    timer_duration  INTEGER NOT NULL,       -- seconds (scroll picker value = fake password)
    first_name      TEXT,
    last_name       TEXT,
    gender          TEXT,
    age             INTEGER,
    photo_url       TEXT,                   -- stored in Supabase Storage
    hair_color      TEXT,
    eye_color       TEXT,
    race            TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE emergency_contacts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id),
    name                TEXT NOT NULL,
    phone               TEXT,
    email               TEXT,
    relationship        TEXT,               -- friend | family | lawyer | advocate
    preferred_method    TEXT,               -- sms | email | call
    escalation_enabled  BOOLEAN DEFAULT false,
    escalation_tier     INTEGER,            -- 1 | 2 | 3
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE checkin_config (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id),
    frequency_hours     INTEGER NOT NULL,
    last_checkin_at     TIMESTAMPTZ,
    next_due_at         TIMESTAMPTZ,
    is_active           BOOLEAN DEFAULT true
);

CREATE TABLE checkin_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    checked_in_at   TIMESTAMPTZ,
    was_missed      BOOLEAN DEFAULT false
);


CREATE TABLE escalation_config (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID REFERENCES users(id),
    tier                    INTEGER NOT NULL,      -- 1 | 2 | 3
    contact_id              UUID REFERENCES emergency_contacts(id),
    approved_message        TEXT NOT NULL,
    delivery_method         TEXT,                   -- sms | email | call
    law_enforcement_optin   BOOLEAN DEFAULT false
);

CREATE TABLE incidents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    timestamp       TIMESTAMPTZ DEFAULT now(),
    type            TEXT NOT NULL,              -- photo | video | audio | note
    file_url        TEXT,                       -- supabase storage URL (null for notes)
    file_hash       TEXT,                       -- SHA-256
    content         TEXT,                       -- text content for notes
    metadata        JSONB,                      -- { gps, device, exif }
    analysis        JSONB,                      -- { summary, severity_flag, pattern_notes, reka_output }
    uploaded_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    generated_at    TIMESTAMPTZ DEFAULT now(),
    incident_ids    UUID[],                     -- array of incident IDs included
    pdf_url         TEXT,                       -- supabase storage URL
    gap_analysis    JSONB                      -- { present: [], missing: [], notes: "" }
);

CREATE TABLE report_recipients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id       UUID REFERENCES reports(id),
    contact_id      UUID REFERENCES emergency_contacts(id),
    delivery_method TEXT,                       -- sms | email | call
    sent_at         TIMESTAMPTZ,
    status          TEXT DEFAULT 'pending'      -- pending | delivered | failed
);

CREATE TABLE escalation_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id),
    triggered_at        TIMESTAMPTZ DEFAULT now(),
    tier                INTEGER,
    contact_id          UUID REFERENCES emergency_contacts(id),
    delivery_method     TEXT,
    message_sent        TEXT,
    demographic_payload JSONB,                  -- { name, age, hair_color, eye_color, race, photo_url }
    status              TEXT DEFAULT 'pending'  -- pending | delivered | failed
);

