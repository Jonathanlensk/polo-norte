const express = require("express");
const db = require("../../database/db");
const { autenticarCliente } = require("../middleware/auth.middleware");

const router = express.Router();

router.get(
  "/api/customer/address",
  autenticarCliente,
  async (req, res) => {
    try {
      const resultado = await db.query(
        `
          SELECT
            id,
            recipient_name,
            zip_code,
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            reference
          FROM customer_addresses
          WHERE customer_id = $1
            AND active = TRUE
          ORDER BY is_default DESC, id DESC
          LIMIT 1
        `,
        [req.customerId]
      );

      return res.json({
        ok: true,
        endereco: resultado.rows[0] || null
      });

    } catch (error) {
      console.error(
        "GET /api/customer/address:",
        error
      );

      return res.status(500).json({
        message: "Erro ao carregar endereço."
      });
    }
  }
);


router.post(
  "/api/customer/address",
  autenticarCliente,
  async (req, res) => {
    try {
      const {
        nome,
        cep,
        rua,
        numero,
        bairro,
        cidade,
        uf,
        complemento,
        referencia
      } = req.body;

      if (
        !nome ||
        !cep ||
        !rua ||
        !numero ||
        !bairro
      ) {
        return res.status(400).json({
          message:
            "Preencha os dados obrigatórios do endereço."
        });
      }

      const existente = await db.query(
        `
          SELECT id
          FROM customer_addresses
          WHERE customer_id = $1
            AND is_default = TRUE
            AND active = TRUE
          LIMIT 1
        `,
        [req.customerId]
      );

      let resultado;

      if (existente.rows.length) {

        resultado = await db.query(
          `
            UPDATE customer_addresses
            SET
              recipient_name = $2,
              zip_code = $3,
              street = $4,
              number = $5,
              complement = $6,
              neighborhood = $7,
              city = $8,
              state = $9,
              reference = $10,
              updated_at = NOW()
            WHERE id = $1
            RETURNING *
          `,
          [
            existente.rows[0].id,
            nome,
            cep,
            rua,
            numero,
            complemento || null,
            bairro,
            cidade || null,
            uf || null,
            referencia || null
          ]
        );

      } else {

        resultado = await db.query(
          `
            INSERT INTO customer_addresses (
              customer_id,
              label,
              recipient_name,
              zip_code,
              street,
              number,
              complement,
              neighborhood,
              city,
              state,
              reference,
              is_default,
              active
            )
            VALUES (
              $1,
              'Principal',
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9,
              $10,
              TRUE,
              TRUE
            )
            RETURNING *
          `,
          [
            req.customerId,
            nome,
            cep,
            rua,
            numero,
            complemento || null,
            bairro,
            cidade || null,
            uf || null,
            referencia || null
          ]
        );
      }

      return res.json({
        ok: true,
        endereco: resultado.rows[0]
      });

    } catch (error) {
      console.error(
        "POST /api/customer/address:",
        error
      );

      return res.status(500).json({
        message: "Erro ao salvar endereço."
      });
    }
  }
);
// =========================================
// VÁRIOS ENDEREÇOS DO CLIENTE
// =========================================


// LISTAR TODOS OS ENDEREÇOS
router.get(
  "/api/customer/addresses",
  autenticarCliente,
  async (req, res) => {
    try {
      const resultado = await db.query(
        `
          SELECT
            id,
            label,
            recipient_name,
            zip_code,
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            reference,
            is_default
          FROM customer_addresses
          WHERE customer_id = $1
            AND active = TRUE
          ORDER BY is_default DESC, id DESC
        `,
        [req.customerId]
      );

      return res.json({
        ok: true,
        enderecos: resultado.rows
      });

    } catch (error) {
      console.error(
        "GET /api/customer/addresses:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao carregar endereços."
      });
    }
  }
);


// CRIAR NOVO ENDEREÇO
router.post(
  "/api/customer/addresses",
  autenticarCliente,
  async (req, res) => {
    const client = await db.connect();

    try {
      const {
        label,
        nome,
        cep,
        rua,
        numero,
        bairro,
        cidade,
        uf,
        complemento,
        referencia,
        principal
      } = req.body;

      if (
        !nome ||
        !cep ||
        !rua ||
        !numero ||
        !bairro
      ) {
        return res.status(400).json({
          message:
            "Preencha os dados obrigatórios."
        });
      }

      await client.query("BEGIN");

      // Verifica se é o primeiro endereço
      const quantidade =
        await client.query(
          `
            SELECT COUNT(*)::int AS total
            FROM customer_addresses
            WHERE customer_id = $1
              AND active = TRUE
          `,
          [req.customerId]
        );

      const primeiroEndereco =
        quantidade.rows[0].total === 0;

      const seraPrincipal =
        primeiroEndereco ||
        principal === true;

      // Se este será principal,
      // remove o principal dos outros
      if (seraPrincipal) {
        await client.query(
          `
            UPDATE customer_addresses
            SET
              is_default = FALSE,
              updated_at = NOW()
            WHERE customer_id = $1
              AND active = TRUE
          `,
          [req.customerId]
        );
      }

      const resultado =
        await client.query(
          `
            INSERT INTO customer_addresses (
              customer_id,
              label,
              recipient_name,
              zip_code,
              street,
              number,
              complement,
              neighborhood,
              city,
              state,
              reference,
              is_default,
              active
            )
            VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9, $10,
              $11, $12, TRUE
            )
            RETURNING *
          `,
          [
            req.customerId,
            String(label || "Endereço").trim(),
            nome,
            cep,
            rua,
            numero,
            complemento || null,
            bairro,
            cidade || null,
            uf || null,
            referencia || null,
            seraPrincipal
          ]
        );

      await client.query("COMMIT");

      return res.status(201).json({
        ok: true,
        endereco: resultado.rows[0]
      });

    } catch (error) {
      await client.query("ROLLBACK");

      console.error(
        "POST /api/customer/addresses:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao adicionar endereço."
      });

    } finally {
      client.release();
    }
  }
);


// EDITAR UM ENDEREÇO
router.put(
  "/api/customer/addresses/:id",
  autenticarCliente,
  async (req, res) => {
    try {
      const {
        label,
        nome,
        cep,
        rua,
        numero,
        bairro,
        cidade,
        uf,
        complemento,
        referencia
      } = req.body;

      if (
        !nome ||
        !cep ||
        !rua ||
        !numero ||
        !bairro
      ) {
        return res.status(400).json({
          message:
            "Preencha os dados obrigatórios."
        });
      }

      const resultado =
        await db.query(
          `
            UPDATE customer_addresses
            SET
              label = $3,
              recipient_name = $4,
              zip_code = $5,
              street = $6,
              number = $7,
              complement = $8,
              neighborhood = $9,
              city = $10,
              state = $11,
              reference = $12,
              updated_at = NOW()
            WHERE id = $1
              AND customer_id = $2
              AND active = TRUE
            RETURNING *
          `,
          [
            req.params.id,
            req.customerId,
            String(label || "Endereço").trim(),
            nome,
            cep,
            rua,
            numero,
            complemento || null,
            bairro,
            cidade || null,
            uf || null,
            referencia || null
          ]
        );

      if (!resultado.rows.length) {
        return res.status(404).json({
          message:
            "Endereço não encontrado."
        });
      }

      return res.json({
        ok: true,
        endereco: resultado.rows[0]
      });

    } catch (error) {
      console.error(
        "PUT /api/customer/addresses/:id:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao editar endereço."
      });
    }
  }
);


// DEFINIR ENDEREÇO PRINCIPAL
router.put(
  "/api/customer/addresses/:id/default",
  autenticarCliente,
  async (req, res) => {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const existe =
        await client.query(
          `
            SELECT id
            FROM customer_addresses
            WHERE id = $1
              AND customer_id = $2
              AND active = TRUE
            LIMIT 1
          `,
          [
            req.params.id,
            req.customerId
          ]
        );

      if (!existe.rows.length) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message:
            "Endereço não encontrado."
        });
      }

      await client.query(
        `
          UPDATE customer_addresses
          SET
            is_default = FALSE,
            updated_at = NOW()
          WHERE customer_id = $1
            AND active = TRUE
        `,
        [req.customerId]
      );

      const resultado =
        await client.query(
          `
            UPDATE customer_addresses
            SET
              is_default = TRUE,
              updated_at = NOW()
            WHERE id = $1
              AND customer_id = $2
            RETURNING *
          `,
          [
            req.params.id,
            req.customerId
          ]
        );

      await client.query("COMMIT");

      return res.json({
        ok: true,
        endereco: resultado.rows[0]
      });

    } catch (error) {
      await client.query("ROLLBACK");

      console.error(
        "PUT endereço principal:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao definir endereço principal."
      });

    } finally {
      client.release();
    }
  }
);


// EXCLUIR ENDEREÇO
router.delete(
  "/api/customer/addresses/:id",
  autenticarCliente,
  async (req, res) => {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const resultado =
        await client.query(
          `
            UPDATE customer_addresses
            SET
              active = FALSE,
              updated_at = NOW()
            WHERE id = $1
              AND customer_id = $2
              AND active = TRUE
            RETURNING id, is_default
          `,
          [
            req.params.id,
            req.customerId
          ]
        );

      if (!resultado.rows.length) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message:
            "Endereço não encontrado."
        });
      }

      // Se apagou o principal,
      // define outro endereço como principal
      if (resultado.rows[0].is_default) {

        const proximo =
          await client.query(
            `
              SELECT id
              FROM customer_addresses
              WHERE customer_id = $1
                AND active = TRUE
              ORDER BY id DESC
              LIMIT 1
            `,
            [req.customerId]
          );

        if (proximo.rows.length) {
          await client.query(
            `
              UPDATE customer_addresses
              SET
                is_default = TRUE,
                updated_at = NOW()
              WHERE id = $1
            `,
            [proximo.rows[0].id]
          );
        }
      }

      await client.query("COMMIT");

      return res.json({
        ok: true,
        message:
          "Endereço removido."
      });

    } catch (error) {
      await client.query("ROLLBACK");

      console.error(
        "DELETE endereço:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao remover endereço."
      });

    } finally {
      client.release();
    }
  }
);

module.exports = router;
