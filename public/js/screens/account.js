function processando() {
    const metodo =
        estado.metodoProcessando === "pix"
            ? "Pix"
            : "cartão";

    return `
        ${header()}

        <main class="container confirmacao">

            <div class="spinner"></div>

            <h1>
                Processando pagamento...
            </h1>

            <p class="subtitulo">
                Estamos confirmando seu pagamento via
                ${metodo}.
            </p>

        </main>
    `;
}

function confirmacao() {
    return `
        ${header()}
        ${etapas(4)}

        <main class="container confirmacao">

            <div class="check">
                ${icon("check", 40)}
            </div>

            <h1>
                Pedido confirmado!
            </h1>

            <p class="subtitulo">
                A Polo Norte já recebeu seu pedido.
            </p>

            <div class="pedido-card">

                <p>
                    Número do pedido
                </p>

                <div class="pedido-numero">
                    ${estado.numeroPedido}
                </div>

                <hr>

                <p>
                    ${icon("loja", 15)}
                    Unidade
                </p>

                <strong>
                    ${estado.unidade.nome}
                </strong>

                <p>
                    ${icon("relogio", 15)}
                    Previsão de entrega
                </p>

                <strong>
                    ${CONFIG.entrega.previsao}
                </strong>

                <p>
                    ${icon("cartao", 15)}
                    Total
                </p>

                <strong>
                    ${dinheiro(totalPedido())}
                </strong>

            </div>

            <button
                class="botao-principal"
                onclick="acompanharPedidoAtual()"
            >
                ${icon("caixa", 18)}
                Acompanhar pedido
                ${icon("seta", 16)}
            </button>

        </main>
    `;
}

function favoritosTela() {
    const favoritos = produtos.filter(
        produto => estado.favoritos.has(produto.id)
    );

    return `
        ${header()}

        <main class="container favoritos-pagina">

            <div class="favoritos-cabecalho">
                <div>
                    <h1 class="titulo">
                        ${icon("coracao", 22)}
                        Favoritos
                    </h1>

                    <p class="subtitulo">
                        Suas bebidas preferidas em um só lugar.
                    </p>
                </div>

                ${
                    favoritos.length
                        ? `
                            <span class="favoritos-contador">
                                ${favoritos.length}
                            </span>
                        `
                        : ""
                }
            </div>

            ${
                favoritos.length
                    ? `
                        <div class="produtos favoritos-grid">
                            ${favoritos.map(cardProduto).join("")}
                        </div>
                    `
                    : `
                        <section class="favoritos-vazio">
                            <div class="favoritos-vazio-icone">
                                ${icon("coracao", 30)}
                            </div>

                            <h2>Nenhum favorito ainda</h2>

                            <p>
                                Toque no coração dos produtos que você mais gosta
                                para encontrá-los rapidamente aqui.
                            </p>

                            <button
                                class="botao-principal favoritos-explorar"
                                onclick="irInicio()"
                            >
                                Ver bebidas
                                ${icon("seta", 16)}
                            </button>
                        </section>
                    `
            }

        </main>

        ${carrinhoFlutuante()}
        ${bottomNav("favoritos")}
    `;
}

function perfilTela() {

    // CLIENTE LOGADO
    if (estado.cliente) {
        return `
            ${header(null, "irInicio()")}

            <main class="container">

                <h1 class="titulo">
                    ${icon("usuario", 22)}
                    Meu perfil
                </h1>

                <p class="subtitulo">
                    Olá, ${estado.cliente.nome}!
                </p>

                <div class="pedido-card">

                    <p>Nome</p>
                    <strong>
                        ${estado.cliente.nome}
                    </strong>

                    <hr>

                    <p>E-mail</p>
                    <strong>
                        ${estado.cliente.email}
                    </strong>

                    <hr>

                    <p>WhatsApp</p>
                    <strong>
                        ${estado.cliente.whatsapp}
                    </strong>

                </div>
<h2 style="margin-top:24px">
    ${icon("pin", 20)}
    Meus endereços
</h2>

<div style="margin-top:12px">

    ${
        estado.enderecosSalvos.length === 0

            ? `
                <div class="pedido-card">
                    <p>
                        Nenhum endereço cadastrado.
                    </p>
                </div>
            `

            : estado.enderecosSalvos.map(endereco => `
                <div
                    class="pedido-card"
                    style="margin-bottom:12px"
                >

                    <div style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                    ">

                        <strong>
                            ${endereco.label || "Endereço"}
                        </strong>

                        ${
                            endereco.is_default
                                ? `
                                    <span class="aberto">
                                        Principal
                                    </span>
                                `
                                : ""
                        }

                    </div>

                    <p style="margin-top:10px">
                        ${endereco.street},
                        ${endereco.number}
                    </p>

                    <p>
                        ${endereco.neighborhood}

                        ${
                            endereco.city
                                ? ` - ${endereco.city}`
                                : ""
                        }
                    </p>

                    <p>
                        CEP ${endereco.zip_code}
                    </p>

                    ${
                        endereco.complement
                            ? `
                                <p>
                                    ${endereco.complement}
                                </p>
                            `
                            : ""
                    }

                    ${
                        !endereco.is_default
                            ? `
                                <button
                                    class="botao-principal"
                                    style="margin-top:12px"
                                    onclick="
                                        definirEnderecoPrincipal(
                                            ${endereco.id}
                                        )
                                    "
                                >
                                    Usar como principal
                                </button>
                            `
                            : ""
                    }

                    <button
                        class="botao-principal"
                        style="margin-top:8px"
                        onclick="
                            excluirEndereco(
                                ${endereco.id}
                            )
                        "
                    >
                        ${icon("lixo", 16)}
                        Excluir endereço
                    </button>

                </div>
            `).join("")
    }

</div>
                <button
    class="botao-principal"
    onclick="novoEndereco()"
>
    + Adicionar novo endereço
</button>

<button
    class="botao-principal"
    onclick="editarEnderecoPrincipal()"
    style="margin-top:8px"
>
    ${icon("pin", 18)}
    Editar endereço principal
</button>

                <button
                    class="botao-principal"
                    onclick="sairCliente()"
                    style="margin-top:12px"
                >
                    Sair da conta
                </button>

            </main>

            ${bottomNav("perfil")}
        `;
    }


    // CADASTRO
    if (estado.modoPerfil === "cadastro") {

        return `
            ${header(null, "irInicio()")}

            <main class="container">

                <h1 class="titulo">
                    Criar minha conta
                </h1>

                <p class="subtitulo">
                    Cadastre-se para facilitar seus próximos pedidos.
                </p>

                <div class="form">

                    <label>
                        Nome completo
                        <input
                            id="cadastro-nome"
                            placeholder="Seu nome"
                        >
                    </label>

                    <label>
                        E-mail
                        <input
                            id="cadastro-email"
                            type="email"
                            placeholder="seuemail@email.com"
                        >
                    </label>

                    <label>
                        WhatsApp
                        <input
                            id="cadastro-whatsapp"
                            placeholder="(15) 99999-9999"
                        >
                    </label>

                    <label>
                        Senha
                        <input
                            id="cadastro-senha"
                            type="password"
                            placeholder="Mínimo 8 caracteres"
                        >
                    </label>

                    ${
                        estado.erroAuth
                            ? `
                                <small class="msg-erro">
                                    ${estado.erroAuth}
                                </small>
                              `
                            : ""
                    }

                    <button
                        class="botao-principal"
                        onclick="cadastrarCliente()"
                    >
                        Criar conta
                    </button>

                    <button
                        class="botao-principal"
                        onclick="mostrarLogin()"
                        style="margin-top:12px"
                    >
                        Já tenho uma conta
                    </button>

                </div>

            </main>

            ${bottomNav("perfil")}
        `;
    }


    // LOGIN
    return `
        ${header(null, "irInicio()")}

        <main class="container">

            <h1 class="titulo">
                ${icon("usuario", 22)}
                Minha conta
            </h1>

            <p class="subtitulo">
                Entre para acessar seus dados e pedidos.
            </p>

            <div class="form">

                <label>
                    E-mail

                    <input
                        id="login-email"
                        type="email"
                        placeholder="seuemail@email.com"
                    >
                </label>

                <label>
                    Senha

                    <input
                        id="login-senha"
                        type="password"
                        placeholder="Sua senha"
                    >
                </label>

                ${
                    estado.erroAuth
                        ? `
                            <small class="msg-erro">
                                ${estado.erroAuth}
                            </small>
                          `
                        : ""
                }

                <button
                    class="botao-principal"
                    onclick="entrarCliente()"
                >
                    Entrar
                </button>

                <button
                    class="botao-principal"
                    onclick="mostrarCadastro()"
                    style="margin-top:12px"
                >
                    Criar minha conta
                </button>

            </div>

        </main>

        ${bottomNav("perfil")}
    `;
}

