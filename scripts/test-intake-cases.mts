import { runIntake } from "../src/lib/server/intake";
import cases from "./intake-cases.json";

async function main() {
  let pass = 0;
  for (const c of cases as Array<typeof cases[number]>) {
    const r = await runIntake(c.text, { useLLM: true });
    const okTrade = c.expect.includes("unknown") ? r.trade === "unknown" : r.trade !== "unknown";
    const okEmergency = c.expect.includes("emergency") ? r.emergency.is_emergency : true;
    const okClarify = c.expect.includes("needs_clarification") ? r.needs_clarification : true;
    const ok = okTrade && okEmergency && okClarify;
    if (ok) pass += 1;
    console.log(`${ok ? "PASS" : "FAIL"} #${c.n}: trade=${r.trade} job=${r.jobType} urg=${r.urgency} em=${r.emergency.is_emergency ? r.emergency.kind : "-"} conf=${r.confidence} src=${r.source}`);
  }
  console.log(`${pass}/${cases.length} passed`);
  process.exit(0);
}
main();
