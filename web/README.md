# Neuro Avatar Connector

A web-based AI avatar — biometric-scan face that sees, listens, thinks, and speaks. Built by [NeuroGrid Labs](https://neurogridlabs.tech).

> *Bringing ideas into life.*

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind 4**
- **Three.js** + **React Three Fiber** — 3D biometric face
- **MediaPipe FaceLandmarker** — webcam face tracking, runs in-browser
- **Web Speech API** — speech-to-text + text-to-speech
- **Anthropic Claude API** — the brain (claude-sonnet-4-5 with native tool use + prompt caching)
- **Google Sheets API** — live knowledge base (read) + lead pipeline (write)
- **Meta WhatsApp Cloud API** — Neuro on WhatsApp

## Local development

```bash
npm install
cp .env.local.example .env.local
# fill in ANTHROPIC_API_KEY (required) + the optional Google / WhatsApp creds
npm run dev
```

Then open <http://localhost:3000>, click **Mic**, and talk to Neuro.

## Required environment variables

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | <https://console.anthropic.com/settings/keys> |
| `GOOGLE_SHEETS_ID` | The ID portion of your Google Sheet URL |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Full JSON content of your Google service-account key (production). Or place the file at `credentials/google-service-account.json` for local dev. |

## Optional environment variables

| Variable | Default | Purpose |
|---|---|---|
| `GOOGLE_SHEETS_TAB` | `Products` | Tab with the product catalogue |
| `GOOGLE_LEADS_TAB` | `Leads` | Tab where captured leads are appended |
| `WHATSAPP_VERIFY_TOKEN` | — | Random string for Meta webhook verification |
| `WHATSAPP_PHONE_NUMBER_ID` | — | From Meta Business → WhatsApp |
| `WHATSAPP_ACCESS_TOKEN` | — | Permanent bearer from Meta system user |
| `WHATSAPP_GRAPH_VERSION` | `v22.0` | Meta Graph API version |

## Deploy to Netlify

1. Push this folder to a GitHub repo
2. New site on Netlify → connect repo → it auto-detects Next.js via `netlify.toml`
3. Add the env vars above in **Site settings → Environment variables**
4. Trigger deploy

The `netlify.toml` pins Node 20 + the Next.js plugin and sets the `Permissions-Policy` header so the browser allows camera/mic access on your domain.

## Architecture

```
Channels (web avatar, WhatsApp, …)
      │
      ▼
Shared Neuro brain (Anthropic Claude + tool use)
      │
      ├─→ Google Sheet (knowledge + leads)
      └─→ Browser hardware (webcam, mic, speaker, touch)
```

See the full one-pager for the marketing pitch and the complete architecture.
