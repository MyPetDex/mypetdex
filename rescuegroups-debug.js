/**
 * Run: node rescuegroups-debug.js
 * Shows attr.url for the first 3 dogs and 3 cats in NJ.
 * Screenshot this output and send to Emily at RescueGroups support.
 */

const PROXY = "https://us-central1-mypetdex-c4315.cloudfunctions.net/rescueProxy";
const STATE = "NJ";

async function fetchAnimals(species) {
  const res = await fetch(PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: {
        filters: [
          { fieldName: "statuses.name",    operation: "equals", criteria: "Available" },
          { fieldName: "locations.state",  operation: "equals", criteria: STATE },
          { fieldName: "species.singular", operation: "equals", criteria: species },
        ],
        limit: 3,
        include: ["pictures", "orgs", "locations"],
      },
    }),
  });
  return res.json();
}

async function main() {
  console.log("=".repeat(60));
  console.log(`  RescueGroups v5 API — attr.url comparison  (state: ${STATE})`);
  console.log("=".repeat(60));

  for (const species of ["Dog", "Cat"]) {
    console.log(`\n── ${species.toUpperCase()}S ──────────────────────────────────────────`);
    const data = await fetchAnimals(species);
    const animals = data.data || [];
    if (animals.length === 0) { console.log("  (no results)"); continue; }
    animals.forEach((a) => {
      const attr = a.attributes || {};
      const rawUrl  = attr.url ?? "(undefined)";
      const isGeneric = typeof rawUrl === "string" && rawUrl.includes("rescuegroups.org/org/");
      const isEmpty   = !rawUrl || rawUrl === "(undefined)";
      const status = isEmpty ? "❌ EMPTY" : isGeneric ? "⚠️  GENERIC ORG URL" : "✅ DIRECT PET URL";
      console.log(`  Animal ID : ${a.id}`);
      console.log(`  Name      : ${attr.name}`);
      console.log(`  attr.url  : ${rawUrl}`);
      console.log(`  Status    : ${status}`);
      console.log();
    });
  }
}

main().catch(console.error);
