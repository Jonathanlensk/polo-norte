# Polo Norte Bebidas — Backend + Mercado Pago

## O que foi integrado

- Backend Node.js + Express.
- Catálogo e preços recalculados no servidor.
- Taxa de entrega por unidade.
- Criação de pedidos.
- Mercado Pago Checkout Transparente / Orders API.
- Pix com QR Code e Pix Copia e Cola.
- Cartão de crédito/débito usando o Card Payment Brick do Mercado Pago.
- Webhook básico para atualização de status.
- Consulta de status de pedido.
- Chave privada somente no `.env`.

O frontend original foi preservado e adaptado para chamar o backend.

## 1. Instalação

Instale Node.js 18 ou superior.

```bash
npm install
```

## 2. Configuração do Mercado Pago

No painel do Mercado Pago, crie uma aplicação e copie:

- Access Token de teste para `MERCADO_PAGO_ACCESS_TOKEN`
- Public Key de teste para `MERCADO_PAGO_PUBLIC_KEY`

Crie `.env` a partir de `.env.example`.

Exemplo:

```env
PORT=3000
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...
MERCADO_PAGO_PUBLIC_KEY=TEST-...
```

A chave privada deve ficar somente no servidor.

## 3. Rodar

```bash
npm start
```

Abra:

http://localhost:3000

Teste a API:

http://localhost:3000/api/health

## 4. Pix

O cliente escolhe Pix e o backend cria uma Order no Mercado Pago. A resposta devolve:

- QR Code
- Pix Copia e Cola
- link de pagamento
- ID da Order

Depois o cliente pode consultar o status.

## 5. Cartão

O formulário antigo de número/validade/CVV foi substituído pelo Card Payment Brick. Isso é importante porque os dados sensíveis do cartão não devem ser enviados para o seu backend. O Brick gera um token e o backend envia esse token ao Mercado Pago.

## 6. Webhook

Em produção, configure no painel do Mercado Pago uma URL pública:

https://SEU-DOMINIO/api/webhooks/mercadopago

Para testar localmente, use um túnel HTTPS como ngrok.

## 7. Importante antes de produção

Este projeto é uma base funcional de MVP. Antes de colocar em produção, recomendo:

- banco de dados (PostgreSQL/MongoDB);
- autenticação do painel administrativo;
- painel para aceitar/recusar pedidos;
- controle real de estoque;
- cálculo de taxa por distância/CEP;
- HTTPS;
- validação antifraude e regras de negócio;
- logs;
- tratamento completo de webhooks;
- política de privacidade/LGPD;
- controle de idade para venda de bebidas alcoólicas.

# polo-norte
