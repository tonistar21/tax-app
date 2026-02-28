import { loadAllGeo } from "../geo/geo-loader.js";

async function main() {
  console.log("Starting geo data load...");
  await loadAllGeo();
  console.log("All geo data loaded successfully.");
}

main().catch((e) => {
  console.error("Geo load failed:", e);
  process.exit(1);
});
