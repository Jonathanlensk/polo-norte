const CONFIG = {
    api: {
        orders: "/api/orders",
        config: "/api/config"
    },

    entrega: {
        gratuita: true,
        previsao: "40–60 minutos"
    }
};

const ICONES = {
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    voltar: '<path d="M15 18l-6-6 6-6"/>',
    carrinho: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 7H6"/>',
    busca: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    filtro: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    pin: '<path d="M12 22s7-7.4 7-12.5A7 7 0 0 0 5 9.5C5 14.6 12 22 12 22z"/><circle cx="12" cy="9.5" r="2.5"/>',
    coracao: '<path d="M12 21s-7.5-4.7-10-9.3C.4 8 2 4 6 4c2.2 0 3.7 1.2 6 3.6C14.3 5.2 15.8 4 18 4c4 0 5.6 4 4 7.7-2.5 4.6-10 9.3-10 9.3z"/>',
    lixo: '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
    check: '<path d="M4 12l6 6L20 6"/>',
    caminhao: '<path d="M2 7h11v9H2zM13 10h4l4 3v3h-8z"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
    escudo: '<path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
    relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    raio: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
    gota: '<path d="M12 3s6 7 6 11.5A6 6 0 1 1 6 14.5C6 10 12 3 12 3z"/>',
    presente: '<path d="M3 9h18v4H3z"/><path d="M5 13h14v8H5zM12 9v12"/><path d="M12 9c-1.8 0-4-1-4-3s2-3 4 0c2-3 4-1 4 0s-2.2 3-4 3z"/>',
    cartao: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6 15h4"/>',
    casa: '<path d="M4 11 12 4l8 7"/><path d="M6 10v9h12v-9"/>',
    telefone: '<path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 5 5L15 12l5 2v3a2 2 0 0 1-2 2C10.5 19 5 13.5 5 6a2 2 0 0 1 2-2z"/>',
    bandeira: '<path d="M5 21V4"/><path d="M5 4h13l-3 4 3 4H5"/>',
    usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    caixa: '<path d="M3 8l9-5 9 5-9 5-9-5z"/><path d="M3 8v9l9 5 9-5V8"/><path d="M12 13v9"/>',
    seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 8v.01M11 12h1v5h1"/>',
    floco: '<path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11"/>',
    taca: '<path d="M7 3h10l-1 6a4 4 0 0 1-8 0L7 3z"/><path d="M12 13v5M8 21h8"/>',
    caneca: '<path d="M4 8h11v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8z"/><path d="M15 10h3a2 2 0 0 1 0 4h-3"/><path d="M6 8c0-2 1-3 1-4"/>',
    garrafa: '<path d="M10 2h4v4l2 3v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9l2-3z"/><path d="M9 12h6"/>',
    lata: '<path d="M6 6h12l-1 15H7z"/><path d="M6 6c0-1.7 2.7-3 6-3s6 1.3 6 3"/>',
    loja: '<path d="M4 10v10h16V10"/><path d="M2 5h20l-1.5 5h-17z"/><path d="M9 20v-6h6v6"/>',
    diamante: '<path d="M4 9l4-6h8l4 6-10 12z"/>'
};

function icon(nome, tamanho = 18) {
    return `
        <svg
            class="icon"
            viewBox="0 0 24 24"
            width="${tamanho}"
            height="${tamanho}"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            ${ICONES[nome] || ""}
        </svg>
    `;
}

const unidades = [
    {
        id: "julio",
        nome: "Júlio de Mesquita",
        endereco: "R. Lamartine Babo, 1092",
        bairro: "Júlio de Mesquita Filho",
        distancia: "1,8 km"
    },
    {
        id: "vila",
        nome: "Vila Helena",
        endereco: "Av. Riusaku Kanizawa, 343",
        bairro: "Vila Helena",
        distancia: "2,4 km"
    },
    {
        id: "divino",
        nome: "Largo do Divino",
        endereco: "R. Dr. Luiz Mendes de Almeida, 777",
        bairro: "Largo do Divino",
        distancia: "3,1 km"
    }
];

const categoriasInfo = {
    Todos: { icone: "presente" },
    Cervejas: { icone: "caneca" },
    Destilados: { icone: "garrafa" },
    Vinhos: { icone: "taca" },
    Refrigerantes: { icone: "lata" },
    Energéticos: { icone: "raio" },
    Águas: { icone: "gota" },
    Gelo: { icone: "floco" }
};

const classesCategoria = {
    Cervejas: "cat-cervejas",
    Destilados: "cat-destilados",
    Vinhos: "cat-vinhos",
    Refrigerantes: "cat-refrigerantes",
    Energéticos: "cat-energeticos",
    Águas: "cat-aguas",
    Gelo: "cat-gelo"
};

function classeCategoria(categoria) {
    return classesCategoria[categoria] || "cat-cervejas";
}

const produtos = [
    { id: 1, nome: "Heineken", detalhe: "Long Neck 330ml", categoria: "Cervejas", preco: 6.60, precoOriginal: 7.50, emoji: "🍺" },
    { id: 2, nome: "Brahma", detalhe: "Long Neck 330ml", categoria: "Cervejas", preco: 5.50, emoji: "🍺" },
    { id: 3, nome: "Corona Extra", detalhe: "Long Neck 330ml", categoria: "Cervejas", preco: 5.50, emoji: "🍺" },
    { id: 4, nome: "Budweiser", detalhe: "Long Neck 330ml", categoria: "Cervejas", preco: 6.50, emoji: "🍺" },
    { id: 5, nome: "Smirnoff", detalhe: "Vodka 998ml", categoria: "Destilados", preco: 49.90, emoji: "🥃" },
    { id: 6, nome: "Jack Daniel's", detalhe: "Whisky 700ml", categoria: "Destilados", preco: 139.90, emoji: "🥃" },
    { id: 7, nome: "Red Label", detalhe: "Whisky 1L", categoria: "Destilados", preco: 89.90, emoji: "🥃" },
    { id: 8, nome: "Tanqueray", detalhe: "London Dry 750ml", categoria: "Destilados", preco: 89.90, emoji: "🍸" },
    { id: 9, nome: "Red Bull", detalhe: "Lata 250ml", categoria: "Energéticos", preco: 8.90, emoji: "⚡" },

    // ÁGUA ALTERADA PARA R$ 0,10
    { id: 10, nome: "Água Mineral", detalhe: "500ml", categoria: "Águas", preco: 0.10, emoji: "💧" },

    { id: 11, nome: "Coca-Cola", detalhe: "2 Litros", categoria: "Refrigerantes", preco: 11.90, emoji: "🥤" },
    { id: 12, nome: "Gelo em Cubo", detalhe: "Pacote 5kg", categoria: "Gelo", preco: 9.90, emoji: "🧊" }
];

const estado = {
    tela: "home",
    unidade: null,
    categoria: "Todos",
    busca: "",
    carrinho: {},
    favoritos: new Set(),
    pagamento: "pix",

    endereco: {
        nome: "",
        email: "",
        whatsapp: "",
        cep: "",
        numero: "",
        rua: "",
        bairro: "",
        cidade: "",
        uf: "",
        complemento: "",
        referencia: ""
    },

    cartao: {
        nome: "",
        numero: "",
        validade: "",
        cvv: ""
    },

    erros: {},
    buscandoCep: false,
    processando: false,
    metodoProcessando: null,
    numeroPedido: null,
    pix: null
};

function dinheiro(valor = 0) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function apenasNumeros(valor = "") {
    return String(valor).replace(/\D/g, "");
}

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

function escolherUnidade(id) {
    estado.unidade = unidades.find(unidade => unidade.id === id);
    ir("menu");
}

function emBreve() {
    alert("Essa área ainda está em construção. 🐧");
}

function alternarFavorito(event, id) {
    event.stopPropagation();

    estado.favoritos.has(id)
        ? estado.favoritos.delete(id)
        : estado.favoritos.add(id);

    render();
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

function avancarEndereco() {
    if (!validarEndereco()) {
        render();
        return;
    }

    ir("entrega");
}

function gerarNumeroPedido() {
    return `#${1000 + Math.floor(Math.random() * 9000)}`;
}

async function finalizarPagamento() {
    if (!validarEndereco()) {
        estado.tela = "endereco";
        render();
        return;
    }

    await processarPagamento("pix");
}

async function processarPagamento(metodo, dadosCartao = null) {
    estado.processando = true;
    estado.metodoProcessando = metodo;
    estado.erros = {};
    estado.tela = "processando";

    render();

    const itens = Object.entries(estado.carrinho).map(
        ([id, quantidade]) => ({
            id: Number(id),
            quantidade
        })
    );

    const payload = {
        metodo,
        unidadeId: estado.unidade.id,
        itens,
        endereco: estado.endereco
    };

    if (dadosCartao) {
        payload.pagamento = dadosCartao;
    }

    try {
        const resposta = await fetch(CONFIG.api.orders, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.message ||
                "Não foi possível processar o pagamento."
            );
        }

        estado.numeroPedido =
            resultado.orderNumber || gerarNumeroPedido();

        estado.processando = false;

        if (resultado.paymentMethod === "pix") {
            estado.pix = {
                qrCode: resultado.qrCode,
                qrCodeBase64: resultado.qrCodeBase64,
                ticketUrl: resultado.ticketUrl,
                mercadoPagoOrderId:
                    resultado.mercadoPagoOrderId
            };

            estado.tela = "pix";

        } else if (resultado.status === "approved") {
            estado.tela = "confirmacao";

        } else {
            estado.erros.pagamento =
                `Pagamento ${resultado.status || "não aprovado"}.`;

            estado.tela = "pagamento";
        }

    } catch (erro) {
        estado.processando = false;
        estado.erros.pagamento = erro.message;
        estado.tela = "pagamento";
    }

    render();
}

function header(voltar = null) {
    return `
        <header class="header">

            <button
                class="header-btn"
                onclick="${voltar
                    ? `ir('${voltar}')`
                    : "emBreve()"}"
            >
                ${icon(voltar ? "voltar" : "menu", 20)}
            </button>

            <div class="logo" onclick="ir('home')" style="cursor:pointer">
    <img
        src="logo-polo-norte.png"
        alt="Polo Norte Bebidas"
        class="logo-img logo-img-header"
    >
</div>

            <button
                class="header-btn header-cart"
                onclick="ir('carrinho')"
            >
                ${icon("carrinho", 20)}

                ${quantidadeCarrinho()
                    ? `<span class="badge">
                        ${quantidadeCarrinho()}
                    </span>`
                    : ""
                }
            </button>

        </header>
    `;
}

function etapas(atual) {
    const lista = [
        "Carrinho",
        "Endereço",
        "Entrega",
        "Pagamento",
        "Confirmação"
    ];

    return `
        <div class="etapas">

            ${lista.map((item, index) => `
                <div class="
                    etapa
                    ${index === atual ? "ativa" : ""}
                    ${index < atual ? "feita" : ""}
                ">
                    <div class="etapa-bolha">
                        ${
                            index < atual
                                ? icon("check", 14)
                                : index + 1
                        }
                    </div>

                    <div class="etapa-nome">
                        ${item}
                    </div>
                </div>
            `).join("")}

        </div>
    `;
}

function bottomNav(ativo = "") {
    const itens = [
    {
        id: "home",
        nome: "Início",
        icone: "casa",
        tela: "home"
    },
    {
        id: "pedidos",
        nome: "Pedidos",
        icone: "caixa",
        tela: "pedidos"
    },
    {
        id: "favoritos",
        nome: "Favoritos",
        icone: "coracao",
        tela: "favoritos"
    },
    {
        id: "perfil",
        nome: "Perfil",
        icone: "usuario",
        tela: "perfil"
    },
    {
        id: "mais",
        nome: "Mais",
        icone: "menu",
        tela: "mais"
    }
];

    return `
        <nav class="bottom-nav">

            ${itens.map(item => `
                <button
                    class="nav-item
                    ${ativo === item.id ? "ativo" : ""}"

                    onclick="${
                        item.tela
                            ? `ir('${item.tela}')`
                            : "emBreve()"
                    }"
                >
                    ${icon(item.icone, 20)}
                    ${item.nome}
                </button>
            `).join("")}

        </nav>
    `;
}

function home() {
    return `
        <section class="hero">

            <div class="logo">
                <img
                    src="logo-polo-norte.png"
                    alt="Polo Norte Bebidas"
                    class="logo-img logo-img-hero"
                >
            </div>

            <h1>
                Bebidas geladas<br>
                <span>na sua porta!</span>
            </h1>

            <div class="beneficios">
                <div class="beneficio">
                    ${icon("relogio", 14)}
                    Entrega em até 60 min
                </div>

                <div class="beneficio">
                    ${icon("escudo", 14)}
                    Pagamento 100% seguro
                </div>

                <div class="beneficio">
                    ${icon("floco", 14)}
                    Bebidas sempre geladas
                </div>
            </div>

        </section>

        <main class="container">

            <h1 class="titulo">
                ${icon("pin", 22)}
                Escolha sua unidade
            </h1>

            <p class="subtitulo">
                Selecione a unidade mais próxima de você
            </p>

            <div class="unidades">

                ${unidades.map(unidade => `
                    <button
                        class="unidade"
                        onclick="escolherUnidade('${unidade.id}')"
                    >

                        <div class="unidade-img">
                            ${icon("loja", 30)}
                        </div>

                        <div class="unidade-info">

                            <h3>${unidade.nome}</h3>

                            <p>
                                ${icon("pin", 13)}
                                ${unidade.endereco}
                            </p>

                            <span class="aberto">
                                <span class="ponto"></span>
                                Aberto até 00:00
                            </span>

                        </div>

                        <span class="unidade-seta">
                            ${icon("seta", 18)}
                        </span>

                    </button>
                `).join("")}

            </div>

        </main>
    `;
}

function menu() {
    const categorias = Object.keys(categoriasInfo);

    const lista = produtos.filter(produto => {
        const categoriaOK =
            estado.categoria === "Todos" ||
            produto.categoria === estado.categoria;

        const buscaOK =
            produto.nome
                .toLowerCase()
                .includes(estado.busca.toLowerCase());

        return categoriaOK && buscaOK;
    });

    return `
        ${header("home")}

        <main class="container">

            <div class="loja-header">

                <div class="loja-thumb">
                    ${icon("loja", 26)}
                </div>

                <div class="loja-header-info">

                    <small>
                        ${icon("pin", 12)}
                        Unidade selecionada
                    </small>

                    <h2>${estado.unidade.nome}</h2>

                    <span class="status">
                        ● Aberto até 00:00 · Entrega rápida
                    </span>

                </div>

            </div>

            <div class="busca">

                ${icon("busca", 18)}

                <input
                    placeholder="Buscar bebidas, marcas e mais..."
                    value="${estado.busca}"
                    oninput="
                        estado.busca=this.value;
                        render()
                    "
                >

                <button
                    class="filtro-btn"
                    onclick="emBreve()"
                >
                    ${icon("filtro", 18)}
                </button>

            </div>

            <div class="categorias">

                ${categorias.map(categoria => `
                    <button
                        class="categoria-item
                        ${estado.categoria === categoria ? "ativo" : ""}"

                        onclick="
                            estado.categoria='${categoria}';
                            render()
                        "
                    >

                        <span class="categoria-icone">
                            ${icon(
                                categoriasInfo[categoria].icone,
                                20
                            )}
                        </span>

                        ${categoria}

                    </button>
                `).join("")}

            </div>

            <section class="secao-produtos">

                <div class="secao-topo">

                    <h2>
                        ${
                            estado.categoria === "Todos"
                                ? "Mais pedidos"
                                : estado.categoria
                        }
                    </h2>

                </div>

                <div class="produtos">

                    ${lista.map(produto => `
                        <article class="produto">

                            ${
                                produto.precoOriginal
                                    ? `
                                    <span class="badge-desconto">
                                        -${Math.round(
                                            (
                                                1 -
                                                produto.preco /
                                                produto.precoOriginal
                                            ) * 100
                                        )}%
                                    </span>
                                    `
                                    : ""
                            }

                            <button
                                class="favorito
                                ${
                                    estado.favoritos.has(produto.id)
                                        ? "ativo"
                                        : ""
                                }"

                                onclick="
                                    alternarFavorito(
                                        event,
                                        ${produto.id}
                                    )
                                "
                            >
                                ${icon("coracao", 14)}
                            </button>

                            <div
                                class="
                                    produto-img
                                    ${classeCategoria(
                                        produto.categoria
                                    )}
                                "
                            >
                                ${produto.emoji}
                            </div>

                            <h3>${produto.nome}</h3>

                            <p>${produto.detalhe}</p>

                            <div class="produto-preco">

                                ${
                                    produto.precoOriginal
                                        ? `
                                        <span class="preco-antigo">
                                            ${dinheiro(
                                                produto.precoOriginal
                                            )}
                                        </span>
                                        `
                                        : ""
                                }

                                <span class="preco">
                                    ${dinheiro(produto.preco)}
                                </span>

                            </div>

                            <button
                                class="add"
                                onclick="adicionar(${produto.id})"
                            >
                                +
                            </button>

                        </article>
                    `).join("")}

                </div>

            </section>

        </main>

        ${
            quantidadeCarrinho() > 0
                ? `
                <div class="carrinho-flutuante">

                    <div class="info">
                        <small>
                            ${quantidadeCarrinho()} itens
                        </small>

                        <strong>
                            ${dinheiro(totalPedido())}
                        </strong>
                    </div>

                    <button onclick="ir('carrinho')">
                        Ver carrinho
                        ${icon("seta", 15)}
                    </button>

                </div>
                `
                : ""
        }

        ${bottomNav("home")}
    `;
}

function carrinho() {
    const itens = Object.entries(estado.carrinho);

    return `
        ${header("menu")}
        ${etapas(0)}

        <main class="container">

            <div class="carrinho-topo">

                <h1 class="titulo">
                    Seu carrinho
                </h1>

                ${
                    itens.length
                        ? `
                        <button
                            class="limpar-carrinho"
                            onclick="limparCarrinho()"
                        >
                            ${icon("lixo", 14)}
                            Limpar carrinho
                        </button>
                        `
                        : ""
                }

            </div>

            ${
                !itens.length
                    ? `
                    <div class="vazio">

                        <div class="icone-vazio">
                            ${icon("carrinho", 40)}
                        </div>

                        <p>
                            Seu carrinho está vazio.
                        </p>

                        <button
                            class="botao-principal"
                            onclick="ir('menu')"
                        >
                            Ver bebidas
                            ${icon("seta", 16)}
                        </button>

                    </div>
                    `
                    : itens.map(([id, quantidade]) => {
                        const produto = produtoPorId(id);

                        return `
                            <div class="item-carrinho">

                                <div class="
                                    item-img
                                    ${classeCategoria(
                                        produto.categoria
                                    )}
                                ">
                                    ${produto.emoji}
                                </div>

                                <div class="item-info">

                                    <h3>${produto.nome}</h3>

                                    <small>
                                        ${produto.detalhe}
                                        ·
                                        ${dinheiro(produto.preco)}
                                        cada
                                    </small>

                                    <div class="quantidade">

                                        <button
                                            onclick="remover(${produto.id})"
                                        >
                                            −
                                        </button>

                                        <span>
                                            ${quantidade}
                                        </span>

                                        <button
                                            onclick="adicionar(${produto.id})"
                                        >
                                            +
                                        </button>

                                    </div>

                                </div>

                                <div class="item-lado">

                                    <button
                                        class="item-excluir"
                                        onclick="
                                            excluirProduto(
                                                ${produto.id}
                                            )
                                        "
                                    >
                                        ${icon("lixo", 14)}
                                    </button>

                                    <strong>
                                        ${dinheiro(
                                            produto.preco * quantidade
                                        )}
                                    </strong>

                                </div>

                            </div>
                        `;
                    }).join("")
            }

            ${
                itens.length
                    ? `
                    ${resumoPedido()}

                    <div class="seguranca">

                        ${icon("escudo", 22)}

                        <div>

                            <strong>
                                Pagamento 100% seguro
                            </strong>

                            <small>
                                Seus dados protegidos
                                e criptografados.
                            </small>

                            <div class="metodos">
                                <span class="metodo-chip">Pix</span>
                                <span class="metodo-chip">Visa</span>
                                <span class="metodo-chip">Mastercard</span>
                                <span class="metodo-chip">Elo</span>
                            </div>

                        </div>

                    </div>
                    `
                    : ""
            }

            <button
                class="botao-principal"
                onclick="ir('endereco')"
                ${!itens.length ? "disabled" : ""}
            >
                Continuar para entrega
                ${icon("seta", 16)}
            </button>

        </main>

        ${bottomNav()}
    `;
}

function endereco() {
    const e = estado.endereco;

    return `
        ${header("carrinho")}
        ${etapas(1)}

        <main class="container">

            <h1 class="titulo">
                Endereço de entrega
            </h1>

            <p class="subtitulo">
                Informe onde devemos entregar seu pedido.
            </p>

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
                        oninput="
                            atualizarEndereco(
                                'cep',
                                this.value
                            )
                        "
                    >

                    ${
                        estado.buscandoCep
                            ? `
                            <small class="msg-info">
                                Buscando endereço...
                            </small>
                            `
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
                        oninput="
                            atualizarEndereco(
                                'numero',
                                this.value
                            )
                        "
                    >

                    ${mensagemErro("numero")}

                </label>

                ${campoEndereco(
                    "Rua",
                    "rua",
                    "Rua"
                )}

                ${campoEndereco(
                    "Bairro",
                    "bairro",
                    "Bairro"
                )}

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
                Continuar
                ${icon("seta", 16)}
            </button>

        </main>

        ${bottomNav()}
    `;
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
            oninput="
                atualizarEndereco(
                    '${campo}',
                    this.value
                )
            "
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

function entrega() {
    const e = estado.endereco;

    const enderecoFormatado = `
        ${e.rua}, ${e.numero}
        ${e.complemento ? ` - ${e.complemento}` : ""}
        · ${e.bairro}
        ${e.cidade ? ` · ${e.cidade}/${e.uf}` : ""}
    `;

    return `
        ${header("endereco")}
        ${etapas(2)}

        <main class="container">

            <h1 class="titulo">
                Entrega
            </h1>

            <p class="subtitulo">
                Confira os dados da sua entrega.
            </p>

            <div class="endereco-card">

                <div class="icone-pin">
                    ${icon("pin", 20)}
                </div>

                <div>

                    <strong>Seu endereço</strong>

                    <br>

                    <small>
                        ${enderecoFormatado}
                    </small>

                </div>

            </div>

            <div class="info-entrega">

                <div>
                    <span>
                        ${icon("loja", 16)}
                        Unidade
                    </span>

                    <strong>
                        ${estado.unidade.nome}
                    </strong>
                </div>

                <div>
                    <span>
                        ${icon("pin", 16)}
                        Distância
                    </span>

                    <strong>
                        ${estado.unidade.distancia}
                    </strong>
                </div>

                <div>
                    <span>
                        ${icon("relogio", 16)}
                        Previsão
                    </span>

                    <strong>
                        ${CONFIG.entrega.previsao}
                    </strong>
                </div>

            </div>

            ${resumoPedido()}

            <button
                class="botao-principal"
                onclick="ir('pagamento')"
            >
                Continuar para pagamento
                ${icon("seta", 16)}
            </button>

        </main>

        ${bottomNav()}
    `;
}

function pagamento() {
    const pixAtivo = estado.pagamento === "pix";

    return `
        ${header("entrega")}
        ${etapas(3)}

        <main class="container">

            <h1 class="titulo">
                Pagamento
            </h1>

            <p class="subtitulo">
                Escolha como deseja pagar.
            </p>

            ${
                estado.erros.pagamento
                    ? `
                    <p class="msg-erro msg-erro-bloco">
                        ${icon("info", 16)}
                        ${estado.erros.pagamento}
                    </p>
                    `
                    : ""
            }

            <button
                class="pagamento ${pixAtivo ? "ativo" : ""}"
                onclick="
                    estado.pagamento='pix';
                    estado.erros={};
                    render()
                "
            >
                <div class="icone">
                    ${icon("diamante", 18)}
                </div>

                <div>
                    <strong>Pix</strong>
                    <small>Pagamento instantâneo</small>
                </div>

                <span class="radio"></span>
            </button>

            <button
                class="pagamento ${!pixAtivo ? "ativo" : ""}"
                onclick="
                    estado.pagamento='cartao';
                    estado.erros={};
                    render()
                "
            >
                <div class="icone">
                    ${icon("cartao", 18)}
                </div>

                <div>
                    <strong>Cartão</strong>
                    <small>Crédito ou débito</small>
                </div>

                <span class="radio"></span>
            </button>

            ${
                pixAtivo
                    ? `
                    <div class="localizacao">
                        ${icon("escudo", 18)}
                        Pagamento seguro via Mercado Pago.
                    </div>

                    <button
                        class="botao-principal"
                        onclick="finalizarPagamento()"
                    >
                        Gerar Pix e confirmar pedido
                        ${icon("seta", 16)}
                    </button>
                    `
                    : `
                    <div
                        id="cardPaymentBrick_container"
                        style="margin-top:16px"
                    ></div>
                    `
            }

            ${resumoPedido()}

        </main>

        ${bottomNav()}
    `;
}


/* =====================================================
   PIX
===================================================== */

function pixPagamento() {
    const pix = estado.pix || {};

    setTimeout(() => {
        iniciarVerificacaoPix();
    }, 500);

    const qr = pix.qrCodeBase64
        ? `
            <img
                class="pix-qr"
                src="data:image/png;base64,${pix.qrCodeBase64}"
                alt="QR Code Pix"
            >
        `
        : "";

    return `
        ${header()}

        <main class="container confirmacao">

            <div class="check">
                ${icon("check", 40)}
            </div>

            <h1>
                Pix gerado!
            </h1>

            <p class="subtitulo">
                Pedido ${estado.numeroPedido}.
                Faça o pagamento pelo QR Code.
            </p>

            <div class="pedido-card">

                ${qr}

                <p>
                    ${icon("cartao", 15)}
                    Valor
                </p>

                <strong>
                    ${dinheiro(totalPedido())}
                </strong>

                ${
                    pix.qrCode
                        ? `
                        <label
                            style="
                                display:block;
                                margin-top:16px;
                                font-weight:bold
                            "
                        >

                            Pix Copia e Cola

                            <textarea
                                id="pix-copia-cola"
                                readonly
                                style="
                                    width:100%;
                                    min-height:110px;
                                    margin-top:8px
                                "
                            >${pix.qrCode}</textarea>

                        </label>

                        <button
                            class="botao-principal"
                            style="margin-top:10px"
                            onclick="
                                navigator.clipboard.writeText(
                                    document.getElementById(
                                        'pix-copia-cola'
                                    ).value
                                );
                                alert('Código Pix copiado!')
                            "
                        >
                            Copiar Pix
                        </button>
                        `
                        : ""
                }

                <div
                    id="pix-status"
                    style="
                        margin-top:20px;
                        text-align:center;
                        font-weight:bold;
                    "
                >
                    ⏳ Aguardando confirmação do pagamento...
                </div>

                <button
                    class="botao-principal"
                    style="
                        margin-top:15px;
                        background:#f59e0b;
                    "
                    onclick="simularPagamentoPix()"
                >
                    🧪 Simular pagamento aprovado
                </button>

            </div>

        </main>
    `;
}
/* =====================================================
   VERIFICAÇÃO DO PAGAMENTO PIX
===================================================== */

let intervaloPix = null;

let verificandoPix = false;


/*
    INICIA A VERIFICAÇÃO DO STATUS
*/
function iniciarVerificacaoPix() {

    if (intervaloPix) {
        return;
    }

    verificarPagamentoPix();

    intervaloPix = setInterval(
        verificarPagamentoPix,
        3000
    );
}


/*
    CONSULTA O STATUS DO PEDIDO
*/
async function verificarPagamentoPix() {

    if (estado.tela !== "pix") {

        pararVerificacaoPix();

        return;
    }

    if (verificandoPix) {
        return;
    }

    const orderId =
        estado.pix?.mercadoPagoOrderId;

    if (!orderId) {

        console.error(
            "mercadoPagoOrderId não encontrado."
        );

        return;
    }

    verificandoPix = true;

    try {

        const resposta = await fetch(
            `/api/orders/${encodeURIComponent(orderId)}`
        );

        const resultado =
            await resposta.json();

        console.log(
            "STATUS DO PIX:",
            resultado
        );

        if (!resposta.ok) {

            throw new Error(
                resultado.message ||
                "Erro ao consultar pagamento."
            );
        }


        /*
            PAGAMENTO APROVADO
        */
        if (
            resultado.status === "approved"
        ) {

            pararVerificacaoPix();

            estado.numeroPedido =
                resultado.orderNumber ||
                estado.numeroPedido;

            estado.tela =
                "confirmacao";

            render();

            return;
        }


        /*
            PAGAMENTO RECUSADO
        */
        if (
            [
                "rejected",
                "cancelled"
            ].includes(
                resultado.status
            )
        ) {

            pararVerificacaoPix();

            const statusElement =
                document.getElementById(
                    "pix-status"
                );

            if (statusElement) {

                statusElement.innerHTML =
                    "❌ Pagamento não aprovado.";
            }
        }

    } catch (erro) {

        console.error(
            "Erro verificando PIX:",
            erro
        );

    } finally {

        verificandoPix = false;
    }
}


/*
    PARA A VERIFICAÇÃO
*/
function pararVerificacaoPix() {

    if (intervaloPix) {

        clearInterval(
            intervaloPix
        );

        intervaloPix = null;
    }

    verificandoPix = false;
}


/*
    SIMULA O PAGAMENTO APROVADO
*/
async function simularPagamentoPix() {

    const orderId =
        estado.pix?.mercadoPagoOrderId;

    if (!orderId) {

        alert(
            "ID do pedido não encontrado."
        );

        return;
    }

    try {

        const resposta = await fetch(
            `/api/test/approve/${encodeURIComponent(orderId)}`,
            {
                method: "POST"
            }
        );

        const resultado =
            await resposta.json();

        if (!resposta.ok) {

            throw new Error(
                resultado.message ||
                "Erro ao simular pagamento."
            );
        }

        console.log(
            "PAGAMENTO SIMULADO:",
            resultado
        );

        /*
            VERIFICA IMEDIATAMENTE
        */
        await verificarPagamentoPix();

    } catch (erro) {

        console.error(
            "Erro simulando pagamento:",
            erro
        );

        alert(
            erro.message
        );
    }
}

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
                onclick="reiniciarPedido()"
            >
                ${icon("caixa", 18)}
                Acompanhar pedido
                ${icon("seta", 16)}
            </button>

        </main>
    `;
}

function pedidosTela() {
    return `
        ${header("home")}
        
    `;
}

function favoritosTela() {
    
}

function perfilTela() {
    
}

function maisTela() {
    
}

function reiniciarPedido() {
    estado.carrinho = {};
    estado.numeroPedido = null;
    estado.pix = null;

    ir("menu");
}

const telas = {
    home,
    menu,
    carrinho,
    endereco,
    entrega,
    pagamento,
    processando,
    pix: pixPagamento,
    confirmacao
};

function render() {
    const app = document.getElementById("app");

    if (!app) {
        console.error(
            'Elemento com id="app" não encontrado.'
        );

        return;
    }

    const tela = telas[estado.tela] || home;

    app.innerHTML = tela();
}

render();