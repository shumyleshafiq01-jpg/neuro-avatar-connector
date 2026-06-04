# NEURO

### The Living AI Mascot from NeuroGrid Labs
*Bringing ideas into life.*

---

## What is Neuro?

Neuro is a **web-based AI avatar** that sees you, hears you, speaks back, thinks in real time, and remembers your conversation. It's white-labelable for any brand. Deploy it once — it works on a website, a tablet kiosk, a Chromebook in a classroom, a phone in your pocket, or inside WhatsApp. **Same brain, every channel.**

It is NeuroGrid Labs' answer to the question: *"What if every business could afford an always-on, brand-perfect, multilingual front-desk that captures leads, qualifies customers, and never sleeps?"*

---

## What Neuro does today

| Capability | What it means in practice |
|---|---|
| **Voice conversation** | Click the mic, talk to Neuro, hear a reply in a warm masculine voice. Live captions appear under the avatar for accessibility. |
| **Biometric-style 3D face** | An animated cyan dot-cloud head, rendered in WebGL. Eyes track your cursor — and your **actual face** via webcam — like a portrait whose gaze follows you. |
| **Camera-aware presence** | When a real person walks in front of the camera, Neuro "wakes up," locks gaze, and tightens the focus reticles in his eyes. When alone for 6 seconds, his eyes close — he's resting. |
| **Touch reactions** | Tap the face and the constellation flashes — a subtle "I felt that" cue, ideal for kiosks. |
| **Live knowledge base** | Neuro reads your prices, product descriptions, and demo links from a **Google Sheet** you control. Edit a cell, Neuro speaks the new value instantly — no redeploy, no engineer. |
| **Lead capture → CRM** | When a customer shares their name, contact, or interest, Neuro writes a row to a **Leads** tab in the same sheet, in real time. You and your team see leads land on phones and laptops simultaneously. |
| **White-label per client** | A single `?brand=acme` URL parameter swaps Neuro's greeting, system prompt, and (soon) colors and voice. One deployment, infinite branded instances. |
| **Persistent action layer** | Neuro can open the right product page in a new tab, highlight a specific product, or hand off to a human — all triggered by his own decision, not hard-coded keywords. |

---

## Coming next (in active build)

- **WhatsApp Business integration** — Same Neuro, on WhatsApp. Customers chat with him in their native messaging app; leads still land in your sheet.
- **Wake-word activation** — *"Hey Neuro"* triggers the mic without clicking. No-touch kiosk mode.
- **Real human 3D head** — Upgrading the procedural mesh to a true anatomical head topology with lipsync via audio analyzer.
- **Persistent memory** — Returning users greeted by name: *"Welcome back, Ali — last time you were asking about NeuroGrid Learn."*

---

## How it feels

Opening Neuro in a browser is unlike any chatbot widget on the market. A dark stage. A glowing 3D head made of hundreds of cyan dots, connected by faint wireframe lines, breathing slowly. Two gold-rimmed focus reticles for eyes. When you move your cursor, the whole face turns to follow. When you speak, the dots pulse with your voice. When Neuro replies, his words appear under him in mono captions, and a warm voice carries through your speakers.

It's not a chatbot. It's a **presence**.

---

## Under the hood

### Frontend
- **Next.js 16** (App Router, Turbopack dev) + **React 19** + **TypeScript**
- **Tailwind CSS 4** for theming
- **Three.js + React Three Fiber** for the 3D head, wireframe, and animations
- **MediaPipe FaceLandmarker** for in-browser, GPU-accelerated facial tracking (468 landmarks, no server roundtrip)
- **Web Speech API** for speech-to-text (live interim captions) and text-to-speech
- Procedural canvas neuron background with physics-based cursor reactivity

### Backend
- **Anthropic Claude (claude-sonnet-4-5)** as the language brain, with:
  - **Tool-use loop** — Claude autonomously calls a `lookup_product_info` function before answering, so prices and details come from your live data, never hallucinated
  - **Prompt caching** — ~80% cost reduction on repeat conversation turns
  - **Brand-aware system prompts** — every white-label deployment gets a custom personality layer
- **Google Sheets API** as a real-time knowledge base and zero-database CRM
- **WhatsApp Cloud API** integration (in build) using Meta's Graph API and a system-user permanent access token

### Architecture highlights
- **Multi-channel shared brain** — `lib/neuroBrain.ts` powers both `/api/chat` (web voice) and `/api/whatsapp/webhook`. Same personality, same tools, same lead pipeline, every channel.
- **Action-marker layer** — Neuro embeds invisible markers (`[OPEN_URL:...]`, `[CAPTURE_LEAD:...]`) in his replies; the server parses them into structured side effects that the frontend or webhook executes. The user never sees or hears them.
- **Service-account-secured sheet** — read + write to your Google Sheet via a least-privilege service account; credentials never leave the server.
- **Conversation persistence per channel** — in-memory per-phone history for WhatsApp; localStorage for web (upgrade path: Redis/Postgres).

---

## Where Neuro can live

- **Your website** — drop-in widget on `avatar.neurogridlabs.tech` (or any subdomain you white-label)
- **Touch kiosks** — full-screen mode with 90% face + 10% controls, optimized for tap and gesture
- **WhatsApp** — text-mode Neuro, same brain, same lead pipeline (in build)
- **Embedded** — iframe / `<script>` snippet for partner sites
- **API-driven** — any system that can POST JSON can talk to Neuro and get a reply with structured actions

---

## Use cases

- **Schools** — front-desk receptionist for admission inquiries, fee structure, course details, parent contact capture. Built-in: NeuroGrid SchoolOS integration.
- **Clinics & hospitals** — service descriptions, doctor availability, appointment intent capture. Built-in: NeuroGrid Clinic integration.
- **Sales-led businesses** — 24/7 product walkthrough that delivers qualified leads to your team's Google Sheet or CRM by morning.
- **Civic / public services** — public-facing intake terminal for grievances, queries, and feedback. Powering: CivicPulse.
- **Consulting firms** — first-touch qualification before human handoff; saves senior consultants from low-context discovery calls.
- **Retail kiosks** — interactive product-and-pricing screen that captures interested-buyer info instantly.

---

## Built by NeuroGrid Labs

**NeuroGrid Labs** is a Karachi-based deep-tech company founded **April 5, 2026** by **Sheikh Shumyle Shafiq**, building a 33-product arsenal across EdTech, Healthcare, Mobility, Security, and AI agents.

**Tagline:** *Bringing ideas into life.*
**Brand:** Dark · Emerald · Gold

### Live products in this family
- **SchoolOS** — schoolportal.live
- **NeuroGrid Clinic** — karachitraumainstitute.netlify.app
- **CivicPulse** — civicpulsepk.netlify.app

### Contact
- **Email:** shumyle@neurogridlabs.tech
- **Web:** neurogridlabs.tech
- **Phone:** +92 314 2867152
- **LinkedIn:** /company/neurogridlabs

---

*Document version: May 2026 · Neuro Avatar build*
