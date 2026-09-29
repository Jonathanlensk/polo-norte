require("dotenv").config();

const {
  getGtexConfigStatus,
  testConnection
} = require("../src/services/gtex.service");

(async () => {
  const config = getGtexConfigStatus();

  console.log("GTEX URL:", config.baseUrl || "não configurada");
  console.log("Filiais:", config.filiais);
  console.log("CODCLI:", config.codcli);
  console.log("Usuário configurado:", config.userConfigured ? "sim" : "não");
  console.log("Senha configurada:", config.passwordConfigured ? "sim" : "não");

  try {
    await testConnection();
    console.log("OK: login GTEX realizado e token recebido.");
    process.exit(0);
  } catch (error) {
    console.error("ERRO GTEX:", error.message);
    process.exit(1);
  }
})();
