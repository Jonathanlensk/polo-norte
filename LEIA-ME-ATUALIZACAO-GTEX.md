# Atualização GTEX — importação automática de todos os produtos

Esta atualização faz o site usar o GTEX como fonte automática de catálogo, preço e estoque.

## O que muda

- Busca todos os produtos do GTEX por período de cadastro.
- Um produto do site é criado automaticamente para cada `CODPROD` do ERP que ainda não esteja vinculado.
- Produtos que já existiam e já têm `CODPROD GTEX` não são duplicados.
- O sistema também tenta vincular produtos locais ainda não mapeados quando encontra correspondência segura por nome/descrição.
- Produtos criados automaticamente pelo GTEX passam a acompanhar alterações de cadastro do ERP.
- Produtos já existentes manualmente no site preservam nome, descrição, categoria e imagem locais; recebem preço/estoque/vínculo GTEX.
- Estoque é sincronizado separadamente para Júlio (filial 1), Divino (filial 4) e Vila (filial 5), usando `QTDISPONIVEL`.
- Preço é salvo por unidade.
- Produtos novos sem preço válido ficam inativos até o GTEX retornar um preço maior que zero, evitando venda a R$ 0,00.
- Se o GTEX tiver vários códigos de barras para o mesmo `CODPROD`, o sistema escolhe um código principal e mantém um produto por `CODPROD`, evitando duplicar o mesmo estoque em embalagens diferentes.
- A primeira sincronização é completa; as seguintes usam alterações recentes com uma janela de segurança.

## Como aplicar

Extraia este ZIP por cima da pasta atual do projeto e aceite substituir os arquivos.

Não substitua nem envie seu `.env` para o Git. No `.env` atual, mantenha a URL correta e acrescente, se ainda não existir:

```env
GTEX_ENABLED=false
GTEX_CATALOG_SYNC_ENABLED=true
GTEX_URL=http://201.20.59.15:7773
GTEX_CATALOG_START_DATE=01/01/2000 00:00:00
GTEX_SYNC_OVERLAP_MINUTES=15
GTEX_SYNC_INTERVAL_MINUTES=10
GTEX_SYNC_ON_START=true
GTEX_TIMEOUT_MS=15000
GTEX_BULK_TIMEOUT_MS=120000
```

`GTEX_ENABLED=false` continua impedindo o envio de pedidos ao ERP enquanto os códigos de pagamento não estão definidos. `GTEX_CATALOG_SYNC_ENABLED=true` permite sincronizar catálogo, preço e estoque mesmo assim.

## Primeiro teste

Depois de substituir os arquivos:

```powershell
npm run gtex:test
```

Se o login estiver OK, execute a primeira carga completa:

```powershell
npm run gtex:sync
```

A primeira carga pode levar mais tempo porque traz todo o cadastro, preços e estoques.

Depois abra o painel do gerente e confira Produtos. O botão agora se chama **Atualizar tudo do GTEX** e executa a mesma carga completa.

Para deixar a atualização automática rodando:

```powershell
npm run dev
```

Com `GTEX_SYNC_INTERVAL_MINUTES=10`, novas inclusões e alterações do GTEX passam a ser buscadas periodicamente.

## Banco de dados

Não é necessário executar outro SQL manual para esta atualização. Na primeira sincronização o backend cria automaticamente as colunas/tabela auxiliares que faltarem (`gtex_managed`, `gtex_deleted` e `gtex_sync_state`). O `database/schema.sql` também foi atualizado para instalações novas.

## Imagens

A rota de produtos fornecida pela GTEX não contém imagem do produto. Produtos criados automaticamente entram sem imagem; imagens podem continuar sendo cadastradas no painel sem serem apagadas pela sincronização.
