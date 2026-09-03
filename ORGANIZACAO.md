# Organização aplicada

Esta versão foi reorganizada para reduzir os arquivos monolíticos sem reescrever os fluxos que já funcionavam.

## O que mudou

- `server.js` ficou responsável apenas por iniciar/configurar o Express e registrar as rotas.
- Autenticação foi movida para `src/middleware` e `src/routes/auth.routes.js`.
- Endereços do cliente foram concentrados em `src/routes/customer.routes.js`.
- Produtos e pedidos agora possuem rotas próprias.
- Lógica de carrinho, persistência de pedidos e Mercado Pago foi movida para `src/services`.
- O antigo `public/script.js` foi dividido por responsabilidade e por tela.
- O antigo `public/style.css` foi dividido por área visual.
- O arquivo legado `data/orders.json` foi removido porque o projeto já usa PostgreSQL.
- `.env` e `node_modules` não fazem parte deste pacote.

## Regra para continuar o projeto

Não voltar a concentrar novas funcionalidades em `server.js` ou em um único arquivo do frontend. Cada nova função deve entrar no arquivo da responsabilidade correspondente.

## Próxima etapa sugerida

Com a estrutura estabilizada, redesenhar o checkout do cliente em mobile-first, começando por Carrinho -> Endereço -> Entrega -> Pagamento -> Confirmação, mantendo a lógica visual inspirada na referência do iFood e a identidade da Polo Norte.
