# AMBER — Project Reference

**Hackathon:** Hack for Humanity 2026 — Santa Clara University  
**Dates:** Feb 28 – Mar 1, 2026  
**Team size:** 4

---

## What It Is

AMBER is a DV evidence collection app disguised as a meditation timer. Victims document incidents — photos, video, audio, notes — which go straight to an encrypted server vault. An AI agent reads the evidence and tells the user what they've documented, what courts typically look for in similar cases, and what's missing. A dead man's switch alerts trusted contacts if check-ins are missed. A victim-approved AI voice agent can call friends, family, or lawyers on their behalf.

**The name:** AMBER Alert has helped recover 1,200+ abducted children. There's nothing like it for DV victims. This is that.

---

## The Disguise

The app looks like a meditation timer. The user sets a breathing duration using a scroll picker (hours : minutes : seconds) — that duration is their password. Wrong duration = stays in meditation mode, nothing suspicious. Correct duration = vault unlocks. Session ends when they leave the app; re-entry always goes through the timer. An abuser who picks up the phone sees a breathing timer. Nothing more.

**Edge case note:** The search space is 86,400 combinations — not guessable. The real risk is the victim forgetting their duration under stress. For the hackathon, there is no recovery path. If a judge asks, acknowledge it and describe what a production version would do (e.g., recovery via trusted contact verification).

---

## Features

### Evidence Vault
- Accepts photos, video, audio, and text notes
- Encrypted at rest, uploaded immediately — nothing stays local only
- SHA-256 hash generated at upload so files can't be altered after the fact
- Metadata preserved: timestamp, GPS, device info, EXIF

### AI Case Analysis (Legal Agent)
- Reads the full evidence history
- Tells the user what they've documented and what courts typically look for in similar cases
- Identifies what's present and what's missing — framed as a gap analysis, not a verdict
- The agent never says "your case is strong/weak" — it says "you have X, courts often also look for Y and Z"
- Generates a styled PDF report (via `reportlab`) they can hand to a lawyer or police
- Victim picks who to send the report to from their emergency contacts list
- **Disclaimer on every output:** *"This is AI-generated and not legal advice. It is not legally accurate. Use it however is useful to you, but consult a lawyer before taking action."*

### Check-in / Dead Man's Switch
- Victim sets a check-in frequency (e.g., every 24 hours)
- Missed check-in triggers tiered escalation:
  - **Tier 1:** soft SMS — "Please check on [name]"
  - **Tier 2:** urgent SMS with victim's physical description so contact can report them missing
  - **Tier 3:** ElevenLabs voice agent calls friends/family or lawyer with victim-approved script
- Victim writes and approves every escalation message during onboarding
- No automatic escalation to law enforcement without explicit opt-in
- Tier 2+ messages include: name, photo, hair/eye color, race, age — everything a contact needs to file a missing persons report

### Victim-Approved Agent Calls (ElevenLabs)
- Victim sets up who gets called and exactly what gets said
- Calls placed from a dedicated AMBER Google Voice number
- ElevenLabs places the call on their behalf
- Triggered manually or by the dead man's switch
- The agent reads the pre-approved script — it doesn't improvise
- **Scope: friends, family, lawyers only. No hotline calls.**

### Create Report Flow
- Victim taps "Create Report"
- Legal Agent compiles all evidence into a chronological, styled PDF
- Victim is prompted to select recipients from their emergency contacts list
- Delivery options per contact: SMS link, email, or ElevenLabs call

---

## Stack

| Layer | Tech |
|---|---|
| Mobile | React Native (iOS + Android) |
| Backend | FastAPI (Python) |
| Database | Supabase PostgreSQL (all structured + semi-structured data via JSONB) |
| Blob storage | Supabase Storage (photos, video, audio) |
| Agent orchestration | LangGraph + GPT-4o |
| Media analysis | Reka AI (photo/video understanding) |
| PDF generation | reportlab (styled PDFs) |
| Voice agent | ElevenLabs + Google Voice number |
| SMS | Twilio |
| Auth | JWT, dual-password logic in FastAPI |
| Scheduling | APScheduler (dead man's switch cron) |

**Note:** Everything lives in Supabase. No MongoDB. Incidents, reports, and escalation logs use JSONB columns for flexible nested data. One database, one connection, fewer failure points during demo.

---

## Agents (LangGraph)

**Ingest Agent** — fires on every upload. Extracts metadata, generates SHA-256 hash, stores encrypted file to Supabase Storage. Hands off to Analysis Agent.

**Analysis Agent** — runs Reka AI on photos/video, synthesizes evidence history, flags patterns (frequency, time of day, escalation over time). Writes plain-English summary back to the incident row.

**Legal Agent** *(on demand)* — pulls full evidence history, generates chronological incident report in neutral factual language, runs gap analysis against common DV evidence checklist, outputs styled PDF via reportlab. Never renders a verdict — only documents what's present and what's missing.

**Watchdog Agent** *(cron)* — monitors check-in timestamps. Runs tiered escalation via Twilio SMS and ElevenLabs. Tier 2+ payloads include victim demographic info. Only sends victim-pre-approved content.

---

## Schemas (All Supabase PostgreSQL)

### users
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
username        TEXT UNIQUE NOT NULL
password_hash   TEXT NOT NULL
timer_duration  INTEGER NOT NULL       -- seconds (scroll picker value = fake password)
first_name      TEXT
last_name       TEXT
gender          TEXT
age             INTEGER
photo_url       TEXT                   -- stored in Supabase Storage
hair_color      TEXT
eye_color       TEXT
race            TEXT
created_at      TIMESTAMPTZ DEFAULT now()
```

### emergency_contacts
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id             UUID REFERENCES users(id)
name                TEXT NOT NULL
phone               TEXT
email               TEXT
relationship        TEXT               -- friend | family | lawyer | advocate
preferred_method    TEXT               -- sms | email | call
escalation_enabled  BOOLEAN DEFAULT false
escalation_tier     INTEGER            -- 1 | 2 | 3
created_at          TIMESTAMPTZ DEFAULT now()
```

### checkin_config
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id             UUID REFERENCES users(id)
frequency_hours     INTEGER NOT NULL
last_checkin_at     TIMESTAMPTZ
next_due_at         TIMESTAMPTZ
is_active           BOOLEAN DEFAULT true
```

### checkin_logs
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID REFERENCES users(id)
checked_in_at   TIMESTAMPTZ
was_missed      BOOLEAN DEFAULT false
```

### escalation_config
```sql
id                      UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id                 UUID REFERENCES users(id)
tier                    INTEGER NOT NULL       -- 1 | 2 | 3
contact_id              UUID REFERENCES emergency_contacts(id)
approved_message        TEXT NOT NULL
delivery_method         TEXT                   -- sms | email | call
law_enforcement_optin   BOOLEAN DEFAULT false
```

### incidents
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID REFERENCES users(id)
timestamp       TIMESTAMPTZ DEFAULT now()
type            TEXT NOT NULL              -- photo | video | audio | note
file_url        TEXT                       -- supabase storage URL (null for notes)
file_hash       TEXT                       -- SHA-256
content         TEXT                       -- text content for notes
metadata        JSONB                      -- { gps, device, exif }
analysis        JSONB                      -- { summary, severity_flag, pattern_notes, reka_output }
uploaded_at     TIMESTAMPTZ DEFAULT now()
```

### reports
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID REFERENCES users(id)
generated_at    TIMESTAMPTZ DEFAULT now()
incident_ids    UUID[]                     -- array of incident IDs included
pdf_url         TEXT                       -- supabase storage URL
gap_analysis    JSONB                      -- { present: [], missing: [], notes: "" }
```

### report_recipients
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
report_id       UUID REFERENCES reports(id)
contact_id      UUID REFERENCES emergency_contacts(id)
delivery_method TEXT                       -- sms | email | call
sent_at         TIMESTAMPTZ
status          TEXT DEFAULT 'pending'     -- pending | delivered | failed
```

### escalation_logs
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id             UUID REFERENCES users(id)
triggered_at        TIMESTAMPTZ DEFAULT now()
tier                INTEGER
contact_id          UUID REFERENCES emergency_contacts(id)
delivery_method     TEXT
message_sent        TEXT
demographic_payload JSONB                  -- { name, age, hair_color, eye_color, race, photo_url }
status              TEXT DEFAULT 'pending'  -- pending | delivered | failed
```

---

## PDF Report Styling (reportlab)

The generated PDF is the artifact a victim hands to a lawyer. It needs to look credible, not like a code printout.

### Layout Guidelines
- **Page size:** Letter (8.5 × 11)
- **Margins:** 1 inch all sides
- **Font:** Helvetica (built into reportlab, no external fonts needed)
  - Title: 18pt bold
  - Section headers: 13pt bold
  - Body: 10pt regular
  - Disclaimer: 9pt italic, gray
- **Header:** AMBER logo (small, top-left) + "Confidential Evidence Report" (top-right) + generation date
- **Footer:** Page number centered + disclaimer line on every page

### Content Structure
1. **Cover page:** "AMBER Evidence Report" + generated date + victim name (optional, configurable)
2. **Summary section:** AI-generated overview — total incidents, date range, types of evidence collected
3. **Incident timeline:** Chronological table — date/time, type, location (if GPS available), AI summary of each incident. Alternate row shading for readability.
4. **Gap analysis section:** Two-column layout — "Evidence Documented" (left, green accent) vs. "Typically Considered by Courts" (right, amber/orange accent). Missing items clearly marked.
5. **Full disclaimer page:** Final page, full legal disclaimer in large readable text.

### Styling Details
- Use `reportlab.lib.colors` for accent colors — keep it muted and professional (dark teal for headers, light gray for table stripes)
- Use `Table` and `TableStyle` from `reportlab.platypus` for the incident timeline
- Add horizontal rules (`HRFlowable`) between sections
- Keep it to a single visual language — no decorative elements, no gradients

### Implementation Tip
Build a `generate_report(user_id)` function that queries all incidents for the user, calls the Legal Agent for the gap analysis text, and pipes everything into a reportlab `SimpleDocTemplate` with a consistent stylesheet. Return the PDF bytes, upload to Supabase Storage, store the URL in the `reports` table.

---

## Onboarding Flow

1. Download — looks like a meditation app
2. Sign up: username + real password + timer duration (fake password via scroll picker)
3. Collect: first/last name, gender, age, photo, hair/eye color, race *(used in dead man's switch Tier 2+ payloads)*
4. Add emergency contacts (name, phone/email, relationship, escalation tier)
5. Set check-in frequency
6. Write and approve escalation message per tier
7. Walkthrough of vault features

---

## Demo Flow (Priority Order)

**Must work (core demo):**
1. Open app — meditation timer, nothing suspicious
2. Set wrong timer duration — stays in meditation mode
3. Set correct timer duration — vault unlocks
4. Upload a photo — Ingest hashes it, Analysis surfaces a pattern insight
5. Tap "Create Report" — Legal Agent generates gap analysis + styled PDF

**Should work (strong demo):**
6. Select recipient from emergency contacts — report sent via chosen method
7. Show Watchdog config — check-in schedule, escalation tiers, approved messages

**Nice to have (wow factor):**
8. Trigger a simulated missed check-in → show SMS escalation
9. Play an ElevenLabs agent call recording

**Fallback:** If voice/SMS integrations aren't ready, show the config screens and play a pre-recorded demo of the call. Judges care that you designed the system correctly, not that Twilio didn't error during live demo.

---

## Legal Agent Framing (Important — Read This)

The agent never makes a determination of whether abuse occurred or whether a case "is good." It:
- Lists what evidence has been submitted
- Lists what evidence courts typically consider in DV cases (photos of injuries, medical records, communication logs, witness accounts, documented pattern over time)
- Identifies what's present vs. missing — gap analysis only
- Uses language like "courts often also consider" and "you may want to discuss X with a lawyer"
- Always appends the disclaimer

This protects the victim from acting on a false assessment and protects AMBER from legal liability.

---

## Pitch Hook

*"AMBER Alerts have helped recover over 1,200 abducted children by getting communities to act fast. But there's no AMBER for domestic violence victims — people in danger every day, whose cases fall apart because they have no safe way to collect evidence. Until now."*

---

## In-App Disclaimers

- AI analysis is not legal advice and is not legally accurate
- This app does not guarantee safety — call 911 in immediate danger
- National DV Hotline: 1-800-799-7233