function produtoPorId(id) {
    return produtos.find(produto => produto.id === Number(id));
}

function quantidadeCarrinho() {
    return Object.values(estado.carrinho)
        .reduce((total, quantidade) => total + quantidade, 0);
}

function subtotal() {
    return Object.entries(estado.carrinho)
        .reduce((total, [id, quantidade]) => {
            const produto = produtoPorId(id);
            return total + (produto ? produto.preco * quantidade : 0);
        }, 0);
}

// ENTREGA É GRÁTIS
function totalPedido() {
    return subtotal();
}

function adicionar(id) {
    estado.carrinho[id] = (estado.carrinho[id] || 0) + 1;
    render();
}

function remover(id) {
    if (!estado.carrinho[id]) return;

    estado.carrinho[id]--;

    if (estado.carrinho[id] <= 0) {
        delete estado.carrinho[id];
    }

    render();
}

function limparCarrinho() {
    estado.carrinho = {};
    render();
}

function excluirProduto(id) {
    delete estado.carrinho[id];
    render();
}

function ir(tela) {
    estado.tela = tela;
    render();
}

function irInicio() {
    estado.voltarCatalogoPara = null;

    if (!estado.unidade) {
        estado.tela = "home";
        render();
        return;
    }

    estado.tela = "menu";
    render();
}

function voltarCatalogo() {
    const destino = estado.voltarCatalogoPara;
    estado.voltarCatalogoPara = null;

    if (!destino || destino === "menu" || destino === "home") {
        render();
        return;
    }

    estado.tela = destino;
    render();
}

function trocarUnidade() {
    estado.voltarCatalogoPara = null;
    estado.tela = "home";
    render();
}

function escolherUnidade(id) {
    estado.unidade = unidades.find(unidade => unidade.id === id);
    estado.voltarCatalogoPara = null;
    estado.tela = "menu";
    render();
}

function emBreve() {
    mostrarMensagem("🐧 Essa área ainda está em construção.");
}

const FAVORITOS_STORAGE_KEY = "polo_norte_favoritos";

function carregarFavoritosLocais() {
    try {
        const salvos = JSON.parse(
            localStorage.getItem(FAVORITOS_STORAGE_KEY) || "[]"
        );

        const idsValidos = Array.isArray(salvos)
            ? salvos
                .map(Number)
                .filter(id => produtoPorId(id))
            : [];

        estado.favoritos = new Set(idsValidos);
    } catch (erro) {
        console.warn("Não foi possível carregar favoritos:", erro);
        estado.favoritos = new Set();
    }
}

function salvarFavoritosLocais() {
    try {
        localStorage.setItem(
            FAVORITOS_STORAGE_KEY,
            JSON.stringify([...estado.favoritos])
        );
    } catch (erro) {
        console.warn("Não foi possível salvar favoritos:", erro);
    }
}

function alternarFavorito(event, id) {
    event?.stopPropagation?.();

    const produtoId = Number(id);
    const removendo = estado.favoritos.has(produtoId);

    if (removendo) {
        estado.favoritos.delete(produtoId);
    } else {
        estado.favoritos.add(produtoId);
    }

    salvarFavoritosLocais();
    render();

    mostrarMensagem(
        removendo
            ? "Removido dos favoritos."
            : "Adicionado aos favoritos!"
    );
}

function resumoPedido() {
    return `
        <div class="resumo">
            <div class="linha">
                <span>Subtotal (${quantidadeCarrinho()} itens)</span>
                <span>${dinheiro(subtotal())}</span>
            </div>

            <div class="linha total">
                <span>Total</span>
                <span>${dinheiro(totalPedido())}</span>
            </div>
        </div>
    `;
}

function atualizarEndereco(campo, valor) {
    estado.endereco[campo] = valor;

    if (estado.erros[campo]) {
        delete estado.erros[campo];
    }

    if (campo === "cep") {
        const cep = apenasNumeros(valor);

        if (cep.length === 8) {
            buscarCep(cep);
        }
    }
}

function classeErro(campo) {
    return estado.erros[campo] ? "erro" : "";
}

function mensagemErro(campo) {
    return estado.erros[campo]
        ? `<small class="msg-erro">${estado.erros[campo]}</small>`
        : "";
}

async function buscarCep(cep) {
    estado.buscandoCep = true;
    delete estado.erros.cep;
    render();

    try {
        const resposta = await fetch(
            `https://viacep.com.br/ws/${cep}/json/`
        );

        const dados = await resposta.json();

        if (dados.erro) {
            throw new Error("CEP não encontrado.");
        }

        estado.endereco.rua = dados.logradouro || "";
        estado.endereco.bairro = dados.bairro || "";
        estado.endereco.cidade = dados.localidade || "";
        estado.endereco.uf = dados.uf || "";

    } catch (erro) {
        estado.erros.cep =
            "Não foi possível encontrar o CEP. Preencha manualmente.";
    }

    estado.buscandoCep = false;
    render();

    requestAnimationFrame(() => {
        document.getElementById("campo-numero")?.focus();
    });
}

function validarEndereco() {
    const e = estado.endereco;
    const erros = {};

    if (!e.nome.trim()) {
        erros.nome = "Informe seu nome completo.";
    }

    if (!/^\S+@\S+\.\S+$/.test(e.email.trim())) {
        erros.email = "Informe um e-mail válido.";
    }

    if (
        !/^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/
            .test(e.whatsapp.trim())
    ) {
        erros.whatsapp = "Informe um WhatsApp válido.";
    }

    if (!/^\d{5}-?\d{3}$/.test(e.cep.trim())) {
        erros.cep = "CEP inválido.";
    }

    if (!e.numero.trim()) {
        erros.numero = "Informe o número.";
    }

    if (!e.rua.trim()) {
        erros.rua = "Informe a rua.";
    }

    if (!e.bairro.trim()) {
        erros.bairro = "Informe o bairro.";
    }

    estado.erros = erros;

    return Object.keys(erros).length === 0;
}

async function avancarEndereco() {
    if (!validarEndereco()) {
        render();
        return;
    }

    // Novo endereço de cliente logado
    if (estado.cliente && estado.adicionandoEndereco) {
        const origem = estado.origemNovoEndereco || "perfil";

        try {
            const resposta = await fetch(
                CONFIG.api.addresses,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "same-origin",
                    body: JSON.stringify({
                        label:
                            estado.nomeNovoEndereco ||
                            "Endereço",
                        nome: estado.endereco.nome,
                        cep: estado.endereco.cep,
                        rua: estado.endereco.rua,
                        numero: estado.endereco.numero,
                        bairro: estado.endereco.bairro,
                        cidade: estado.endereco.cidade,
                        uf: estado.endereco.uf,
                        complemento:
                            estado.endereco.complemento,
                        referencia:
                            estado.endereco.referencia,
                        principal: false
                    })
                }
            );

            const resultado = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    resultado.message ||
                    "Não foi possível adicionar o endereço."
                );
            }

            estado.adicionandoEndereco = false;
            estado.nomeNovoEndereco = "";
            estado.editandoEnderecoPrincipal = false;
            estado.origemNovoEndereco = "perfil";

            await carregarEnderecos();

            if (origem === "checkout") {
                aplicarEnderecoSalvoNoCheckout(
                    resultado.endereco
                );

                mostrarMensagem(
                    "Novo endereço adicionado com sucesso!"
                );

                ir(
                    quantidadeCarrinho() > 0
                        ? "endereco"
                        : "perfil"
                );

                return;
            }

            await carregarEnderecoSalvo();

            mostrarMensagem(
                "Novo endereço adicionado com sucesso!"
            );

            ir("perfil");
            return;

        } catch (erro) {
            console.error(
                "Erro adicionando endereço:",
                erro
            );

            mostrarMensagem(
                erro.message ||
                "Não foi possível adicionar o endereço."
            );

            return;
        }
    }

    // Salva o primeiro endereço ou edita o principal
    if (estado.cliente) {
        const editandoPrincipal =
            estado.editandoEnderecoPrincipal;

        try {
            const resposta = await fetch(
                CONFIG.api.address,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "same-origin",
                    body: JSON.stringify({
                        nome: estado.endereco.nome,
                        cep: estado.endereco.cep,
                        rua: estado.endereco.rua,
                        numero: estado.endereco.numero,
                        bairro: estado.endereco.bairro,
                        cidade: estado.endereco.cidade,
                        uf: estado.endereco.uf,
                        complemento:
                            estado.endereco.complemento,
                        referencia:
                            estado.endereco.referencia
                    })
                }
            );

            const resultado = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    resultado.message ||
                    "Não foi possível salvar o endereço."
                );
            }

            await carregarEnderecos();
            await carregarEnderecoSalvo();

            estado.editandoEnderecoPrincipal = false;

            if (editandoPrincipal) {
                mostrarMensagem(
                    "Endereço principal atualizado!"
                );
                ir("perfil");
                return;
            }

        } catch (erro) {
            console.error(
                "Erro salvando endereço:",
                erro
            );

            mostrarMensagem(
                erro.message ||
                "Não foi possível salvar o endereço."
            );

            return;
        }
    }

    if (quantidadeCarrinho() === 0) {
        mostrarMensagem("Endereço salvo com sucesso!");
        ir(estado.cliente ? "perfil" : "home");
        return;
    }

    ir("entrega");
}
