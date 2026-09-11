require("dotenv").config();

const readline = require("readline");
const { Writable } = require("stream");
const bcrypt = require("bcryptjs");
const db = require("../database/db");
const {
  ensureAdminSchema,
  normalizeLogin,
  isValidLogin
} = require("../src/services/admin-users.service");

const ADMIN_UNITS = [
  { id: "julio", name: "Júlio de Mesquita" },
  { id: "vila", name: "Vila Helena" },
  { id: "divino", name: "Largo do Divino" }
];

class SaidaMutavel extends Writable {
  constructor() {
    super();
    this.muted = false;
  }

  _write(chunk, encoding, callback) {
    if (!this.muted) process.stdout.write(chunk, encoding);
    callback();
  }
}

const output = new SaidaMutavel();
const rl = readline.createInterface({ input: process.stdin, output, terminal: true });

function perguntar(texto) {
  return new Promise((resolve) => rl.question(texto, resolve));
}

function perfilPorOpcao(opcao) {
  const valor = String(opcao || "1").trim().toLowerCase();
  if (["2", "gerente", "manager"].includes(valor)) return "manager";
  if (["1", "operador", "operator", ""].includes(valor)) return "operator";
  throw new Error("Perfil inválido. Escolha 1 para Operador ou 2 para Gerente.");
}

async function main() {
  try {
    await ensureAdminSchema();

    console.log("\n=== Criar acesso administrativo - Polo Norte ===\n");

    const nome = String(await perguntar("Nome: ")).trim();
    const login = normalizeLogin(await perguntar("Matrícula de login: "));
    const email = String(await perguntar("E-mail de contato (opcional): ")).trim().toLowerCase() || null;

    console.log("\nPerfil do usuário:");
    console.log("1 - Operador (pedidos e status)");
    console.log("2 - Gerente (acesso gerencial completo)");
    const role = perfilPorOpcao(await perguntar("Escolha [1]: "));

    let unitId = null;
    if (role === "operator") {
      console.log("\nUnidade do operador:");
      ADMIN_UNITS.forEach((unit, index) => console.log(`${index + 1} - ${unit.name}`));
      const unitOption = Number(String(await perguntar("Escolha [1]: ")).trim() || "1");
      unitId = ADMIN_UNITS[unitOption - 1]?.id || null;
      if (!unitId) throw new Error("Unidade inválida.");
    }

    process.stdout.write("Senha (mínimo 8 caracteres): ");
    output.muted = true;
    const senha = String(await perguntar(""));
    output.muted = false;
    process.stdout.write("\n");

    if (nome.length < 2) throw new Error("Informe um nome válido.");
    if (!isValidLogin(login)) {
      throw new Error("A matrícula deve ter de 2 a 30 caracteres e usar letras, números, ponto, hífen ou underline.");
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new Error("Informe um e-mail válido ou deixe em branco.");
    if (senha.length < 8) throw new Error("A senha deve ter pelo menos 8 caracteres.");

    const existe = await db.query(
      `SELECT id FROM admins WHERE UPPER(login) = UPPER($1) OR ($2::text IS NOT NULL AND LOWER(email) = LOWER($2)) LIMIT 1`,
      [login, email]
    );

    if (existe.rows.length) throw new Error("Já existe um usuário com esta matrícula ou e-mail.");

    const passwordHash = await bcrypt.hash(senha, 12);
    const result = await db.query(
      `
        INSERT INTO admins (name, login, email, password_hash, role, unit_id, active)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE)
        RETURNING id, name, login, email, role, unit_id
      `,
      [nome, login, email, passwordHash, role, unitId]
    );

    const criado = result.rows[0];
    const perfil = criado.role === "manager" ? "Gerente" : "Operador";

    console.log("\nAcesso criado com sucesso:");
    console.log(`- ID: ${criado.id}`);
    console.log(`- Nome: ${criado.name}`);
    console.log(`- Matrícula: ${criado.login}`);
    console.log(`- E-mail: ${criado.email || "não informado"}`);
    console.log(`- Perfil: ${perfil}`);
    if (criado.role === "operator") {
      console.log(`- Unidade: ${ADMIN_UNITS.find((unit) => unit.id === criado.unit_id)?.name || criado.unit_id}`);
    }
    console.log("\nAcesse: http://localhost:3000/admin/\n");
  } catch (error) {
    output.muted = false;
    console.error(`\nErro: ${error.message}`);
    process.exitCode = 1;
  } finally {
    rl.close();
    await db.end();
  }
}

main();
