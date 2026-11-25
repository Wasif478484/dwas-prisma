// Seed CLI: fills the SQLite database with the DWAS demo data (spec section 11).
import { seedDemoData } from "../src/lib/server/seed";

seedDemoData()
  .then((counts) => {
    console.log("Seeded:", JSON.stringify(counts));
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
