/**
 * Build Neuro_Avatar_Connector.pdf using pdfkit.
 *
 * Mirrors the structure & styling of the DOCX:
 * - A4 portrait, 1" margins
 * - Cover page with NEURO title in emerald
 * - Section H1s in emerald with underline rule
 * - Sub-H2s in gold
 * - Tables (two-column) with emerald header rows
 * - Monospaced architecture diagram block
 * - Bullet lists
 * - Tappable hyperlinks
 */

import fs from "node:fs";
import PDFDocument from "pdfkit";

const EMERALD = "#10b981";
const GOLD = "#d4af37";
const DARK = "#080c0e";
const SOFT = "#5a5a5a";
const RULE = "#cccccc";

// A4 = 595.28 x 841.89 pt (PDF unit = pt). 1" margin = 72 pt.
const MARGIN = 72;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;

const outPath = "D:/Projects/virtual avatar connector/Neuro_Avatar_Connector.pdf";

const doc = new PDFDocument({
  size: "A4",
  margin: MARGIN,
  info: {
    Title: "Neuro — The Living Digital Mascot",
    Author: "NeuroGrid Labs",
    Subject: "Product one-pager",
    Creator: "Neuro Avatar Connector",
  },
});
doc.pipe(fs.createWriteStream(outPath));

// ---- Helpers ----

function h1(text) {
  // Ensure room — break to new page if near bottom
  if (doc.y > PAGE_H - MARGIN - 100) doc.addPage();
  doc
    .moveDown(0.5)
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor(EMERALD)
    .text(text, { align: "left" });
  // Underline rule
  const y = doc.y + 2;
  doc
    .moveTo(MARGIN, y)
    .lineTo(PAGE_W - MARGIN, y)
    .lineWidth(1.5)
    .strokeColor(EMERALD)
    .stroke();
  doc.moveDown(0.5);
  doc.fillColor(DARK).strokeColor(DARK);
}

function h2(text) {
  if (doc.y > PAGE_H - MARGIN - 80) doc.addPage();
  doc
    .moveDown(0.5)
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(GOLD)
    .text(text);
  doc.moveDown(0.25);
  doc.fillColor(DARK);
}

function body(text, opts = {}) {
  doc
    .font(opts.font ?? "Helvetica")
    .fontSize(opts.size ?? 11)
    .fillColor(opts.color ?? DARK)
    .text(text, {
      align: opts.align ?? "left",
      lineGap: 2,
      paragraphGap: 6,
      ...opts.textOpts,
    });
}

function bullet(label, body) {
  // "• Label — body"
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor(DARK);
  const indent = 16;
  doc.text("• ", { continued: true, indent: 0, lineGap: 2 });
  if (label) {
    doc.font("Helvetica-Bold").fillColor(EMERALD).text(label + " — ", { continued: true });
    doc.font("Helvetica").fillColor(DARK).text(body);
  } else {
    doc.font("Helvetica").fillColor(DARK).text(body);
  }
  doc.moveDown(0.15);
}

function numberedItem(n, text) {
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor(DARK)
    .text(`${n}. ${text}`, { lineGap: 2, paragraphGap: 4 });
}

function link(label, href, opts = {}) {
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#0563C1");
  if (opts.continued) {
    doc.text(label, {
      link: href,
      underline: true,
      continued: opts.continued,
    });
  } else {
    doc.text(label, { link: href, underline: true });
  }
  doc.fillColor(DARK);
}

// Two-column table with emerald header, alt-row shading
function table(headers, rows, colWidths) {
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  const startX = MARGIN;
  let y = doc.y;

  // Page-break guard for the header row
  const lineH = 16;
  const padX = 8;
  const padY = 6;

  // Header row
  const headerH = lineH + padY * 2;
  // Background
  doc.rect(startX, y, totalW, headerH).fill(EMERALD);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(11);
  let xCursor = startX;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], xCursor + padX, y + padY, {
      width: colWidths[i] - padX * 2,
    });
    xCursor += colWidths[i];
  }
  y += headerH;

  // Data rows
  doc.font("Helvetica").fontSize(10).fillColor(DARK);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    // Measure heights for each cell
    const cellHeights = row.map((cell, i) =>
      doc.heightOfString(String(cell), {
        width: colWidths[i] - padX * 2,
      })
    );
    const rowH = Math.max(...cellHeights) + padY * 2;

    // Page-break if needed
    if (y + rowH > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }

    // Alt-row shading
    if (r % 2 === 0) {
      doc.rect(startX, y, totalW, rowH).fill("#f4f9f7");
    }
    // Borders
    doc.strokeColor(RULE).lineWidth(0.5).rect(startX, y, totalW, rowH).stroke();
    let cx = startX;
    for (let i = 0; i < row.length; i++) {
      // Vertical separators between cols
      if (i > 0) {
        doc
          .moveTo(cx, y)
          .lineTo(cx, y + rowH)
          .strokeColor(RULE)
          .lineWidth(0.5)
          .stroke();
      }
      doc.fillColor(DARK).text(String(row[i]), cx + padX, y + padY, {
        width: colWidths[i] - padX * 2,
      });
      cx += colWidths[i];
    }
    y += rowH;
  }

  doc.y = y + 8;
  doc.fillColor(DARK).strokeColor(DARK);
}

function monoBlock(text) {
  // Background panel
  const startX = MARGIN;
  const startY = doc.y;
  const lines = text.split("\n");
  doc.font("Courier").fontSize(8.5).fillColor("#333");
  const lineH = 11;
  const padY = 10;
  const blockH = lines.length * lineH + padY * 2;
  // Page-break if needed
  if (startY + blockH > PAGE_H - MARGIN) {
    doc.addPage();
  }
  const y0 = doc.y;
  doc.rect(startX, y0, CONTENT_W, blockH).fill("#f4f4f4");
  doc.fillColor("#333").font("Courier").fontSize(8.5);
  for (let i = 0; i < lines.length; i++) {
    doc.text(lines[i], startX + 8, y0 + padY + i * lineH, {
      width: CONTENT_W - 16,
      lineBreak: false,
    });
  }
  doc.y = y0 + blockH + 8;
  doc.fillColor(DARK);
}

// ---- Cover page ----
doc
  .font("Helvetica-Bold")
  .fontSize(72)
  .fillColor(EMERALD);
const titleY = PAGE_H / 2 - 120;
doc.text("NEURO", MARGIN, titleY, { align: "center", width: CONTENT_W });

doc
  .font("Helvetica")
  .fontSize(22)
  .fillColor(DARK)
  .text("The Living Digital Mascot", { align: "center", width: CONTENT_W });

doc.moveDown(0.5);
doc
  .font("Helvetica-Oblique")
  .fontSize(13)
  .fillColor(SOFT)
  .text("A product by NeuroGrid Labs", { align: "center", width: CONTENT_W });

doc.moveDown(2);
doc
  .font("Helvetica-BoldOblique")
  .fontSize(13)
  .fillColor(GOLD)
  .text("Bringing ideas into life.", { align: "center", width: CONTENT_W });

doc.addPage();

// ---- What is Neuro ----
h1("What is Neuro?");
body(
  "Neuro is a web-based AI avatar — a glowing biometric-scan face that sees you, listens, thinks, and speaks back. It runs in any modern web browser, no install required. The same Neuro can be embedded on a website, on a tablet at a reception desk, in a kiosk, or behind a WhatsApp number."
);
body(
  "Think of it as a receptionist, a salesperson, a teaching assistant, and a 24/7 brand ambassador — combined into a single deployable product. One engine. Infinite faces. Fully white-labelled per client."
);

// ---- What it does ----
h1("What it does");
table(
  ["Capability", "What the visitor experiences"],
  [
    ["Visual presence", "A 3D cyan biometric-scan face fills the screen. It blinks, breathes, and tracks the person through the webcam — without ever showing or recording the visitor's image."],
    ["Sleeps & wakes", "Eyes close when no one is in front of the camera. They open the moment a face is detected, the screen is touched, or someone speaks."],
    ["Eyes that follow", "Gold camera-style focus reticles track the visitor's position in real time. Head turns subtly to face them."],
    ["Listens & speaks", "Voice in (microphone), voice out (speakers). Hands-free conversation. Live captions appear below for accessibility."],
    ["Touch-reactive", 'Tapping the avatar\'s face triggers a positive flash and ripple — it "feels" the contact.'],
    ["Powered by Claude", "Anthropic's most capable language model interprets the conversation and decides what to say, when to look up information, and how to capture lead details."],
    ["Live knowledge base", "Reads pricing, product info, and FAQ data from a Google Sheet the client controls. Edit the sheet → Neuro speaks the new info on the next question. No code, no redeploy."],
    ["Lead capture pipeline", "When a visitor shares their name, email, phone, or interest, Neuro writes a row to the Leads tab in the same sheet, in real time. The team sees leads land instantly."],
    ["Multi-channel brain", "The same engine powers the web avatar AND a WhatsApp Business number. A customer asks on WhatsApp → Neuro replies with the same personality, same knowledge, same lead capture."],
    ["White-labelled", "One deployment, infinite brands. A URL like ?brand=falconhouse switches greeting, personality, brand colors, and voice — perfect for schools, clinics, retail chains, hotels."],
  ],
  [140, CONTENT_W - 140]
);

// ---- Use cases ----
h1("Where it can be deployed");
const useCases = [
  ["Schools", "Front-desk attendant that answers parent questions about admissions, fees, and timings."],
  ["Clinics & hospitals", "Patient triage and appointment booking, in English or Urdu."],
  ["Retail & e-commerce", "Brand mascot on the website plus WhatsApp; turns browsers into qualified leads."],
  ["Events & expos", "Interactive booth attendant that captures visitor info while pitching products."],
  ["Government / civic", "Public-facing information point for citizens, in multiple languages."],
  ["Hotels & hospitality", "24/7 concierge that handles bookings, restaurant info, and check-in queries."],
  ["Corporate reception", "Visitor greeting + intent routing, freeing up human receptionists for complex requests."],
];
for (const [label, b] of useCases) bullet(label, b);

doc.addPage();

// ---- Tech stack ----
h1("Technology stack");

h2("Application layer");
table(
  ["Layer", "Technology"],
  [
    ["Frontend framework", "Next.js 16 (App Router) + React 19 + TypeScript"],
    ["Styling", "Tailwind CSS 4"],
    ["3D rendering", "Three.js + React Three Fiber + @react-three/drei"],
    ["Animation", "Custom JS animation loops with smooth interpolation"],
    ["Hosting", "Vercel (serverless) — or any Node-compatible host"],
  ],
  [160, CONTENT_W - 160]
);

h2("AI & vision");
table(
  ["Layer", "Technology"],
  [
    ["Face tracking", "MediaPipe FaceLandmarker (Google) — 468 facial landmarks, runs in-browser"],
    ["Voice input", "Web Speech API (SpeechRecognition) — live transcription with interim results"],
    ["Voice output", "Web Speech API (SpeechSynthesis) — customizable voice + rate + pitch"],
    ["AI brain", "Anthropic Claude API (claude-sonnet-4-5) with native tool use + prompt caching"],
  ],
  [160, CONTENT_W - 160]
);

h2("Integrations");
table(
  ["Layer", "Technology"],
  [
    ["Knowledge base (read)", "Google Sheets API v4 via service-account authentication"],
    ["Lead pipeline (write)", "Google Sheets API v4 (append rows to a Leads tab)"],
    ["WhatsApp channel", "Meta Graph API v22.0 (WhatsApp Cloud API) — webhook receive + send"],
    ["Per-user conversation", "In-memory store (production-ready upgrade path: Redis / PostgreSQL)"],
  ],
  [160, CONTENT_W - 160]
);

h2("Design system");
bullet("Brand palette", "Dark #080c0e · Emerald #10b981 · Gold #d4af37");
bullet("Avatar palette", "Biometric cyan #3ad5ff with pure-white iris cores (additive blending → glows like a screen)");
bullet("Typography", "Geist Sans + Geist Mono (Vercel typeface)");
bullet("Aesthetic", "Biometric scan portrait — point cloud + wireframe + glowing camera-reticle eyes");

doc.addPage();

// ---- Architecture ----
h1("Architecture");

const archDiagram = `┌─────────────────────────────────────────────────────────────────┐
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
└────────────────┘                  └─────────────────────┘`;
monoBlock(archDiagram);

body(
  "The shared brain pattern means: a change to Neuro's personality, knowledge, or behavior automatically propagates to every channel at once. Update the Google Sheet → web visitors and WhatsApp users instantly hear the new prices."
);

// ---- Build status ----
h1("Current build status");
h2("Phases shipped (production-quality)");
const shipped = [
  "Fullscreen shell + reactive neural-particle background",
  "Biometric-scan 3D face (real point-cloud topology + wireframe + reticle eyes)",
  "Real-time webcam face tracking via MediaPipe (no video stored)",
  "Sleep / wake on idle + detection + touch",
  "Touch reaction (positive flash + iris pulse)",
  "Voice loop (mic → Claude → speaker) with live captions",
  "Action markers (open URL, capture lead, show product) + brand white-labelling",
  "Google Sheets knowledge base with Anthropic native tool-use",
  "Lead pipeline → live Google Sheet rows in real time",
  "WhatsApp Cloud API connector (Meta integration)",
];
for (let i = 0; i < shipped.length; i++) numberedItem(i + 1, shipped[i]);

doc.moveDown(0.5);
h2("On the roadmap");
const roadmap = [
  'Wake-word detection ("Hey Neuro") via Picovoice Porcupine',
  "Persistent cross-session memory (returning users greeted by name)",
  "Branded TTS voice via ElevenLabs (replacing browser default)",
  "Refined head topology using MediaPipe canonical face mesh",
  "Multi-language support — Urdu, Sindhi, Punjabi, Arabic",
  "Direct CRM hooks (HubSpot, Salesforce) alongside the Sheets pipeline",
];
for (const r of roadmap) bullet("", r);

doc.addPage();

// ---- About ----
h1("About NeuroGrid Labs");
doc.font("Helvetica").fontSize(11).fillColor(DARK);
doc.text("NeuroGrid Labs is a Karachi-based deep-tech company founded ", { continued: true });
doc.font("Helvetica-Bold").text("April 5, 2026", { continued: true });
doc.font("Helvetica").text(" by ", { continued: true });
doc.font("Helvetica-Bold").fillColor(EMERALD).text("Sheikh Shumyle Shafiq", { continued: true });
doc
  .font("Helvetica")
  .fillColor(DARK)
  .text(
    " — INFJ visionary, BS Computer Science (Karachi University), British Council APTIS English fluent, EC-Council Cybersecurity certified."
  );
doc.moveDown(0.5);
body(
  "The company builds across six verticals — EdTech, Healthcare, Mobility, Civic Tech, Security, and AI Agents — with 33+ products in active development or live deployment."
);

h2("Live deployments");
// SchoolOS
doc.font("Helvetica").fontSize(11).fillColor(DARK).text("• ", { continued: true });
doc.font("Helvetica-Bold").text("SchoolOS", { continued: true });
doc.font("Helvetica").text(" — Complete student management system — ", { continued: true });
link("schoolportal.live", "https://schoolportal.live");
// NeuroGrid Clinic
doc.font("Helvetica").fontSize(11).fillColor(DARK).text("• ", { continued: true });
doc.font("Helvetica-Bold").text("NeuroGrid Clinic", { continued: true });
doc.font("Helvetica").text(" — Healthcare practice management — ", { continued: true });
link("karachitraumainstitute.netlify.app", "https://karachitraumainstitute.netlify.app");
// CivicPulse
doc.font("Helvetica").fontSize(11).fillColor(DARK).text("• ", { continued: true });
doc.font("Helvetica-Bold").text("CivicPulse", { continued: true });
doc.font("Helvetica").text(" — Public-issue reporting and accountability — ", { continued: true });
link("civicpulsepk.netlify.app", "https://civicpulsepk.netlify.app");

// Contact
h1("Contact");
doc.font("Helvetica-Bold").fontSize(14).fillColor(EMERALD).text("Sheikh Shumyle Shafiq");
doc
  .font("Helvetica-Oblique")
  .fontSize(11)
  .fillColor(SOFT)
  .text("Founder, NeuroGrid Labs");
doc.moveDown(0.5);
doc.font("Helvetica-Bold").fontSize(11).fillColor(DARK).text("Email: ", { continued: true });
link("shumyle@neurogridlabs.tech", "mailto:shumyle@neurogridlabs.tech");
doc.font("Helvetica-Bold").fillColor(DARK).text("Phone: ", { continued: true });
doc.font("Helvetica").fillColor(DARK).text("+92 314 2867152");
doc.font("Helvetica-Bold").fillColor(DARK).text("Web: ", { continued: true });
link("neurogridlabs.tech", "https://neurogridlabs.tech");

doc.moveDown(2);
doc
  .font("Helvetica-BoldOblique")
  .fontSize(14)
  .fillColor(GOLD)
  .text("Bringing ideas into life.", { align: "center" });

doc.end();
console.log(`Writing ${outPath}…`);
