import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const csvPath = resolve(
  "/Users/Home/Downloads/LA28 SCHEDULE - Schedule By Event.csv",
);
const sessionsPath = resolve(
  import.meta.dirname,
  "../src/data/sessions.json",
);

interface CsvRow {
  sessionCode: string;
  sport: string;
  venue: string;
  zone: string;
  date: string;
  gamesDay: string;
  sessionType: string;
  event: string;
  startTime: string;
  endTime: string;
  isInLA: string;
  isWomens: string;
}

interface Session {
  id: string;
  sport: string;
  venue: string;
  zone: string;
  date: string;
  dk: string;
  time: string;
  rt: string;
  desc: string;
}

// ---------- Parse CSV (handles quoted fields with commas) ----------
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsv(raw: string): CsvRow[] {
  const lines = raw.split("\n").filter((l) => l.trim());
  lines.shift(); // drop header
  return lines.map((line) => {
    const f = parseCsvLine(line);
    return {
      sessionCode: f[0],
      sport: f[1],
      venue: f[2],
      zone: f[3],
      date: f[4],
      gamesDay: f[5],
      sessionType: f[6],
      event: f[7],
      startTime: f[8],
      endTime: f[9],
      isInLA: f[10],
      isWomens: f[11],
    };
  });
}

// ---------- Normalize helpers ----------
function normalizeDate(csvDate: string): string {
  // CSV: "Sunday, July 16" → "Sun Jul 16"
  const months: Record<string, string> = {
    January: "Jan", February: "Feb", March: "Mar", April: "Apr",
    May: "May", June: "Jun", July: "Jul", August: "Aug",
    September: "Sep", October: "Oct", November: "Nov", December: "Dec",
  };
  const days: Record<string, string> = {
    Sunday: "Sun", Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
    Thursday: "Thu", Friday: "Fri", Saturday: "Sat",
  };

  const m = csvDate.match(/^(\w+),\s+(\w+)\s+(\d+)$/);
  if (!m) return csvDate;
  const [, dayName, monthName, dayNum] = m;
  return `${days[dayName] ?? dayName} ${months[monthName] ?? monthName} ${dayNum}`;
}

function to12h(t24: string): string {
  const [hStr, mStr] = t24.split(":");
  let h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${suffix}`;
}

function normalizeSessionType(csvType: string): string {
  const lower = csvType.toLowerCase();
  if (lower.includes("quarter")) return "QF";
  if (lower.includes("semi")) return "Semi";
  if (lower.includes("bronze")) return "Bronze";
  if (lower.includes("ceremony")) return "Ceremony";
  if (lower.includes("preliminary") || lower.includes("pool") || lower.includes("group") || lower.includes("round") || lower.includes("qualification") || lower.includes("ranking") || lower.includes("repechage")) return "Prelim";
  if (lower.includes("final") || lower.includes("gold")) return "Final";
  return csvType;
}

// ---------- Group CSV rows by session code ----------
interface CsvSession {
  sessionCode: string;
  sport: string;
  venue: string;
  zone: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionTypes: string[];
  events: string[];
}

function groupBySession(rows: CsvRow[]): Map<string, CsvSession> {
  const map = new Map<string, CsvSession>();
  for (const r of rows) {
    const existing = map.get(r.sessionCode);
    if (existing) {
      if (!existing.events.includes(r.event)) existing.events.push(r.event);
      if (!existing.sessionTypes.includes(r.sessionType))
        existing.sessionTypes.push(r.sessionType);
    } else {
      map.set(r.sessionCode, {
        sessionCode: r.sessionCode,
        sport: r.sport,
        venue: r.venue,
        zone: r.zone,
        date: r.date,
        startTime: r.startTime,
        endTime: r.endTime,
        sessionTypes: [r.sessionType],
        events: [r.event],
      });
    }
  }
  return map;
}

// ---------- Main ----------
const csvRaw = readFileSync(csvPath, "utf-8");
const csvRows = parseCsv(csvRaw);
const csvSessions = groupBySession(csvRows);

const sessions: Session[] = JSON.parse(readFileSync(sessionsPath, "utf-8"));
const sessionMap = new Map(sessions.map((s) => [s.id, s]));

console.log(`\n${"=".repeat(70)}`);
console.log(`  SCHEDULE VALIDATION REPORT`);
console.log(`${"=".repeat(70)}`);
console.log(`  CSV rows: ${csvRows.length}`);
console.log(`  CSV unique sessions: ${csvSessions.size}`);
console.log(`  App sessions (sessions.json): ${sessions.length}`);
console.log(`${"=".repeat(70)}\n`);

// 1. Session codes only in CSV
const onlyInCsv: string[] = [];
for (const code of csvSessions.keys()) {
  if (!sessionMap.has(code)) onlyInCsv.push(code);
}

// 2. Session codes only in app
const onlyInApp: string[] = [];
for (const id of sessionMap.keys()) {
  if (!csvSessions.has(id)) onlyInApp.push(id);
}

console.log(`--- MISSING FROM APP (in CSV but not sessions.json): ${onlyInCsv.length} ---`);
if (onlyInCsv.length) {
  for (const code of onlyInCsv.sort()) {
    const cs = csvSessions.get(code)!;
    console.log(`  ${code}  ${cs.sport} @ ${cs.venue}, ${cs.date} ${cs.startTime}–${cs.endTime}`);
  }
} else {
  console.log("  (none)");
}

console.log(`\n--- IN APP BUT NOT IN CSV: ${onlyInApp.length} ---`);
if (onlyInApp.length) {
  for (const id of onlyInApp.sort()) {
    const s = sessionMap.get(id)!;
    console.log(`  ${id}  ${s.sport} @ ${s.venue}, ${s.date} ${s.time}`);
  }
} else {
  console.log("  (none)");
}

// 3. Field-level mismatches for shared sessions
interface Mismatch {
  id: string;
  field: string;
  csv: string;
  app: string;
}

const mismatches: Mismatch[] = [];

for (const [code, cs] of csvSessions) {
  const app = sessionMap.get(code);
  if (!app) continue;

  // Sport
  if (cs.sport.toLowerCase() !== app.sport.toLowerCase()) {
    mismatches.push({ id: code, field: "sport", csv: cs.sport, app: app.sport });
  }

  // Venue
  if (cs.venue.toLowerCase() !== app.venue.toLowerCase()) {
    mismatches.push({ id: code, field: "venue", csv: cs.venue, app: app.venue });
  }

  // Zone
  if (cs.zone.toLowerCase() !== app.zone.toLowerCase()) {
    mismatches.push({ id: code, field: "zone", csv: cs.zone, app: app.zone });
  }

  // Date
  const csvDateNorm = normalizeDate(cs.date);
  if (csvDateNorm !== app.date) {
    mismatches.push({ id: code, field: "date", csv: `${cs.date} → ${csvDateNorm}`, app: app.date });
  }

  // Time
  const csvTime = `${to12h(cs.startTime)}–${to12h(cs.endTime)}`;
  const appTimeNorm = app.time.replace(/\u2013/g, "–");
  if (csvTime !== appTimeNorm) {
    mismatches.push({ id: code, field: "time", csv: csvTime, app: appTimeNorm });
  }

  // Session type / round type
  const csvRt = normalizeSessionType(cs.sessionTypes[0]);
  if (csvRt !== app.rt && !(app.rt === "N/A" && csvRt === cs.sessionTypes[0])) {
    mismatches.push({ id: code, field: "round type", csv: `${cs.sessionTypes[0]} → ${csvRt}`, app: app.rt });
  }
}

// Group mismatches by field
const byField = new Map<string, Mismatch[]>();
for (const m of mismatches) {
  const arr = byField.get(m.field) ?? [];
  arr.push(m);
  byField.set(m.field, arr);
}

console.log(`\n--- FIELD MISMATCHES (${mismatches.length} total across ${byField.size} fields) ---`);
for (const [field, items] of [...byField.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n  [${field.toUpperCase()}] — ${items.length} mismatches:`);
  for (const m of items.slice(0, 30)) {
    console.log(`    ${m.id}: CSV="${m.csv}" vs APP="${m.app}"`);
  }
  if (items.length > 30) {
    console.log(`    ... and ${items.length - 30} more`);
  }
}

// 4. Summary of unique sports in each
const csvSports = new Set<string>();
const appSports = new Set<string>();
for (const cs of csvSessions.values()) csvSports.add(cs.sport);
for (const s of sessions) appSports.add(s.sport);

const sportsOnlyInCsv = [...csvSports].filter((s) => !appSports.has(s)).sort();
const sportsOnlyInApp = [...appSports].filter((s) => !csvSports.has(s)).sort();

console.log(`\n--- SPORT NAME DIFFERENCES ---`);
console.log(`  CSV unique sports: ${csvSports.size}`);
console.log(`  App unique sports: ${appSports.size}`);
if (sportsOnlyInCsv.length) {
  console.log(`  Sports only in CSV: ${sportsOnlyInCsv.join(", ")}`);
}
if (sportsOnlyInApp.length) {
  console.log(`  Sports only in App: ${sportsOnlyInApp.join(", ")}`);
}

// 5. Venue differences
const csvVenues = new Set<string>();
const appVenues = new Set<string>();
for (const cs of csvSessions.values()) csvVenues.add(cs.venue);
for (const s of sessions) appVenues.add(s.venue);

const venuesOnlyInCsv = [...csvVenues].filter((v) => !appVenues.has(v)).sort();
const venuesOnlyInApp = [...appVenues].filter((v) => !csvVenues.has(v)).sort();

console.log(`\n--- VENUE NAME DIFFERENCES ---`);
console.log(`  CSV unique venues: ${csvVenues.size}`);
console.log(`  App unique venues: ${appVenues.size}`);
if (venuesOnlyInCsv.length) {
  console.log(`  Venues only in CSV: ${venuesOnlyInCsv.join(", ")}`);
}
if (venuesOnlyInApp.length) {
  console.log(`  Venues only in App: ${venuesOnlyInApp.join(", ")}`);
}

// 6. Zone differences
const csvZones = new Set<string>();
const appZones = new Set<string>();
for (const cs of csvSessions.values()) csvZones.add(cs.zone);
for (const s of sessions) appZones.add(s.zone);

const zonesOnlyInCsv = [...csvZones].filter((z) => !appZones.has(z)).sort();
const zonesOnlyInApp = [...appZones].filter((z) => !csvZones.has(z)).sort();

console.log(`\n--- ZONE DIFFERENCES ---`);
if (zonesOnlyInCsv.length) {
  console.log(`  Zones only in CSV: ${zonesOnlyInCsv.join(", ")}`);
}
if (zonesOnlyInApp.length) {
  console.log(`  Zones only in App: ${zonesOnlyInApp.join(", ")}`);
}

console.log(`\n${"=".repeat(70)}`);
console.log(`  END OF REPORT`);
console.log(`${"=".repeat(70)}\n`);
