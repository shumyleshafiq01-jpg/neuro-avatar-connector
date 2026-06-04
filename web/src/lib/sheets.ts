/**
 * Google Sheets knowledge base.
 *
 * Neuro reads product info from a sheet you maintain — no redeploy needed
 * to update prices, descriptions, or add products. Whoever owns the sheet
 * (you, Natasha, or a teammate) controls Neuro's knowledge.
 *
 * Expected sheet structure (tab named "Products" by default):
 *   | Name              | Category   | Price (PKR/mo) | Description                | URL                    |
 *   | NeuroGrid Learn   | EdTech     | 50000          | Google Classroom alt.       | https://...            |
 *   | SchoolOS          | EdTech     | 35000          | Student management system   | https://schoolportal.live |
 *   | ...                                                                                                       |
 *
 * Auth: a Google Cloud service account. The JSON key file lives at
 * `web/credentials/google-service-account.json` (gitignored). Share your
 * sheet with the service account's email (read-only is fine).
 */

import { google, type sheets_v4 } from "googleapis";
import { JWT } from "google-auth-library";
import { readFileSync, existsSync } from "fs";
import path from "path";

const SHEET_TAB = process.env.GOOGLE_SHEETS_TAB || "Products";
const SHEET_RANGE = `${SHEET_TAB}!A:E`;
const LEADS_TAB = process.env.GOOGLE_LEADS_TAB || "Leads";
const LEADS_RANGE = `${LEADS_TAB}!A:F`; // Timestamp | Name | Email | Phone | Interest | Source

type ProductRow = {
  name: string;
  category: string;
  price: string;
  description: string;
  url: string;
};

let cachedSheets: sheets_v4.Sheets | null = null;
let cachedFailReason: string | null = null;

function getSheetsClient(): sheets_v4.Sheets | null {
  if (cachedSheets) return cachedSheets;
  if (cachedFailReason) return null;

  // Two sources for the service-account JSON, in priority order:
  //  1) GOOGLE_SERVICE_ACCOUNT_JSON env var (production — Netlify, Vercel)
  //  2) credentials/google-service-account.json file (local dev)
  // Either works; the env var is preferred for serverless deploys because
  // the credentials/ folder is gitignored and never reaches production.
  let credJson: string | null = null;
  const envJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (envJson && envJson.trim().length > 0) {
    credJson = envJson;
  } else if (process.env.NODE_ENV !== "production") {
    // File-system fallback ONLY in development — Netlify / Vercel never
    // see this code path. This keeps Next's file tracer from pulling the
    // whole project into the serverless function bundle.
    const credPath =
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ||
      path.join(process.cwd(), "credentials", "google-service-account.json");
    if (existsSync(credPath)) {
      credJson = readFileSync(credPath, "utf8");
    } else {
      cachedFailReason =
        "Service account not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON env var (production) " +
        `or place the JSON at ${credPath} (local dev).`;
      return null;
    }
  } else {
    cachedFailReason =
      "GOOGLE_SERVICE_ACCOUNT_JSON env var is not set. Add it in Netlify → Site settings → Environment variables.";
    return null;
  }

  try {
    const cred = JSON.parse(credJson) as {
      client_email: string;
      private_key: string;
    };
    // Serverless platforms often escape \n in env vars — restore them.
    const privateKey = cred.private_key.replace(/\\n/g, "\n");
    const auth = new JWT({
      email: cred.client_email,
      key: privateKey,
      // Read + write — needed to append leads to the Leads tab. Read-only
      // wasn't enough once we wanted bi-directional sheet bridging.
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    cachedSheets = google.sheets({ version: "v4", auth });
    return cachedSheets;
  } catch (e) {
    cachedFailReason = e instanceof Error ? e.message : String(e);
    return null;
  }
}

export type LookupResult =
  | { ok: true; matches: ProductRow[] }
  | { ok: false; reason: string };

/**
 * Search the Products sheet by query (matches name, description, or
 * category — case-insensitive). Returns up to 5 matches.
 */
export async function lookupProductInfo(query: string): Promise<LookupResult> {
  const sheets = getSheetsClient();
  if (!sheets) {
    return {
      ok: false,
      reason:
        cachedFailReason ?? "Sheets client unavailable (credentials missing).",
    };
  }
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  if (!sheetId) {
    return { ok: false, reason: "GOOGLE_SHEETS_ID env var is not set." };
  }

  let rows: string[][] = [];
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: SHEET_RANGE,
    });
    rows = (res.data.values ?? []) as string[][];
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: `Sheets API error: ${msg}` };
  }

  if (rows.length < 2) {
    return { ok: true, matches: [] };
  }

  const [, ...data] = rows; // skip header row
  const q = query.trim().toLowerCase();
  const matches: ProductRow[] = data
    .filter((row) => {
      const haystack = [row[0], row[1], row[3]]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, 5)
    .map((row) => ({
      name: row[0] ?? "",
      category: row[1] ?? "",
      price: row[2] ?? "",
      description: row[3] ?? "",
      url: row[4] ?? "",
    }));

  return { ok: true, matches };
}

/** True if credentials + sheet ID are configured. UI uses this to decide
 *  whether to surface tool-use as available. */
export function isSheetsConfigured(): boolean {
  return getSheetsClient() !== null && !!process.env.GOOGLE_SHEETS_ID;
}

export type Lead = {
  name?: string;
  email?: string;
  phone?: string;
  interest?: string;
  source?: string;
};

export type AppendResult =
  | { ok: true; appendedRange: string }
  | { ok: false; reason: string };

/**
 * Append a lead row to the Leads tab. Schema:
 *   A Timestamp | B Name | C Email | D Phone | E Interest | F Source
 *
 * Fire-and-forget from the caller's perspective — failure logs server-side
 * but doesn't surface to the user (Neuro's reply still goes through).
 */
export async function appendLead(lead: Lead): Promise<AppendResult> {
  const sheets = getSheetsClient();
  if (!sheets) {
    return { ok: false, reason: cachedFailReason ?? "Sheets unavailable" };
  }
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  if (!sheetId) {
    return { ok: false, reason: "GOOGLE_SHEETS_ID not set" };
  }

  // ISO 8601 in PKT (Karachi) for human-readable timestamps in the sheet
  const timestamp = new Date().toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    hour12: false,
  });

  const row = [
    timestamp,
    lead.name ?? "",
    lead.email ?? "",
    lead.phone ?? "",
    lead.interest ?? "",
    lead.source ?? "neuro-avatar",
  ];

  try {
    const res = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: LEADS_RANGE,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
    return { ok: true, appendedRange: res.data.updates?.updatedRange ?? "" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: `Sheets append failed: ${msg}` };
  }
}
