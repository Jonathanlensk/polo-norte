# Atualização — estoque zero + exclusão de categorias

## O que muda

- Produto com estoque 0 em uma unidade fica automaticamente indisponível nessa unidade.
- Produto indisponível/sem estoque não aparece para o cliente da unidade selecionada.
- No painel do gerente, estoque 0 aparece como unidade não vendida; se o produto não tiver nenhuma unidade ativa, aparece como **Inativo (sem estoque)**.
- A sincronização GTEX agora grava `active=false` na unidade quando `QTDISPONIVEL` for 0.
- Categorias sem produtos visíveis não aparecem no catálogo do cliente.
- A tela **Categorias** do gerente ganhou botão **Excluir**.
- Ao excluir uma categoria, os produtos dela são movidos para **Outros** para não serem apagados.
- A categoria **Outros** não pode ser excluída porque é a categoria padrão/fallback do sistema.
- Uma categoria excluída manualmente não é recriada automaticamente pela sincronização GTEX; os produtos que cairiam nela passam para **Outros**.

## Instalação

Extraia o ZIP diretamente por cima da pasta raiz do projeto e escolha substituir os arquivos.

Depois reinicie o servidor:

```powershell
npm run dev
```

Não é necessário rodar SQL manual: o backend adiciona automaticamente a nova coluna de controle de categorias na primeira execução.

## Atualizar dados GTEX depois da instalação

Para aplicar a regra de estoque zero aos produtos atuais:

```powershell
npm run gtex:sync
```

Depois abra o site e confira Júlio, Divino e Vila separadamente.
