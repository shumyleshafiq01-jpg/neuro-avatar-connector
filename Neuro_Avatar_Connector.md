# Neuro — The Living Digital Mascot

**A product by NeuroGrid Labs**
*Bringing ideas into life.*

---

## What is Neuro?

Neuro is a web-based AI avatar — a glowing biometric-scan face that **sees you, listens, thinks, and speaks back**. It runs in any modern web browser, no install required. The same Neuro can be embedded on a website, on a tablet at a reception desk, in a kiosk, or behind a WhatsApp number.

Think of it as a receptionist, a salesperson, a teaching assistant, and a 24/7 brand ambassador — combined into a single deployable product. One engine. Infinite faces. Fully white-labelled per client.

---

## What it does

| Capability | What the visitor experiences |
|---|---|
| **Visual presence** | A 3D cyan biometric-scan face fills the screen. It blinks, breathes, and tracks the person through the webcam — without ever showing or recording the visitor's image. |
| **Sleeps & wakes** | Eyes close when no one is in front of the camera. They open the moment a face is detected, the screen is touched, or someone speaks. |
| **Eyes that follow** | Gold camera-style focus reticles track the visitor's position in real time. Head turns subtly to face them. |
| **Listens & speaks** | Voice in (microphone), voice out (speakers). Hands-free conversation. Live captions appear below for accessibility. |
| **Touch-reactive** | Tapping the avatar's face triggers a positive flash and ripple — it "feels" the contact. |
| **Powered by Claude** | Anthropic's most capable language model interprets the conversation and decides what to say, when to look up information, and how to capture lead details. |
| **Live knowledge base** | Reads pricing, product info, and FAQ data from a Google Sheet the client controls. Edit the sheet → Neuro speaks the new info on the next question. **No code, no redeploy.** |
| **Lead capture pipeline** | When a visitor shares their name, email, phone, or interest, Neuro writes a row to the Leads tab in the same sheet, in real time. The team sees leads land instantly. |
| **Multi-channel brain** | The same engine powers the web avatar AND a WhatsApp Business number. A customer asks on WhatsApp → Neuro replies with the same personality, same knowledge, same lead capture. |
| **White-labelled** | One deployment, infinite brands. A URL like `?brand=falconhouse` switches greeting, personality, brand colors, and voice — perfect for schools, clinics, retail chains, hotels. |

---

## Where it can be deployed

- **Schools** — Front-desk attendant that answers parent questions about admissions, fees, and timings.
- **Clinics & hospitals** — Patient triage and appointment booking, in English or Urdu.
- **Retail & e-commerce** — Brand mascot on the website plus WhatsApp; turns browsers into qualified leads.
- **Events & expos** — Interactive booth attendant that captures visitor info while pitching products.
- **Government / civic** — Public-facing information point for citizens, in multiple languages.
- **Hotels & hospitality** — 24/7 concierge that handles bookings, restaurant info, and check-in queries.
- **Corporate reception** — Visitor greeting + intent routing, freeing up human receptionists for complex requests.

---

## Technology stack

### Application layer
| Layer | Technology |
|---|---|
| Frontend framework | **Next.js 16** (App Router) + **React 19** + **TypeScript** |
| Styling | **Tailwind CSS 4** |
| 3D rendering | **Three.js** + **React Three Fiber** + **@react-three/drei** |
| Animation | Custom JS animation loops with smooth interpolation |
| Hosting | **Vercel** (serverless) — or any Node-compatible host |

### AI & vision
| Layer | Technology |
|---|---|
| Face tracking | **MediaPipe FaceLandmarker** (Google) — 468 facial landmarks, runs in-browser |
| Voice input | **Web Speech API** (SpeechRecognition) — live transcription with interim results |
| Voice output | **Web Speech API** (SpeechSynthesis) — customizable voice + rate + pitch |
| AI brain | **Anthropic Claude API** (model: claude-sonnet-4-5) with native tool use + prompt caching |

### Integrations
| Layer | Technology |
|---|---|
| Knowledge base (read) | **Google Sheets API v4** via service-account authentication |
| Lead pipeline (write) | **Google Sheets API v4** (append rows to a Leads tab) |
| WhatsApp channel | **Meta Graph API v22.0** (WhatsApp Cloud API) — webhook receive + send |
| Per-user conversation | In-memory store (production-ready upgrade path: Redis / PostgreSQL) |

### Design system
- **Brand palette:** Dark `#080c0e` · Emerald `#10b981` · Gold `#d4af37`
- **Avatar palette:** Biometric cyan `#3ad5ff` with pure-white iris cores (additive blending → glows like a screen)
- **Typography:** Geist Sans + Geist Mono (Vercel typeface)
- **Aesthetic:** Biometric scan portrait — point cloud + wireframe + glowing camera-reticle eyes

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CHANNELS (white-labelled)                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Web Avatar  │    │   WhatsApp   │    │   Future:    │       │
│  │   (browser)  │    │  Cloud API   │    │  Voice phone │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         └────────────────────┼────────────────────┘             │
└──────────────────────────────┼──────────────────────────────────┘
                               ▼
               ┌──────────────────────────────┐
               │      Shared Neuro Brain      │
               │   (Anthropic Claude API)     │
               │   native tool use +          │
               │   prompt caching             │
               └─────────┬────────────────────┘
                         │
        ┌────────────────┴────────────────────┐
        ▼                                     ▼
┌────────────────┐                  ┌─────────────────────┐
│  Google Sheet  │                  │  Browser hardware   │
│  knowledge +   │                  │  webcam, mic,       │
│  lead pipeline │                  │  speaker, touch     │
└────────────────┘                  └─────────────────────┘
```

The shared brain pattern means: a change to Neuro's personality, knowledge, or behavior automatically propagates to **every channel at once**. Update the Google Sheet → web visitors and WhatsApp users instantly hear the new prices.

---

## Current build status

**Phases shipped (production-quality):**
1. Fullscreen shell + reactive neural-particle background
2. Biometric-scan 3D face (real point-cloud topology + wireframe + reticle eyes)
3. Real-time webcam face tracking via MediaPipe (no video stored)
4. Sleep / wake on idle + detection + touch
5. Touch reaction (positive flash + iris pulse)
6. Voice loop (mic → Claude → speaker) with live captions
7. Action markers (open URL, capture lead, show product) + brand white-labelling
8. Google Sheets knowledge base with Anthropic native tool-use
9. Lead pipeline → live Google Sheet rows in real time
10. WhatsApp Cloud API connector (Meta integration)

**On the roadmap:**
- Wake-word detection ("Hey Neuro") via Picovoice Porcupine
- Persistent cross-session memory (returning users greeted by name)
- Branded TTS voice via ElevenLabs (replacing browser default)
- Refined head topology using MediaPipe canonical face mesh
- Multi-language support — Urdu, Sindhi, Punjabi, Arabic
- Direct CRM hooks (HubSpot, Salesforce) alongside the Sheets pipeline

---

## About NeuroGrid Labs

NeuroGrid Labs is a Karachi-based deep-tech company founded **April 5, 2026** by **Sheikh Shumyle Shafiq** — INFJ visionary, BS Computer Science (Karachi University), British Council APTIS English fluent, EC-Council Cybersecurity certified.

The company builds across six verticals — **EdTech, Healthcare, Mobility, Civic Tech, Security, and AI Agents** — with 33+ products in active development or live deployment.

**Live deployments include:**
- **SchoolOS** — Complete student management system → [schoolportal.live](https://schoolportal.live)
- **NeuroGrid Clinic** — Healthcare practice management → [karachitraumainstitute.netlify.app](https://karachitraumainstitute.netlify.app)
- **CivicPulse** — Public-issue reporting and accountability platform → [civicpulsepk.netlify.app](https://civicpulsepk.netlify.app)

---

## Contact

**Sheikh Shumyle Shafiq**
Founder, NeuroGrid Labs
📧 shumyle@neurogridlabs.tech
📱 +92 314 2867152
🌐 [neurogridlabs.tech](https://neurogridlabs.tech)

*Bringing ideas into life.*
