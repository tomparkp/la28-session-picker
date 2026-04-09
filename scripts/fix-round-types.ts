import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const sessionsPath = resolve(import.meta.dirname, "../src/data/sessions.json");
const sessions = JSON.parse(readFileSync(sessionsPath, "utf-8"));
const sessionMap = new Map(sessions.map((s: any) => [s.id, s]));

interface Fix {
  id: string;
  from: string;
  to: string;
  reason: string;
}

const fixes: Fix[] = [
  // Single-event finals wrongly tagged as Prelim → Final
  { id: "ATH18", from: "Prelim", to: "Final", reason: "Half-Marathon Race Walk is a medal event" },
  { id: "ATH19", from: "Prelim", to: "Final", reason: "Women's Marathon is a medal event" },
  { id: "ATH20", from: "Prelim", to: "Final", reason: "Men's Marathon is a medal event" },
  { id: "CRD01", from: "Prelim", to: "Final", reason: "Individual Time Trial is a medal event" },
  { id: "CRD02", from: "Prelim", to: "Final", reason: "Women's Road Race is a medal event" },
  { id: "CRD03", from: "Prelim", to: "Final", reason: "Men's Road Race is a medal event" },
  { id: "GLF04", from: "Prelim", to: "Final", reason: "Golf Round 4 is the medal round" },
  { id: "GLF10", from: "Prelim", to: "Final", reason: "Golf Round 4 is the medal round" },
  { id: "MTB01", from: "Prelim", to: "Final", reason: "Men's Cross-Country is a medal event" },
  { id: "MTB02", from: "Prelim", to: "Final", reason: "Women's Cross-Country is a medal event" },
  { id: "OWS01", from: "Prelim", to: "Final", reason: "Women's 10km is a medal event" },
  { id: "OWS02", from: "Prelim", to: "Final", reason: "Men's 10km is a medal event" },
  { id: "SWA02", from: "Prelim", to: "Final", reason: "Women's Duet Free is a medal event" },
  { id: "SWA05", from: "Prelim", to: "Final", reason: "Open Team Acrobatic is a medal event" },
  { id: "TRI01", from: "Prelim", to: "Final", reason: "Women's Triathlon is a medal event" },
  { id: "TRI02", from: "Prelim", to: "Final", reason: "Men's Triathlon is a medal event" },
  { id: "TRI03", from: "Prelim", to: "Final", reason: "Mixed Relay Triathlon is a medal event" },
  { id: "WLF01", from: "Prelim", to: "Final", reason: "Weightlifting final (Men's 65kg)" },
  { id: "WLF02", from: "Prelim", to: "Final", reason: "Weightlifting final (Women's 53kg)" },
  { id: "WLF03", from: "Prelim", to: "Final", reason: "Weightlifting final (Women's 61kg, 69kg)" },
  { id: "WLF04", from: "Prelim", to: "Final", reason: "Weightlifting final (Men's 75kg)" },
  { id: "WLF05", from: "Prelim", to: "Final", reason: "Weightlifting final (Men's 85kg, 95kg)" },
  { id: "WLF06", from: "Prelim", to: "Final", reason: "Weightlifting final (Women's 77kg)" },
  { id: "WLF07", from: "Prelim", to: "Final", reason: "Weightlifting final (Women's 86kg)" },
  { id: "WLF08", from: "Prelim", to: "Final", reason: "Weightlifting final (Men's 110kg)" },
  { id: "WLF09", from: "Prelim", to: "Final", reason: "Weightlifting final (Men's +110kg)" },
  { id: "WLF10", from: "Prelim", to: "Final", reason: "Weightlifting final (Women's +86kg)" },
  { id: "WRE13", from: "Prelim", to: "Final", reason: "Wrestling repechage + medal matches" },

  // Mixed Gold+Bronze sessions: Bronze → Final (gold medal is awarded)
  { id: "BDM19", from: "Bronze", to: "Final", reason: "Includes Mixed Doubles Gold Medal Match" },
  { id: "BDM21", from: "Bronze", to: "Final", reason: "Includes Women's Doubles Gold Medal Match" },
  { id: "BDM25", from: "Bronze", to: "Final", reason: "Includes Men's Singles Gold Medal Match" },
  { id: "BDM26", from: "Bronze", to: "Final", reason: "Includes Women's Singles Gold Medal Match" },

  // Multi-round sessions where highest round is Final (includes medal bouts)
  { id: "ARC03", from: "Semi", to: "Final", reason: "Includes Compound Mixed Team Gold Medal Match" },
  { id: "FEN02", from: "Semi", to: "Final", reason: "Includes Épée/Sabre Gold Medal Bouts" },
  { id: "FEN04", from: "Semi", to: "Final", reason: "Includes Épée/Foil Gold Medal Bouts" },
  { id: "FEN06", from: "Semi", to: "Final", reason: "Includes Sabre/Foil Gold Medal Bouts" },
  { id: "SRF04", from: "Semi", to: "Final", reason: "Includes Surfing Gold Medal Matches" },
  { id: "WRE04", from: "Semi", to: "Final", reason: "Includes Wrestling Gold Medal Matches" },
  { id: "WRE06", from: "Semi", to: "Final", reason: "Includes Wrestling Gold Medal Matches" },
  { id: "WRE08", from: "Semi", to: "Final", reason: "Includes Wrestling Gold Medal Matches" },
  { id: "WRE10", from: "Semi", to: "Final", reason: "Includes Wrestling Gold Medal Matches" },
  { id: "WRE12", from: "Semi", to: "Final", reason: "Includes Wrestling Gold Medal Matches" },
];

let applied = 0;
let skipped = 0;

for (const fix of fixes) {
  const s = sessionMap.get(fix.id);
  if (!s) {
    console.log(`  SKIP ${fix.id}: not found in sessions.json`);
    skipped++;
    continue;
  }
  if (s.rt !== fix.from) {
    console.log(`  SKIP ${fix.id}: expected rt="${fix.from}" but found "${s.rt}"`);
    skipped++;
    continue;
  }
  s.rt = fix.to;
  applied++;
  console.log(`  FIXED ${fix.id}: ${fix.from} → ${fix.to} (${fix.reason})`);
}

writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2) + "\n");

console.log(`\nApplied ${applied} fixes, skipped ${skipped}`);
