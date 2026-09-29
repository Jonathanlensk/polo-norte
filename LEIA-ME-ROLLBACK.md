# Rollback das categorias automáticas do GTEX

Este pacote volta a sincronização para o comportamento anterior: o GTEX continua sincronizando produtos, preços e estoques, mas não cria uma categoria para cada SECAO/DEPARTAMENTO do ERP.

As categorias voltam ao conjunto reduzido inferido pelo sistema, como Cervejas, Energéticos, Refrigerantes, Águas, Vinhos, Destilados, Sucos, Gelo, Carvão, Salgadinhos, Doces e Outros.

## Instalação

Extraia este ZIP diretamente na raiz do projeto e substitua o arquivo existente.

Depois rode:

```powershell
npm run gtex:sync
```

Isso recategoriza os produtos GTEX de volta ao comportamento anterior.

## Limpar categorias que ficaram vazias

Depois da sincronização, as categorias automáticas criadas na tentativa anterior podem continuar cadastradas no painel, porém sem produtos.

Se quiser remover TODAS as categorias vazias do cadastro (exceto Outros), rode no pgAdmin:

```sql
DELETE FROM product_categories c
WHERE LOWER(TRIM(c.name)) <> 'outros'
  AND NOT EXISTS (
    SELECT 1
    FROM products p
    WHERE LOWER(TRIM(p.category)) = LOWER(TRIM(c.name))
  );
```

Atenção: esse SQL também remove qualquer categoria manual que esteja vazia. Se quiser preservar alguma categoria vazia, não rode esse SQL e exclua somente as indesejadas pelo painel do gerente.
