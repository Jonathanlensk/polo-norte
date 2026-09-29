require("dotenv").config();

const db = require("../database/db");
const { syncFullCatalogFromGtex } = require("../src/services/gtex-sync.service");

(async () => {
  try {
    const summary = await syncFullCatalogFromGtex();
    console.log(JSON.stringify(summary, null, 2));
    await db.end?.();
    process.exit(summary.failed ? 2 : 0);
  } catch (error) {
    console.error("ERRO GTEX:", error.message);
    try { await db.end?.(); } catch {}
    process.exit(1);
  }
})();
