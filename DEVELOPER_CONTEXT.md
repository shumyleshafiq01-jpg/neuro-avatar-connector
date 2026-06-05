# NeuroGrid Labs — Developer Context & Recovery File

> **Purpose:** If Shumyle loses his laptop, switches machines, or starts a fresh Claude session,
> reading this file gives the new session everything it needs to continue as his developer partner.
> Push this to GitHub. Keep it updated after every major milestone.

**Last updated:** June 5, 2026

---

## Who Is Shumyle?

- **Full name:** Muhammad Shumyle Shafiq ("Shoe-Mile")
- **Role:** Founder, NeuroGrid Labs (SMC-Private Limited, Pakistan)
- **Location:** Gulistan-e-Johar Block 16, Karachi
- **Contact:** shumyle@neurogridlabs.tech | +92 314 2867152
- **Personality:** INFJ. Direct, no sugar-coating. Wants strategic-partner coaching, not yes-man behavior.
- **Family:** Wife Natasha (pregnant, gestational diabetes). Brother Minhal (CA at EY Bahrain).
- **Previous role:** IT Administrator at Academus International School (Nov 2020 - Apr 2026, resigned)
- **Current role:** VP Technology, Falconhouse Grammar School (Maymar campus)
- **Education:** BS Computer Science (Karachi University 2020), EC-Council Cybersecurity, 17 Credly badges

## NeuroGrid Labs

- **Founded:** April 5, 2026
- **Tagline:** "Bringing ideas into life"
- **Brand Colors:** Dark #080c0e, Emerald #10b981, Gold #d4af37
- **Website:** neurogridlabs.tech
- **33-product arsenal** across EdTech, Security, Healthcare, AI/Automation, Platform, Retail categories
- **Key live products:** SchoolOS (schoolportal.live), CivicPulse, Karachi Trauma Institute site

---

## Active Projects

### 1. Neuro Avatar Connector — COMPLETE & DEPLOYED

- **Repo:** https://github.com/shumyleshafiq01-jpg/neuro-avatar-connector
- **Live URL:** Deployed on Netlify
- **Working dir:** `D:\Projects\virtual avatar connector\`
- **Stack:** Next.js 16 + TypeScript + Tailwind + Three.js/R3F + MediaPipe + Claude API + Google Sheets
- **What it is:** Web-based AI avatar mascot ("Neuro") with 3D biometric-scan face, webcam eye tracking, voice I/O, live captions, chat input, action markers, white-label support, Google Sheets knowledge base, lead capture pipeline, WhatsApp webhook
- **All 10 phases complete:** Shell → Face → Webcam Eyes → Sleep/Wake → Touch → Voice+Brain → Knowledge Base → Actions → White-Label → Chat Input
- **WhatsApp:** Code built and deployed, needs Meta Developer account setup to activate (see WhatsApp Setup section below)

**Key files:**
- `web/src/lib/neuroBrain.ts` — shared Claude brain for all channels (voice, chat, WhatsApp)
- `web/src/lib/actions.ts` — action markers ([OPEN_URL], [CAPTURE_LEAD], [SHOW_PRODUCT])
- `web/src/lib/brands.ts` — white-label brand config system
- `web/src/lib/sheets.ts` — Google Sheets read (products) + write (leads)
- `web/src/lib/whatsapp.ts` — WhatsApp Cloud API send utility
- `web/src/app/api/chat/route.ts` — voice/chat API endpoint
- `web/src/app/api/whatsapp/webhook/route.ts` — WhatsApp webhook (GET verify + POST messages)
- `web/src/components/NeuronStage.tsx` — main stage orchestrator
- `web/src/components/NeuroFace.tsx` — 3D face rendering
- `web/src/components/ChatInput.tsx` — typing channel UI
- `web/src/hooks/useVoice.ts` — STT/TTS with pronunciation map ("Shumyle" → "Shoe Mile")
- `web/src/hooks/useChat.ts` — chat state management

**Environment variables needed (.env.local):**
- `ANTHROPIC_API_KEY` — Claude API key
- `GOOGLE_SHEETS_ID` — knowledge base spreadsheet
- `GOOGLE_SERVICE_ACCOUNT_JSON` — service account credentials (production via env var)
- `WHATSAPP_VERIFY_TOKEN` — any secret string for webhook verification
- `WHATSAPP_PHONE_NUMBER_ID` — from Meta WhatsApp app
- `WHATSAPP_ACCESS_TOKEN` — Meta bearer token

### 2. Accounting SaaS — PLANNING PHASE

- **Working dir:** `D:\Projects\Accounting SaaS\`
- **Separate from avatar project — DO NOT MIX**
- **What it is:** Multi-tenant SaaS with two AI agents for accounting automation
- **Architecture:** Separate Supabase project (NOT shared with NeuroGrid Learn), modular design, RBAC per module
- **Supabase:** Own project — completely separate from NeuroGrid Learn to prevent data mixing

**Two AI Agents:**
1. **Accounting Head Agent** (11 modules): GL posting, bank reconciliation, sales tax reconciliation, invoice verification, duplicate detection, PO-GRN matching, approval verification, aging reports, petty cash, financial reporting, expense monitoring
2. **Costing & Sales Agent** (7 modules): backward costing, product costing, margin analysis, quotation comparison, historical costing, freight impact, profitability analysis

**Key files created:**
- `ACCOUNTING_MODULES_CHECKLIST.md` — detailed 18-module specification
- `TASK_CHECKLIST.docx` — printable task checklist with checkboxes

**Data ingestion:** CSV, Excel, images (OCR), copy-paste, Google Sheets
**Mobile strategy:** PWA first → WhatsApp integration → native app later
**Decisions locked:**
- Separate Supabase project (Option A)
- Modular architecture (each module = folder with UI + API route + agent prompt)
- Feature flags per org for enabling/disabling modules
- Claude API for agent brains (same patterns as avatar)

### 3. NeuroGrid Learn — EXISTING, DO NOT TOUCH

- **Existing ERP prototype with Supabase auth, org/user/role management**
- **Reference only** — reuse architecture patterns, never modify the original
- **Has its own Supabase project**

---

## Architecture Decisions Log

| Date | Decision | Context |
|------|----------|---------|
| Apr-May 2026 | Next.js + Three.js + MediaPipe for avatar | Browser-only, no native deps |
| Apr-May 2026 | Claude claude-sonnet-4-5 as brain, max_tokens 320-384 | Cost-effective, fast enough |
| Apr-May 2026 | Google Sheets as knowledge base | Client can edit products/prices without code |
| Apr-May 2026 | White-label via URL params (?brand=slug) | One deployment serves many clients |
| Jun 5, 2026 | Separate Supabase for Accounting SaaS | Prevents data mixing with NeuroGrid Learn |
| Jun 5, 2026 | Modular SaaS architecture | Each module independent, toggle per org |
| Jun 5, 2026 | PWA + WhatsApp before native mobile | Fastest path to mobile availability |

---

## WhatsApp Setup (Pending)

The webhook code is built and deployed. To activate:

1. Create Meta Developer account at https://developers.facebook.com
2. Create app → add WhatsApp product
3. Get Phone Number ID + Access Token from API Setup
4. Set env vars: WHATSAPP_VERIFY_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN
5. Configure webhook URL: `https://[netlify-url]/api/whatsapp/webhook`
6. Set verify token to match WHATSAPP_VERIFY_TOKEN env var
7. Subscribe to "messages" webhook field
8. Add test phone number, verify via WhatsApp code
9. Test by sending a message to the Meta test number

---

## Recovery Procedure (New Laptop)

1. `git clone https://github.com/shumyleshafiq01-jpg/neuro-avatar-connector.git`
2. Copy this DEVELOPER_CONTEXT.md into the `.claude/` memory folder
3. `cd web && npm install`
4. Create `web/.env.local` from `web/.env.local.example`, fill in keys
5. `npm run dev` — avatar running locally
6. For Accounting SaaS: clone that repo separately, `npm install`, create `.env.local`
7. Start a new Claude Code session in the project folder — it reads this file and picks up context

---

## Coaching Notes for Future Claude Sessions

- Shumyle is the visionary. He trusts implementation choices but wants to understand the "why."
- He gets frustrated by pseudo-solutions — match his pace, be direct.
- Never handle API keys — he pastes them himself.
- Never modify NeuroGrid Learn or the original avatar project unless explicitly asked.
- Challenge him when he overextends (33 products is a lot).
- Celebrate wins genuinely.
- His wife Natasha is pregnant — he's balancing family, work, and startup. Be efficient with his time.
- Name pronunciation: "Shumyle" = "Shoe Mile"
