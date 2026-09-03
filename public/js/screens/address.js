function endereco() {
    const clienteComEndereco =
        Boolean(estado.cliente) &&
        !estado.adicionandoEndereco &&
        !estado.editandoEnderecoPrincipal &&
        estado.enderecosSalvos.length > 0;

    if (clienteComEndereco) {
        return enderecoClienteLogado();
    }

    return formularioEndereco();
}

function enderecoClienteLogado() {
    const selecionado = obterEnderecoSelecionado();

    if (!selecionado) {
        return formularioEndereco();
    }

    aplicarEnderecoSalvoNoCheckout(selecionado);

    return `
        ${header("carrinho")}
        ${etapas(1)}

        <main class="container endereco-checkout">
            <h1 class="titulo">Endereço de entrega</h1>

            <p class="subtitulo">
                Escolha onde deseja receber seu pedido.
            </p>

            <section class="endereco-selecionado-card">
                <div class="endereco-selecionado-topo">
                    <div class="endereco-selecionado-icone">
                        ${icon("pin", 20)}
                    </div>

                    <div class="endereco-selecionado-dados">
                        <span class="endereco-label">
                            ${selecionado.label || "Endereço"}
                        </span>

                        <strong>
                            ${selecionado.street}, ${selecionado.number}
                        </strong>

                        <span>
                            ${selecionado.neighborhood || ""}
                            ${selecionado.city ? ` · ${selecionado.city}` : ""}
                            ${selecionado.state ? `/${selecionado.state}` : ""}
                        </span>

                        ${
                            selecionado.complement
                                ? `<small>${selecionado.complement}</small>`
                                : ""
                        }
                    </div>

                    <button
                        type="button"
                        class="endereco-trocar"
                        onclick="abrirModalEnderecosEntrega()"
                    >
                        Trocar
                    </button>
                </div>
            </section>

            <button
                type="button"
                class="endereco-adicionar"
                onclick="novoEndereco('checkout')"
            >
                <span class="endereco-adicionar-icone">+</span>
                <span>
                    <strong>Adicionar novo endereço</strong>
                    <small>Cadastre outro local para entrega</small>
                </span>
            </button>

            <button
                class="botao-principal"
                onclick="continuarComEnderecoSalvo()"
            >
                Continuar para entrega
                ${icon("seta", 16)}
            </button>
        </main>

        ${bottomNav()}
    `;
}

function formularioEndereco() {
    const e = estado.endereco;
    const primeiroEndereco =
        Boolean(estado.cliente) &&
        estado.enderecosSalvos.length === 0 &&
        !estado.adicionandoEndereco &&
        !estado.editandoEnderecoPrincipal;

    let titulo = "Endereço de entrega";
    let subtitulo = "Informe onde devemos entregar seu pedido.";

    if (estado.adicionandoEndereco) {
        titulo = estado.nomeNovoEndereco || "Novo endereço";
        subtitulo = "Preencha os dados do novo endereço.";
    } else if (estado.editandoEnderecoPrincipal) {
        titulo = "Editar endereço principal";
        subtitulo = "Atualize os dados do seu endereço principal.";
    } else if (primeiroEndereco) {
        subtitulo = "Cadastre seu primeiro endereço para continuar.";
    }

    return `
        ${
            estado.adicionandoEndereco || estado.editandoEnderecoPrincipal
                ? header(null, "voltarFormularioEndereco()")
                : header("carrinho")
        }
        ${quantidadeCarrinho() > 0 ? etapas(1) : ""}

        <main class="container">
            <h1 class="titulo">${titulo}</h1>
            <p class="subtitulo">${subtitulo}</p>

            <div class="form">
                ${campoEndereco(
                    "Nome completo",
                    "nome",
                    "Digite seu nome",
                    "usuario"
                )}

                ${campoEndereco(
                    "E-mail",
                    "email",
                    "seuemail@email.com",
                    "info",
                    "email"
                )}

                ${campoEndereco(
                    "WhatsApp",
                    "whatsapp",
                    "(15) 99999-9999",
                    "telefone"
                )}

                <label>
                    CEP
                    <input
                        class="${classeErro("cep")}"
                        value="${e.cep}"
                        placeholder="18053-070"
                        maxlength="9"
                        inputmode="numeric"
                        oninput="atualizarEndereco('cep', this.value)"
                    >

                    ${
                        estado.buscandoCep
                            ? `<small class="msg-info">Buscando endereço...</small>`
                            : mensagemErro("cep")
                    }
                </label>

                <label>
                    Número
                    <input
                        id="campo-numero"
                        class="${classeErro("numero")}"
                        value="${e.numero}"
                        placeholder="Número"
                        oninput="atualizarEndereco('numero', this.value)"
                    >
                    ${mensagemErro("numero")}
                </label>

                ${campoEndereco("Rua", "rua", "Rua")}
                ${campoEndereco("Bairro", "bairro", "Bairro")}

                ${
                    e.cidade
                        ? `
                            <label class="full">
                                Cidade
                                <input
                                    value="${e.cidade} - ${e.uf}"
                                    disabled
                                >
                            </label>
                        `
                        : ""
                }

                ${campoEndereco(
                    "Complemento",
                    "complemento",
                    "Apartamento, bloco, casa..."
                )}

                ${campoEndereco(
                    "Ponto de referência",
                    "referencia",
                    "Ex.: próximo ao mercado",
                    "bandeira"
                )}
            </div>

            <button
                class="botao-principal"
                onclick="avancarEndereco()"
            >
                ${textoBotaoEndereco()}
                ${icon("seta", 16)}
            </button>
        </main>

        ${bottomNav()}
    `;
}


function voltarFormularioEndereco() {
    const origem = estado.origemNovoEndereco || "perfil";
    const estavaAdicionando = estado.adicionandoEndereco;
    const estavaEditando = estado.editandoEnderecoPrincipal;

    estado.adicionandoEndereco = false;
    estado.editandoEnderecoPrincipal = false;
    estado.nomeNovoEndereco = "";
    estado.origemNovoEndereco = "perfil";
    estado.erros = {};

    if (estavaAdicionando && origem === "checkout") {
        const selecionado = obterEnderecoSelecionado();
        if (selecionado) {
            aplicarEnderecoSalvoNoCheckout(selecionado);
        }
        ir("endereco");
        return;
    }

    if (estavaAdicionando || estavaEditando) {
        ir("perfil");
        return;
    }

    ir("carrinho");
}

function textoBotaoEndereco() {
    if (estado.adicionandoEndereco) {
        return "Salvar novo endereço";
    }

    if (estado.editandoEnderecoPrincipal) {
        return "Salvar alterações";
    }

    return quantidadeCarrinho() === 0
        ? "Salvar endereço"
        : "Continuar para entrega";
}

function campoEndereco(
    titulo,
    campo,
    placeholder,
    icone = null,
    tipo = "text"
) {
    const e = estado.endereco;

    const input = `
        <input
            class="${classeErro(campo)}"
            type="${tipo}"
            placeholder="${placeholder}"
            value="${e[campo] || ""}"
            oninput="atualizarEndereco('${campo}', this.value)"
        >
    `;

    return `
        <label class="full">
            ${titulo}

            ${
                icone
                    ? `
                        <div class="campo-com-icone">
                            <span class="icone-campo">
                                ${icon(icone, 16)}
                            </span>
                            ${input}
                        </div>
                    `
                    : input
            }

            ${mensagemErro(campo)}
        </label>
    `;
}

function obterEnderecoSelecionado() {
    const enderecos = estado.enderecosSalvos || [];

    return (
        enderecos.find(
            endereco =>
                Number(endereco.id) ===
                Number(estado.enderecoSelecionadoId)
        ) ||
        enderecos.find(endereco => endereco.is_default) ||
        enderecos[0] ||
        null
    );
}

function aplicarEnderecoSalvoNoCheckout(endereco) {
    if (!endereco) return;

    estado.enderecoSelecionadoId = Number(endereco.id);

    estado.endereco = {
        ...estado.endereco,
        nome:
            endereco.recipient_name ||
            estado.cliente?.nome ||
            estado.endereco.nome ||
            "",
        email:
            estado.cliente?.email ||
            estado.endereco.email ||
            "",
        whatsapp:
            estado.cliente?.whatsapp ||
            estado.endereco.whatsapp ||
            "",
        cep: endereco.zip_code || "",
        rua: endereco.street || "",
        numero: endereco.number || "",
        complemento: endereco.complement || "",
        bairro: endereco.neighborhood || "",
        cidade: endereco.city || "",
        uf: endereco.state || "",
        referencia: endereco.reference || ""
    };
}

function selecionarEnderecoEntrega(id, mostrarAviso = true) {
    const endereco = estado.enderecosSalvos.find(
        item => Number(item.id) === Number(id)
    );

    if (!endereco) {
        mostrarMensagem("Endereço não encontrado.");
        return;
    }

    aplicarEnderecoSalvoNoCheckout(endereco);
    fecharModalEnderecosEntrega();
    render();

    if (mostrarAviso) {
        mostrarMensagem("Endereço de entrega alterado!");
    }
}

function continuarComEnderecoSalvo() {
    const endereco = obterEnderecoSelecionado();

    if (!endereco) {
        mostrarMensagem("Selecione um endereço para continuar.");
        return;
    }

    aplicarEnderecoSalvoNoCheckout(endereco);
    ir("entrega");
}

function editarEnderecoPrincipal() {
    const principal =
        estado.enderecosSalvos.find(endereco => endereco.is_default) ||
        obterEnderecoSelecionado();

    if (!principal) {
        estado.editandoEnderecoPrincipal = false;
        ir("endereco");
        return;
    }

    aplicarEnderecoSalvoNoCheckout(principal);
    estado.adicionandoEndereco = false;
    estado.editandoEnderecoPrincipal = true;
    estado.origemNovoEndereco = "perfil";
    ir("endereco");
}

function abrirModalEnderecosEntrega() {
    document
        .getElementById("modal-enderecos-entrega")
        ?.remove();

    const modal = document.createElement("div");
    modal.id = "modal-enderecos-entrega";
    modal.className = "modal-enderecos-overlay";

    modal.innerHTML = `
        <div class="modal-enderecos-sheet">
            <div class="modal-enderecos-handle"></div>

            <div class="modal-enderecos-header">
                <div>
                    <h2>Onde vamos entregar?</h2>
                    <p>Escolha um dos seus endereços salvos.</p>
                </div>

                <button
                    type="button"
                    class="modal-enderecos-fechar"
                    onclick="fecharModalEnderecosEntrega()"
                    aria-label="Fechar"
                >
                    ×
                </button>
            </div>

            <div class="modal-enderecos-lista">
                ${estado.enderecosSalvos.map(endereco => {
                    const selecionado =
                        Number(endereco.id) ===
                        Number(estado.enderecoSelecionadoId);

                    return `
                        <button
                            type="button"
                            class="modal-endereco-item ${selecionado ? "selecionado" : ""}"
                            onclick="selecionarEnderecoEntrega(${endereco.id})"
                        >
                            <span class="modal-endereco-pin">
                                ${icon("pin", 18)}
                            </span>

                            <span class="modal-endereco-texto">
                                <strong>${endereco.label || "Endereço"}</strong>
                                <span>${endereco.street}, ${endereco.number}</span>
                                <small>${endereco.neighborhood || ""}</small>
                            </span>

                            <span class="modal-endereco-radio">
                                ${selecionado ? "●" : "○"}
                            </span>
                        </button>
                    `;
                }).join("")}
            </div>

            <button
                type="button"
                class="modal-endereco-adicionar"
                onclick="fecharModalEnderecosEntrega(); novoEndereco('checkout')"
            >
                + Adicionar novo endereço
            </button>
        </div>
    `;

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            fecharModalEnderecosEntrega();
        }
    });

    document.body.appendChild(modal);
}

function fecharModalEnderecosEntrega() {
    document
        .getElementById("modal-enderecos-entrega")
        ?.remove();
}
