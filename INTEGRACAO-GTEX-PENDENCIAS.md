# Polo Norte + GTEX — checklist final

A camada de integração já está no código. Antes de ativar em produção, faltam apenas os códigos específicos da base real e o teste ponta a ponta.

## Já definido

- GTEX URL: `http://201.20.59.15:7773`
- Filial 1 = Júlio
- Filial 4 = Divino
- Filial 5 = Vila
- CODCLI 2 = Consumidor Final
- Checkout sem conta continua funcionando
- Token GTEX é obtido automaticamente pelo backend e renovado quando necessário
- Estoque usa `QTDISPONIVEL`
- Preço/estoque ficam separados por unidade
- Pedido só é enviado ao GTEX quando o pagamento estiver aprovado
- `seuid` usa o número do pedido do e-commerce para evitar duplicidade

## Falta preencher no `.env`

```env
GTEX_USER=
GTEX_PASSWORD=

GTEX_CODVENDEDOR=1
GTEX_ORIGEMVENDA=VE

GTEX_PIX_CODPLPAG=
GTEX_PIX_CODCOB=
GTEX_CREDIT_CODPLPAG=
GTEX_CREDIT_CODCOB=
GTEX_DEBIT_CODPLPAG=
GTEX_DEBIT_CODCOB=
```

Os códigos de pagamento/cobrança devem ser consultados na própria base da Polo Norte pelas rotas `gtex_plpag` e `gtex_cob`. Não use os números da coleção de exemplo como se fossem os códigos da empresa.

## Taxa de entrega

A rota `gtex_inserir_pedido` da documentação recebida não mostra campo específico para a taxa de entrega. Confirme com a GTEX uma destas opções:

1. Existe um produto/serviço no ERP para taxa de entrega: informar o código de barras em `GTEX_DELIVERY_CODBARRA`.
2. A GTEX autoriza o valor somente na observação: definir `GTEX_ALLOW_DELIVERY_FEE_IN_OBS=true`.

Por segurança, enquanto nenhuma opção for definida, um pedido com taxa de entrega não é enviado silenciosamente com total diferente do e-commerce.

## Produtos / catálogo

Não é mais necessário mapear produto por produto. O botão **Atualizar tudo do GTEX** e o comando `npm run gtex:sync` fazem uma carga completa do ERP, cadastram automaticamente produtos que ainda não existem no site e sincronizam preço e estoque das filiais 1, 4 e 5.

Os campos `CODPROD GTEX` e `CODBARRA GTEX` continuam disponíveis para conferência ou ajuste manual de um produto específico.

## Testes rápidos

Depois de colocar as credenciais no `.env`:

```bash
npm run gtex:test
```

Deve aparecer:

```text
OK: login GTEX realizado e token recebido.
```

Para importar todos os produtos do GTEX e sincronizar preço/estoque:

```bash
npm run gtex:sync
```

## Ativação

O catálogo pode ficar automático desde já, sem liberar envio de pedidos:

```env
GTEX_ENABLED=false
GTEX_CATALOG_SYNC_ENABLED=true
GTEX_SYNC_INTERVAL_MINUTES=10
GTEX_SYNC_ON_START=true
```

Quando pagamentos e taxa de entrega estiverem conferidos, altere somente `GTEX_ENABLED=true` para liberar o envio de pedidos ao ERP.

Reinicie:

```bash
npm run dev
```

## Teste final de entrega

1. Selecionar Júlio e validar estoque/preço de um produto.
2. Repetir em Divino e Vila.
3. Criar pedido PIX e aprovar o pagamento.
4. Conferir se o pedido apareceu no GTEX na filial correta.
5. Conferir `NUMPED`/`NUMTRANS` gravados no pedido local.
6. Repetir para cartão de crédito e débito.
7. Conferir pedido com taxa de entrega.

## Segurança

As credenciais GTEX ficam somente no backend e nunca no frontend. O servidor informado usa HTTP, portanto usuário/senha e token não têm proteção TLS no transporte. Em produção, mantenha a API acessível apenas do backend/VPS e, se possível, peça à GTEX uma opção HTTPS ou restrição de acesso por IP.
