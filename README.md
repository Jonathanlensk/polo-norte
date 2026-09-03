# Polo Norte Bebidas

Aplicação web mobile-first para pedidos de bebidas, com catálogo, carrinho, cadastro/login de clientes, múltiplos endereços, checkout e integração com Mercado Pago.

## Stack

- Node.js 18+
- Express 5
- PostgreSQL
- HTML, CSS e JavaScript vanilla
- Mercado Pago Orders API / Checkout Transparente
- JWT em cookie HTTP-only

## Estrutura

```text
polo-norte/
├── server.js                 # Bootstrap do servidor Express
├── database/
│   ├── db.js                 # Pool PostgreSQL
│   ├── schema.sql            # Estrutura do banco
│   └── seed.sql              # Dados iniciais
├── src/
│   ├── middleware/
│   │   └── auth.middleware.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── customer.routes.js
│   │   ├── orders.routes.js
│   │   ├── products.routes.js
│   │   └── system.routes.js
│   └── services/
│       ├── cart.service.js
│       ├── mercadoPago.service.js
│       └── order.service.js
└── public/
    ├── index.html
    ├── css/
    │   ├── base.css
    │   ├── catalog.css
    │   ├── checkout.css
    │   ├── payment.css
    │   ├── responsive.css
    │   └── mercadopago.css
    └── js/
        ├── core.js
        ├── session.js
        ├── addresses.js
        ├── auth.js
        ├── cart.js
        ├── payment.js
        ├── layout.js
        ├── screens/
        │   ├── home.js
        │   ├── cart.js
        │   ├── address.js
        │   ├── delivery.js
        │   ├── payment.js
        │   └── account.js
        └── app.js
```

## Instalação

```bash
npm install
```

Crie o `.env` usando `.env.example` como modelo e configure PostgreSQL, Mercado Pago e `JWT_SECRET`.

## Banco de dados

Crie o banco `polo_norte` e execute, nesta ordem:

```text
database/schema.sql
database/seed.sql
```

## Rodar em desenvolvimento

```bash
npm run dev
```

Abra `http://localhost:3000`.

## Endpoints principais

- `GET /api/health`
- `GET /api/config`
- `GET /api/products`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/customer/addresses`
- `POST /api/customer/addresses`
- `POST /api/orders`
- `GET /api/orders/:id`
- `POST /api/webhooks/mercadopago`

## Segurança

- `.env` não deve ser versionado.
- O Access Token do Mercado Pago fica somente no backend.
- Senhas são armazenadas com bcrypt.
- A sessão do cliente usa JWT em cookie HTTP-only.
- Em produção, use HTTPS e credenciais próprias de produção.

## Organização desta versão

A versão anterior concentrava backend, telas e estilos em arquivos monolíticos. Esta estrutura separa responsabilidades sem alterar o fluxo funcional existente, facilitando manutenção e as próximas etapas do projeto.
