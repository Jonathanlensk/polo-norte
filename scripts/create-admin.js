require("dotenv").config();

const readline = require("readline");
const { Writable } = require("stream");
const bcrypt = require("bcryptjs");
const db = require("../database/db");

class SaidaMutavel extends Writable {
  constructor() {
    super();
    this.muted = false;
  }

  _write(chunk, encoding, callback) {
    if (!this.muted) {
      process.stdout.write(chunk, encoding);
    }
    callback();
  }
}

const output = new SaidaMutavel();
const rl = readline.createInterface({
  input: process.stdin,
  output,
  terminal: true
});

function perguntar(texto) {
  return new Promise((resolve) => rl.question(texto, resolve));
}

function perfilPorOpcao(opcao) {
  const valor = String(opcao || "1").trim().toLowerCase();

  if (["2", "gerente", "manager"].includes(valor)) {
    return "manager";
  }

  if (["1", "operador", "operator", ""].includes(valor)) {
    return "operator";
  }

  throw new Error("Perfil inválido. Escolha 1 para Operador ou 2 para Gerente.");
}

async function main() {
  try {
    console.log("\n=== Criar acesso administrativo - Polo Norte ===\n");

    const nome = String(await perguntar("Nome: ")).trim();
    const email = String(await perguntar("E-mail: ")).trim().toLowerCase();

    console.log("\nPerfil do usuário:");
    console.log("1 - Operador (pedidos e status)");
    console.log("2 - Gerente (acesso gerencial completo)");
    const role = perfilPorOpcao(await perguntar("Escolha [1]: "));

    process.stdout.write("Senha (mínimo 8 caracteres): ");
    output.muted = true;
    const senha = String(await perguntar(""));
    output.muted = false;
    process.stdout.write("\n");

    if (nome.length < 2) {
      throw new Error("Informe um nome válido.");
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw new Error("Informe um e-mail válido.");
    }

    if (senha.length < 8) {
      throw new Error("A senha deve ter pelo menos 8 caracteres.");
    }

    const existe = await db.query(
      `SELECT id FROM admins WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );

    if (existe.rows.length) {
      throw new Error("Já existe um usuário administrativo com este e-mail.");
    }

    const passwordHash = await bcrypt.hash(senha, 12);

    const result = await db.query(
      `
        INSERT INTO admins (name, email, password_hash, role, active)
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING id, name, email, role
      `,
      [nome, email, passwordHash, role]
    );

    const criado = result.rows[0];
    const perfil = criado.role === "manager" ? "Gerente" : "Operador";

    console.log("\nAcesso criado com sucesso:");
    console.log(`- ID: ${criado.id}`);
    console.log(`- Nome: ${criado.name}`);
    console.log(`- E-mail: ${criado.email}`);
    console.log(`- Perfil: ${perfil}`);
    console.log("\nAcesse: http://localhost:3000/admin/\n");
  } catch (error) {
    console.error(`\nErro: ${error.message}`);

    if (error.code === "42P01") {
      console.error(
        "A tabela admins ainda não existe. Execute database/schema.sql no PostgreSQL."
      );
    }

    process.exitCode = 1;
  } finally {
    rl.close();
    await db.end();
  }
}

main();
