/**
 * Build Neuro_Avatar_Connector.docx from the curated markdown source.
 *
 * Brand palette: Dark #080c0e (body) · Emerald #10b981 (H1/H2) · Gold #d4af37 (accents)
 * Page: A4 portrait, 1" margins.
 */

import fs from "node:fs";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  LevelFormat,
  BorderStyle,
  WidthType,
  ShadingType,
  ExternalHyperlink,
  PageBreak,
} from "docx";

const EMERALD = "10b981";
const GOLD = "d4af37";
const DARK = "080c0e";
const SOFT = "5a5a5a";

// A4 in DXA (1440 = 1 inch); content width with 1" margins = 11906 - 2880 = 9026
const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = 1440;
const CONTENT_W = PAGE_W - MARGIN * 2;

const tdaBorder = (color = "CCCCCC") => ({
  style: BorderStyle.SINGLE,
  size: 1,
  color,
});
const tableBorders = {
  top: tdaBorder(),
  bottom: tdaBorder(),
  left: tdaBorder(),
  right: tdaBorder(),
  insideHorizontal: tdaBorder(),
  insideVertical: tdaBorder(),
};
const cellBorders = {
  top: tdaBorder(),
  bottom: tdaBorder(),
  left: tdaBorder(),
  right: tdaBorder(),
};

function P(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    ...opts.paraOpts,
    children: [
      new TextRun({
        text,
        color: opts.color ?? DARK,
        bold: opts.bold ?? false,
        italics: opts.italics ?? false,
        size: opts.size ?? 22, // half-points, 22 = 11pt
        font: opts.font,
      }),
    ],
  });
}

function H(text, level, color = EMERALD) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, color, bold: true })],
  });
}

function MonoBlock(text) {
  const lines = text.split("\n");
  return lines.map(
    (line) =>
      new Paragraph({
        spacing: { after: 0 },
        shading: { type: ShadingType.CLEAR, fill: "F4F4F4" },
        children: [
          new TextRun({
            text: line.replace(/ /g, " "), // preserve leading spaces
            font: "Consolas",
            size: 18,
            color: "333333",
          }),
        ],
      })
  );
}

function Bullet(text, opts = {}) {
  const runs = Array.isArray(text)
    ? text
    : [new TextRun({ text, size: 22, color: DARK, ...opts.runOpts })];
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 60 },
    children: runs,
  });
}

function Cell(content, opts = {}) {
  const children = Array.isArray(content)
    ? content
    : [new Paragraph({ children: [new TextRun({ text: content, size: 20, color: DARK })] })];
  return new TableCell({
    borders: cellBorders,
    width: { size: opts.width, type: WidthType.DXA },
    shading: opts.shading
      ? { type: ShadingType.CLEAR, fill: opts.shading }
      : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children,
  });
}

function MakeTable(headers, rows, columnWidths) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) =>
          Cell(
            [
              new Paragraph({
                children: [
                  new TextRun({
                    text: h,
                    bold: true,
                    size: 20,
                    color: "FFFFFF",
                  }),
                ],
              }),
            ],
            { width: columnWidths[i], shading: EMERALD }
          )
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((c, i) => Cell(c, { width: columnWidths[i] })),
          })
      ),
    ],
  });
}

function Link(label, href) {
  return new ExternalHyperlink({
    link: href,
    children: [
      new TextRun({
        text: label,
        color: "0563C1",
        underline: {},
        size: 22,
      }),
    ],
  });
}

// ---- Document content ----
const content = [];

// Title page
content.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 2400, after: 240 },
    children: [
      new TextRun({
        text: "NEURO",
        bold: true,
        size: 96, // 48pt
        color: EMERALD,
        font: "Arial",
      }),
    ],
  })
);
content.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: "The Living Digital Mascot",
        size: 36, // 18pt
        color: DARK,
        font: "Arial",
      }),
    ],
  })
);
content.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 480 },
    children: [
      new TextRun({
        text: "A product by NeuroGrid Labs",
        size: 24,
        color: SOFT,
        italics: true,
      }),
    ],
  })
);
content.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [
      new TextRun({
        text: "Bringing ideas into life.",
        size: 22,
        color: GOLD,
        italics: true,
        bold: true,
      }),
    ],
  })
);
content.push(new Paragraph({ children: [new PageBreak()] }));

// What is Neuro
content.push(H("What is Neuro?", HeadingLevel.HEADING_1));
content.push(
  P(
    "Neuro is a web-based AI avatar — a glowing biometric-scan face that sees you, listens, thinks, and speaks back. It runs in any modern web browser, no install required. The same Neuro can be embedded on a website, on a tablet at a reception desk, in a kiosk, or behind a WhatsApp number."
  )
);
content.push(
  P(
    "Think of it as a receptionist, a salesperson, a teaching assistant, and a 24/7 brand ambassador — combined into a single deployable product. One engine. Infinite faces. Fully white-labelled per client."
  )
);

// What it does
content.push(H("What it does", HeadingLevel.HEADING_1));
content.push(
  MakeTable(
    ["Capability", "What the visitor experiences"],
    [
      ["Visual presence", "A 3D cyan biometric-scan face fills the screen. It blinks, breathes, and tracks the person through the webcam — without ever showing or recording the visitor's image."],
      ["Sleeps & wakes", "Eyes close when no one is in front of the camera. They open the moment a face is detected, the screen is touched, or someone speaks."],
      ["Eyes that follow", "Gold camera-style focus reticles track the visitor's position in real time. Head turns subtly to face them."],
      ["Listens & speaks", "Voice in (microphone), voice out (speakers). Hands-free conversation. Live captions appear below for accessibility."],
      ["Touch-reactive", "Tapping the avatar's face triggers a positive flash and ripple — it \"feels\" the contact."],
      ["Powered by Claude", "Anthropic's most capable language model interprets the conversation and decides what to say, when to look up information, and how to capture lead details."],
      ["Live knowledge base", "Reads pricing, product info, and FAQ data from a Google Sheet the client controls. Edit the sheet → Neuro speaks the new info on the next question. No code, no redeploy."],
      ["Lead capture pipeline", "When a visitor shares their name, email, phone, or interest, Neuro writes a row to the Leads tab in the same sheet, in real time. The team sees leads land instantly."],
      ["Multi-channel brain", "The same engine powers the web avatar AND a WhatsApp Business number. A customer asks on WhatsApp → Neuro replies with the same personality, same knowledge, same lead capture."],
      ["White-labelled", "One deployment, infinite brands. A URL like ?brand=falconhouse switches greeting, personality, brand colors, and voice — perfect for schools, clinics, retail chains, hotels."],
    ],
    [2600, CONTENT_W - 2600]
  )
);

// Use cases
content.push(H("Where it can be deployed", HeadingLevel.HEADING_1));
const useCases = [
  ["Schools", "Front-desk attendant that answers parent questions about admissions, fees, and timings."],
  ["Clinics & hospitals", "Patient triage and appointment booking, in English or Urdu."],
  ["Retail & e-commerce", "Brand mascot on the website plus WhatsApp; turns browsers into qualified leads."],
  ["Events & expos", "Interactive booth attendant that captures visitor info while pitching products."],
  ["Government / civic", "Public-facing information point for citizens, in multiple languages."],
  ["Hotels & hospitality", "24/7 concierge that handles bookings, restaurant info, and check-in queries."],
  ["Corporate reception", "Visitor greeting + intent routing, freeing up human receptionists for complex requests."],
];
for (const [tag, body] of useCases) {
  content.push(
    Bullet([
      new TextRun({ text: tag + " — ", bold: true, color: EMERALD, size: 22 }),
      new TextRun({ text: body, color: DARK, size: 22 }),
    ])
  );
}

content.push(new Paragraph({ children: [new PageBreak()] }));

// Tech stack
content.push(H("Technology stack", HeadingLevel.HEADING_1));
content.push(H("Application layer", HeadingLevel.HEADING_2, GOLD));
content.push(
  MakeTable(
    ["Layer", "Technology"],
    [
      ["Frontend framework", "Next.js 16 (App Router) + React 19 + TypeScript"],
      ["Styling", "Tailwind CSS 4"],
      ["3D rendering", "Three.js + React Three Fiber + @react-three/drei"],
      ["Animation", "Custom JS animation loops with smooth interpolation"],
      ["Hosting", "Vercel (serverless) — or any Node-compatible host"],
    ],
    [3200, CONTENT_W - 3200]
  )
);

content.push(H("AI & vision", HeadingLevel.HEADING_2, GOLD));
content.push(
  MakeTable(
    ["Layer", "Technology"],
    [
      ["Face tracking", "MediaPipe FaceLandmarker (Google) — 468 facial landmarks, runs in-browser"],
      ["Voice input", "Web Speech API (SpeechRecognition) — live transcription with interim results"],
      ["Voice output", "Web Speech API (SpeechSynthesis) — customizable voice + rate + pitch"],
      ["AI brain", "Anthropic Claude API (claude-sonnet-4-5) with native tool use + prompt caching"],
    ],
    [3200, CONTENT_W - 3200]
  )
);

content.push(H("Integrations", HeadingLevel.HEADING_2, GOLD));
content.push(
  MakeTable(
    ["Layer", "Technology"],
    [
      ["Knowledge base (read)", "Google Sheets API v4 via service-account authentication"],
      ["Lead pipeline (write)", "Google Sheets API v4 (append rows to a Leads tab)"],
      ["WhatsApp channel", "Meta Graph API v22.0 (WhatsApp Cloud API) — webhook receive + send"],
      ["Per-user conversation", "In-memory store (production-ready upgrade path: Redis / PostgreSQL)"],
    ],
    [3200, CONTENT_W - 3200]
  )
);

content.push(H("Design system", HeadingLevel.HEADING_2, GOLD));
content.push(
  Bullet([
    new TextRun({ text: "Brand palette: ", bold: true, color: DARK, size: 22 }),
    new TextRun({ text: "Dark #080c0e · Emerald #10b981 · Gold #d4af37", color: DARK, size: 22 }),
  ])
);
content.push(
  Bullet([
    new TextRun({ text: "Avatar palette: ", bold: true, color: DARK, size: 22 }),
    new TextRun({ text: "Biometric cyan #3ad5ff with pure-white iris cores (additive blending → glows like a screen)", color: DARK, size: 22 }),
  ])
);
content.push(
  Bullet([
    new TextRun({ text: "Typography: ", bold: true, color: DARK, size: 22 }),
    new TextRun({ text: "Geist Sans + Geist Mono (Vercel typeface)", color: DARK, size: 22 }),
  ])
);
content.push(
  Bullet([
    new TextRun({ text: "Aesthetic: ", bold: true, color: DARK, size: 22 }),
    new TextRun({ text: "Biometric scan portrait — point cloud + wireframe + glowing camera-reticle eyes", color: DARK, size: 22 }),
  ])
);

content.push(new Paragraph({ children: [new PageBreak()] }));

// Architecture
content.push(H("Architecture", HeadingLevel.HEADING_1));
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
content.push(...MonoBlock(archDiagram));
content.push(P(""));
content.push(
  P(
    "The shared brain pattern means: a change to Neuro's personality, knowledge, or behavior automatically propagates to every channel at once. Update the Google Sheet → web visitors and WhatsApp users instantly hear the new prices."
  )
);

// Current status
content.push(H("Current build status", HeadingLevel.HEADING_1));
content.push(H("Phases shipped (production-quality)", HeadingLevel.HEADING_2, GOLD));
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
for (const s of shipped) {
  content.push(
    new Paragraph({
      numbering: { reference: "numbers", level: 0 },
      spacing: { after: 60 },
      children: [new TextRun({ text: s, color: DARK, size: 22 })],
    })
  );
}

content.push(H("On the roadmap", HeadingLevel.HEADING_2, GOLD));
const roadmap = [
  "Wake-word detection (\"Hey Neuro\") via Picovoice Porcupine",
  "Persistent cross-session memory (returning users greeted by name)",
  "Branded TTS voice via ElevenLabs (replacing browser default)",
  "Refined head topology using MediaPipe canonical face mesh",
  "Multi-language support — Urdu, Sindhi, Punjabi, Arabic",
  "Direct CRM hooks (HubSpot, Salesforce) alongside the Sheets pipeline",
];
for (const r of roadmap) {
  content.push(Bullet(r));
}

content.push(new Paragraph({ children: [new PageBreak()] }));

// About NeuroGrid
content.push(H("About NeuroGrid Labs", HeadingLevel.HEADING_1));
content.push(
  new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: "NeuroGrid Labs is a Karachi-based deep-tech company founded ",
        color: DARK,
        size: 22,
      }),
      new TextRun({ text: "April 5, 2026", bold: true, color: DARK, size: 22 }),
      new TextRun({ text: " by ", color: DARK, size: 22 }),
      new TextRun({
        text: "Sheikh Shumyle Shafiq",
        bold: true,
        color: EMERALD,
        size: 22,
      }),
      new TextRun({
        text: " — INFJ visionary, BS Computer Science (Karachi University), British Council APTIS English fluent, EC-Council Cybersecurity certified.",
        color: DARK,
        size: 22,
      }),
    ],
  })
);
content.push(
  P(
    "The company builds across six verticals — EdTech, Healthcare, Mobility, Civic Tech, Security, and AI Agents — with 33+ products in active development or live deployment."
  )
);

content.push(H("Live deployments", HeadingLevel.HEADING_2, GOLD));
content.push(
  Bullet([
    new TextRun({ text: "SchoolOS ", bold: true, color: DARK, size: 22 }),
    new TextRun({ text: "— Complete student management system → ", color: DARK, size: 22 }),
    Link("schoolportal.live", "https://schoolportal.live"),
  ])
);
content.push(
  Bullet([
    new TextRun({ text: "NeuroGrid Clinic ", bold: true, color: DARK, size: 22 }),
    new TextRun({ text: "— Healthcare practice management → ", color: DARK, size: 22 }),
    Link("karachitraumainstitute.netlify.app", "https://karachitraumainstitute.netlify.app"),
  ])
);
content.push(
  Bullet([
    new TextRun({ text: "CivicPulse ", bold: true, color: DARK, size: 22 }),
    new TextRun({ text: "— Public-issue reporting and accountability → ", color: DARK, size: 22 }),
    Link("civicpulsepk.netlify.app", "https://civicpulsepk.netlify.app"),
  ])
);

// Contact
content.push(H("Contact", HeadingLevel.HEADING_1));
content.push(
  new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({
        text: "Sheikh Shumyle Shafiq",
        bold: true,
        color: EMERALD,
        size: 26,
      }),
    ],
  })
);
content.push(
  new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text: "Founder, NeuroGrid Labs", italics: true, color: SOFT, size: 22 })],
  })
);
content.push(
  new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: "Email: ", bold: true, color: DARK, size: 22 }),
      Link("shumyle@neurogridlabs.tech", "mailto:shumyle@neurogridlabs.tech"),
    ],
  })
);
content.push(
  new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: "Phone: ", bold: true, color: DARK, size: 22 }),
      new TextRun({ text: "+92 314 2867152", color: DARK, size: 22 }),
    ],
  })
);
content.push(
  new Paragraph({
    spacing: { after: 240 },
    children: [
      new TextRun({ text: "Web: ", bold: true, color: DARK, size: 22 }),
      Link("neurogridlabs.tech", "https://neurogridlabs.tech"),
    ],
  })
);
content.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 360 },
    children: [
      new TextRun({
        text: "Bringing ideas into life.",
        italics: true,
        bold: true,
        size: 28,
        color: GOLD,
      }),
    ],
  })
);

// ---- Build document ----
const doc = new Document({
  creator: "NeuroGrid Labs",
  title: "Neuro — The Living Digital Mascot",
  description: "Product one-pager for the Neuro Avatar Connector",
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: EMERALD },
        paragraph: {
          spacing: { before: 320, after: 160 },
          outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: EMERALD, space: 4 } },
        },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: GOLD },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: { indent: { left: 720, hanging: 360 } },
              run: { color: EMERALD },
            },
          },
        ],
      },
      {
        reference: "numbers",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      children: content,
    },
  ],
});

const outPath = "D:/Projects/virtual avatar connector/Neuro_Avatar_Connector.docx";
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log(`OK: ${outPath} (${buf.length} bytes)`);
});
