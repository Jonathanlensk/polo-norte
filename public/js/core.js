const CONFIG = {
    api: {
        orders: "/api/orders",
        config: "/api/config",
        products: "/api/products",

        register: "/api/auth/register",
        login: "/api/auth/login",
        me: "/api/auth/me",
        logout: "/api/auth/logout",

        address: "/api/customer/address",
        addresses: "/api/customer/addresses",
        customerOrders: "/api/customer/orders"
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

let produtos = [];

function emojiProduto(categoria) {
    const emojis = {
        Cervejas: "🍺",
        Destilados: "🥃",
        Vinhos: "🍷",
        Refrigerantes: "🥤",
        Energéticos: "⚡",
        Águas: "💧",
        Gelo: "🧊"
    };

    return emojis[categoria] || "🥤";
}

async function carregarProdutos() {
    try {
        const resposta = await fetch(CONFIG.api.products);

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.message ||
                "Não foi possível carregar os produtos."
            );
        }

        produtos = resultado.products.map(produto => ({
            ...produto,

            id: Number(produto.id),
            preco: Number(produto.preco),
            estoque: Number(produto.estoque),

            emoji: emojiProduto(produto.categoria)
        }));

        console.log(
            "PRODUTOS CARREGADOS DO BANCO:",
            produtos
        );

    } catch (erro) {
        console.error(
            "Erro ao carregar produtos:",
            erro
        );

        produtos = [];
    }
}

const estado = {
    tela: "home",
    unidade: null,
    voltarCatalogoPara: null,
    categoria: "Todos",
    busca: "",
    carrinho: {},
    favoritos: new Set(),
    pagamento: "pix",
    
    cliente: null,
    modoPerfil: "login",
    erroAuth: "",
    enderecosSalvos: [],
    enderecoSelecionadoId: null,

    adicionandoEndereco: false,
    nomeNovoEndereco: "",
    origemNovoEndereco: "perfil",
    editandoEnderecoPrincipal: false,


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
    pix: null,
    cartaoPagamento: null,

    pedidos: [],
    pedidoSelecionado: null,
    carregandoPedidos: false,
    carregandoPedido: false,
    erroPedidos: "",
    erroPedido: ""
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

// =========================
// CLIENTE / AUTENTICAÇÃO
// =========================
