/**
 * /api/sheets-debug — diagnostics for the Sheets knowledge base.
 * Returns raw rows + tab names so we can see what's actually in the sheet
 * without exposing credentials.
 *
 * Gated to development only — returns 404 in production so this endpoint
 * doesn't leak sheet structure or service-account email to anyone hitting
 * the public URL.
 */

import { google, type sheets_v4 } from "googleapis";
import { JWT } from "google-auth-library";
import { readFileSync, existsSync } from "fs";
import path from "path";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }
  const credPath =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ||
    path.join(process.cwd(), "credentials", "google-service-account.json");
  const sheetId = process.env.GOOGLE_SHEETS_ID;

  if (!existsSync(credPath)) {
    return Response.json(
      { ok: false, reason: `Missing credentials at ${credPath}` },
      { status: 500 }
    );
  }
  if (!sheetId) {
    return Response.json(
      { ok: false, reason: "GOOGLE_SHEETS_ID env var not set" },
      { status: 500 }
    );
  }

  try {
    const cred = JSON.parse(readFileSync(credPath, "utf8")) as {
      client_email: string;
      private_key: string;
    };
    const auth = new JWT({
      email: cred.client_email,
      key: cred.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const sheets: sheets_v4.Sheets = google.sheets({ version: "v4", auth });

    // 1) Get the spreadsheet meta — list of tabs
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const tabNames =
      meta.data.sheets?.map((s) => s.properties?.title ?? "(unnamed)") ?? [];

    // 2) Try reading the first tab (whatever it is) — first 10 rows × 5 cols
    const firstTab = tabNames[0] ?? "Sheet1";
    let firstRows: string[][] = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${firstTab}!A1:E10`,
      });
      firstRows = (res.data.values ?? []) as string[][];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return Response.json({
        ok: false,
        tabNames,
        firstTab,
        readError: msg,
        serviceAccountEmail: cred.client_email,
      });
    }

    return Response.json({
      ok: true,
      sheetId,
      sheetTitle: meta.data.properties?.title,
      tabNames,
      firstTab,
      firstRows,
      rowCount: firstRows.length,
      serviceAccountEmail: cred.client_email,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, reason: msg }, { status: 500 });
  }
}
