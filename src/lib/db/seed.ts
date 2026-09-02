import { saveDb } from "./index";
import "./seed/constants";
import { seedAi } from "./seed/ai";
import { seedCalendar } from "./seed/calendar";
import { SEED_PASSWORD } from "./seed/constants";
import { seedFinance } from "./seed/finance";
import { seedHousehold } from "./seed/household";
import { seedLists } from "./seed/lists";
import { seedMortgage } from "./seed/mortgage";
import { seedRecon } from "./seed/recon";
import { wipeSeedData } from "./seed/wipe";

async function seed() {
  await wipeSeedData();
  console.log("Seeding Jordaan household demo data...");

  const ctx = await seedHousehold();
  await seedFinance(ctx);
  await seedMortgage(ctx);
  await seedCalendar(ctx);
  await seedLists(ctx);
  await seedRecon(ctx);
  await seedAi(ctx);

  console.log("Seed complete. Default password:", SEED_PASSWORD);
}

(async () => {
  await seed();
  saveDb();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
