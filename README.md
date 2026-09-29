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

## Integração GTEX ERP

Esta versão já possui a camada de integração com a API do GTEX no backend.

Mapeamento confirmado das unidades:

```text
julio  -> CODFILIAL 1
divino -> CODFILIAL 4
vila   -> CODFILIAL 5
```

O e-commerce continua permitindo compra sem conta. Os pedidos enviados ao ERP usam o cliente padrão:

```text
CODCLI 2 -> Consumidor Final
```

### Configuração

Copie as variáveis GTEX de `.env.example` para o seu `.env` e preencha o usuário e a senha do ERP. As credenciais nunca devem ir para o frontend nem para o Git.

Antes de ativar o envio de pedidos, confirme na base real os códigos de plano de pagamento e cobrança para PIX, crédito e débito e preencha:

```text
GTEX_PIX_CODPLPAG
GTEX_PIX_CODCOB
GTEX_CREDIT_CODPLPAG
GTEX_CREDIT_CODCOB
GTEX_DEBIT_CODPLPAG
GTEX_DEBIT_CODCOB
```

O vendedor padrão fica em `GTEX_CODVENDEDOR`. A documentação GTEX aceita `1` quando não houver outro código, mas o ideal é usar o vendedor definido pela empresa na rotina 2001.

Enquanto os códigos de pagamento ainda não estiverem fechados, mantenha:

```text
GTEX_ENABLED=false
GTEX_CATALOG_SYNC_ENABLED=true
```

Assim o catálogo, preços e estoques já podem sincronizar automaticamente sem enviar pedidos ao ERP. Somente depois das configurações de pagamento e taxa de entrega estarem corretas use `GTEX_ENABLED=true`.

### Produtos, preços e estoque

O GTEX passa a ser a fonte automática do catálogo. O botão **Atualizar tudo do GTEX** busca todos os produtos cadastrados no ERP, cria automaticamente no site os que ainda não existem, vincula os já encontrados e sincroniza preço e estoque das três unidades usando `QTDISPONIVEL` da filial correspondente.

A importação trabalha por `CODPROD` (um produto do site por produto do ERP) e escolhe automaticamente um `CODBARRA` principal quando o GTEX possui mais de uma embalagem/código de barras para o mesmo produto. Produtos criados automaticamente são atualizados pelo cadastro do GTEX nas sincronizações seguintes. Produtos que já existiam manualmente no site mantêm nome, descrição, categoria e imagem locais, recebendo o vínculo GTEX, preço e estoque.

O preço vindo do GTEX é armazenado por unidade. Se ainda não houver preço GTEX sincronizado, o site continua usando o preço local do cadastro do produto como fallback. Produtos novos sem preço retornado pelo GTEX começam com preço `0` até a primeira sincronização de preço.

A sincronização automática usa uma carga completa na primeira execução e, depois, consulta alterações com uma pequena sobreposição de tempo para não perder registros. Configure, se necessário:

```text
GTEX_CATALOG_START_DATE=01/01/2000 00:00:00
GTEX_SYNC_OVERLAP_MINUTES=15
GTEX_SYNC_INTERVAL_MINUTES=10
GTEX_SYNC_ON_START=true
```

O comando abaixo também executa uma carga completa de catálogo, preço e estoque:

```bash
npm run gtex:sync
```

### Pedidos

Quando o pagamento for aprovado, o backend tenta enviar o pedido para `/api/gtex_inserir_pedido`. O `seuid` enviado é o próprio número do pedido do e-commerce, evitando duplicidades. O retorno do ERP (`NUMPED`, `NUMTRANS`, posição e status) é gravado no pedido local.

Se a integração estiver desativada ou faltar alguma configuração, a compra no site continua funcionando; o erro GTEX fica registrado para reenvio posterior.

### Taxa de entrega

A documentação fornecida para `gtex_inserir_pedido` não mostra um campo específico de frete/taxa de entrega. Por isso há duas opções configuráveis:

```text
GTEX_DELIVERY_CODBARRA=<produto de taxa de entrega no ERP>
```

ou, somente se a GTEX confirmar que a taxa pode ficar fora do total do pedido no ERP:

```text
GTEX_ALLOW_DELIVERY_FEE_IN_OBS=true
```

### Endpoints administrativos GTEX

Todos exigem sessão de gerente:

- `GET /api/admin/gtex/status`
- `POST /api/admin/gtex/test`
- `POST /api/admin/gtex/products/:id/sync`
- `POST /api/admin/gtex/sync-all` — importa todo o catálogo GTEX e sincroniza preço/estoque
- `POST /api/admin/gtex/orders/:id/sync`

A sincronização automática do catálogo pode ser habilitada com `GTEX_SYNC_INTERVAL_MINUTES` e `GTEX_SYNC_ON_START`.

### Comandos rápidos GTEX

```bash
npm run gtex:test
npm run gtex:sync
```

`gtex:test` valida o login sem exibir o token. `gtex:sync` faz uma carga completa: importa produtos que ainda não existem no site e sincroniza cadastro GTEX, preço e estoque das filiais Júlio (1), Divino (4) e Vila (5).
