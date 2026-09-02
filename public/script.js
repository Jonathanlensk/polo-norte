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
        addresses: "/api/customer/addresses"
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

// =========================
// CLIENTE / AUTENTICAÇÃO
// =========================

async function carregarCliente() {
    try {
        const resposta = await fetch(
            CONFIG.api.me,
            {
                credentials: "same-origin"
            }
        );

        if (resposta.status === 401) {
            estado.cliente = null;
            return;
        }

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.message ||
                "Erro ao carregar cliente."
            );
        }

        estado.cliente = resultado.cliente;

        // Preenche dados básicos do checkout
        estado.endereco.nome =
            resultado.cliente.nome || "";

        estado.endereco.email =
            resultado.cliente.email || "";

        estado.endereco.whatsapp =
            resultado.cliente.whatsapp || "";

    } catch (erro) {
        console.error(
            "Erro carregando cliente:",
            erro
        );

        estado.cliente = null;
    }
}

async function carregarEnderecoSalvo() {
    if (!estado.cliente) {
        return;
    }

    try {
        const resposta = await fetch(
            CONFIG.api.address,
            {
                credentials: "same-origin"
            }
        );

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.message ||
                "Erro ao carregar endereço."
            );
        }

        const endereco = resultado.endereco;

if (!endereco) {
    estado.enderecoSelecionadoId = null;
    return;
}

estado.enderecoSelecionadoId =
    Number(endereco.id);

estado.endereco.nome =
    endereco.recipient_name ||
    estado.cliente.nome ||
    "";

        estado.endereco.email =
            estado.cliente.email || "";

        estado.endereco.whatsapp =
            estado.cliente.whatsapp || "";

        estado.endereco.cep =
            endereco.zip_code || "";

        estado.endereco.rua =
            endereco.street || "";

        estado.endereco.numero =
            endereco.number || "";

        estado.endereco.bairro =
            endereco.neighborhood || "";

        estado.endereco.cidade =
            endereco.city || "";

        estado.endereco.uf =
            endereco.state || "";

        estado.endereco.complemento =
            endereco.complement || "";

        estado.endereco.referencia =
            endereco.reference || "";

        console.log(
            "ENDEREÇO CARREGADO:",
            endereco
        );

    } catch (erro) {
        console.error(
            "Erro ao carregar endereço salvo:",
            erro
        );
    }
}

async function carregarEnderecos() {
    if (!estado.cliente) {
        estado.enderecosSalvos = [];
        return;
    }

    try {
        const resposta = await fetch(
            CONFIG.api.addresses,
            {
                credentials: "same-origin"
            }
        );

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.message ||
                "Erro ao carregar endereços."
            );
        }

        estado.enderecosSalvos =
            resultado.enderecos || [];

    } catch (erro) {
        console.error(
            "Erro carregando endereços:",
            erro
        );

        estado.enderecosSalvos = [];
    }
}


async function definirEnderecoPrincipal(id) {
    try {
        const resposta = await fetch(
            `${CONFIG.api.addresses}/${id}/default`,
            {
                method: "PUT",
                credentials: "same-origin"
            }
        );

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.message ||
                "Erro ao definir endereço principal."
            );
        }

        await carregarEnderecos();
        await carregarEnderecoSalvo();

        render();

    } catch (erro) {
        alert(erro.message);
    }
}


function confirmarExclusaoEndereco(id) {
    document
        .getElementById("modal-excluir-endereco")
        ?.remove();

    const modal = document.createElement("div");
    modal.id = "modal-excluir-endereco";

    modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 20, 50, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        z-index: 9999;
    `;

    modal.innerHTML = `
        <div
            style="
                background: white;
                width: 100%;
                max-width: 390px;
                border-radius: 22px;
                padding: 26px;
                box-shadow: 0 24px 70px rgba(0,0,0,.28);
                text-align: center;
            "
        >
            <div
                style="
                    width:58px;
                    height:58px;
                    border-radius:50%;
                    background:#fee2e2;
                    color:#dc2626;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    margin:0 auto 16px;
                "
            >
                ${icon("lixo", 26)}
            </div>

            <h2
                style="
                    margin:0 0 10px;
                    color:#0f274d;
                    font-size:23px;
                "
            >
                Excluir endereço?
            </h2>

            <p
                style="
                    color:#64748b;
                    margin:0 0 24px;
                    line-height:1.5;
                "
            >
                Tem certeza que deseja excluir este endereço?
                Essa ação não poderá ser desfeita.
            </p>

            <button
                type="button"
                onclick="confirmarExclusaoEndereco(${endereco.id})"
                style="
                    width:100%;
                    border:none;
                    background:#dc2626;
                    color:white;
                    padding:14px;
                    border-radius:13px;
                    font-size:16px;
                    font-weight:700;
                    cursor:pointer;
                    margin-bottom:8px;
                "
            >
                Excluir endereço
            </button>

            <button
                type="button"
                onclick="fecharModalExcluirEndereco()"
                style="
                    width:100%;
                    border:none;
                    background:transparent;
                    color:#475569;
                    padding:12px;
                    font-size:15px;
                    cursor:pointer;
                "
            >
                Cancelar
            </button>
        </div>
    `;

    modal.addEventListener("click", function(event) {
        if (event.target === modal) {
            fecharModalExcluirEndereco();
        }
    });

    document.body.appendChild(modal);
}


function fecharModalExcluirEndereco() {
    document
        .getElementById("modal-excluir-endereco")
        ?.remove();
}


async function excluirEndereco(id) {
    fecharModalExcluirEndereco();

    try {
        const resposta = await fetch(
            `${CONFIG.api.addresses}/${id}`,
            {
                method: "DELETE",
                credentials: "same-origin"
            }
        );

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.message ||
                "Erro ao excluir endereço."
            );
        }

        await carregarEnderecos();
        await carregarEnderecoSalvo();

        render();

        mostrarMensagem("Endereço excluído com sucesso!");

    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}
function mostrarMensagem(texto) {
    document
        .getElementById("mensagem-site")
        ?.remove();

    const aviso = document.createElement("div");
    aviso.id = "mensagem-site";

    aviso.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ffffff;
        color: #0f172a;
        padding: 16px 22px;
        border-radius: 14px;
        box-shadow: 0 12px 35px rgba(0,0,0,.18);
        z-index: 99999;
        font-weight: 600;
        max-width: 90%;
        text-align: center;
    `;

    aviso.innerHTML = `
        ✅ ${texto}
    `;

    document.body.appendChild(aviso);

    setTimeout(() => {
        aviso.remove();
    }, 2500);
}

function novoEndereco() {
    // Evita abrir dois modais
    document
        .getElementById("modal-novo-endereco")
        ?.remove();

    const modal = document.createElement("div");

    modal.id = "modal-novo-endereco";

    modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 20, 50, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        z-index: 9999;
    `;

    modal.innerHTML = `
    <div
        style="
            background: white;
            width: 100%;
            max-width: 420px;
            border-radius: 22px;
            padding: 26px;
            box-shadow: 0 24px 70px rgba(0,0,0,.28);
        "
    >
        <div
            style="
                display:flex;
                align-items:center;
                gap:12px;
                margin-bottom:8px;
            "
        >
            <div
                style="
                    width:42px;
                    height:42px;
                    border-radius:50%;
                    background:#061d45;
                    color:white;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                "
            >
                ${icon("pin", 20)}
            </div>

            <h2
                style="
                    margin:0;
                    color:#0f274d;
                    font-size:24px;
                "
            >
                Novo endereço
            </h2>
        </div>

        <p
            style="
                color:#64748b;
                margin:8px 0 22px;
            "
        >
            Como você deseja identificar este endereço?
        </p>

        <label
            style="
                display:block;
                font-weight:600;
                color:#1e293b;
                margin-bottom:8px;
            "
        >
            Nome do endereço
        </label>

        <div
            style="
                position:relative;
                margin-bottom:16px;
            "
        >
            <span
                style="
                    position:absolute;
                    left:14px;
                    top:50%;
                    transform:translateY(-50%);
                    color:#64748b;
                    pointer-events:none;
                "
            >
                ${icon("pin", 18)}
            </span>

            <input
                id="nome-novo-endereco"
                placeholder="Ex.: Casa, Trabalho..."
                maxlength="30"
                style="
                    width:100%;
                    box-sizing:border-box;
                    padding:14px 14px 14px 44px;
                    border:1.5px solid #cbd5e1;
                    border-radius:12px;
                    font-size:16px;
                    outline:none;
                    transition:.2s;
                "
                onfocus="
                    this.style.borderColor='#0f274d';
                    this.style.boxShadow='0 0 0 3px rgba(15,39,77,.10)';
                "
                onblur="
                    this.style.borderColor='#cbd5e1';
                    this.style.boxShadow='none';
                "
            >
        </div>

        <div
            style="
                display:grid;
                grid-template-columns:repeat(3,1fr);
                gap:10px;
                margin-top:12px;
            "
        >
            <button
                type="button"
                onclick="selecionarNomeEndereco('Casa')"
                style="
                    border:1px solid #d1d5db;
                    background:#f8fafc;
                    border-radius:12px;
                    padding:14px 8px;
                    cursor:pointer;
                    font-weight:600;
                    color:#1e293b;
                    transition:.2s;
                "
                onmouseover="
                    this.style.background='#ecfdf5';
                    this.style.borderColor='#22c55e';
                "
                onmouseout="
                    this.style.background='#f8fafc';
                    this.style.borderColor='#d1d5db';
                "
            >
                🏠 Casa
            </button>

            <button
                type="button"
                onclick="selecionarNomeEndereco('Trabalho')"
                style="
                    border:1px solid #d1d5db;
                    background:#f8fafc;
                    border-radius:12px;
                    padding:14px 8px;
                    cursor:pointer;
                    font-weight:600;
                    color:#1e293b;
                    transition:.2s;
                "
                onmouseover="
                    this.style.background='#fff7ed';
                    this.style.borderColor='#f59e0b';
                "
                onmouseout="
                    this.style.background='#f8fafc';
                    this.style.borderColor='#d1d5db';
                "
            >
                💼 Trabalho
            </button>

            <button
                type="button"
                onclick="selecionarNomeEndereco('Outro')"
                style="
                    border:1px solid #d1d5db;
                    background:#f8fafc;
                    border-radius:12px;
                    padding:14px 8px;
                    cursor:pointer;
                    font-weight:600;
                    color:#1e293b;
                    transition:.2s;
                "
                onmouseover="
                    this.style.background='#f5f3ff';
                    this.style.borderColor='#8b5cf6';
                "
                onmouseout="
                    this.style.background='#f8fafc';
                    this.style.borderColor='#d1d5db';
                "
            >
                📍 Outro
            </button>
        </div>

        <button
            class="botao-principal"
            style="
                margin-top:22px;
                border-radius:14px;
                min-height:52px;
            "
            onclick="confirmarNovoEndereco()"
        >
            Continuar
        </button>

        <button
            type="button"
            style="
                width:100%;
                margin-top:8px;
                border:none;
                background:transparent;
                padding:12px;
                cursor:pointer;
                color:#475569;
                font-weight:500;
            "
            onclick="fecharNovoEndereco()"
        >
            Cancelar
        </button>
    </div>
`;
        

    modal.addEventListener(
        "click",
        function(event) {
            if (event.target === modal) {
                fecharNovoEndereco();
            }
        }
    );

    document.body.appendChild(modal);

    document
        .getElementById("nome-novo-endereco")
        ?.focus();
}


function selecionarNomeEndereco(nome) {
    const campo =
        document.getElementById(
            "nome-novo-endereco"
        );

    if (campo) {
        campo.value = nome;
    }
}


function fecharNovoEndereco() {
    document
        .getElementById("modal-novo-endereco")
        ?.remove();
}


function confirmarNovoEndereco() {
    const campo =
        document.getElementById(
            "nome-novo-endereco"
        );

    const nome =
        String(campo?.value || "").trim();

    if (!nome) {
        alert(
            "Digite um nome para o endereço."
        );
        return;
    }

    estado.nomeNovoEndereco = nome;
    estado.adicionandoEndereco = true;

    fecharNovoEndereco();

    estado.endereco = {
        nome: estado.cliente?.nome || "",
        email: estado.cliente?.email || "",
        whatsapp: estado.cliente?.whatsapp || "",

        cep: "",
        numero: "",
        rua: "",
        bairro: "",
        cidade: "",
        uf: "",
        complemento: "",
        referencia: ""
    };

    ir("endereco");
}
    
function mostrarLogin() {
    estado.modoPerfil = "login";
    estado.erroAuth = "";
    render();
}


function mostrarCadastro() {
    estado.modoPerfil = "cadastro";
    estado.erroAuth = "";
    render();
}


async function cadastrarCliente() {
    const nome =
        document.getElementById("cadastro-nome")?.value || "";

    const email =
        document.getElementById("cadastro-email")?.value || "";

    const whatsapp =
        document.getElementById("cadastro-whatsapp")?.value || "";

    const senha =
        document.getElementById("cadastro-senha")?.value || "";

    estado.erroAuth = "";

    try {
        const resposta = await fetch(
            CONFIG.api.register,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                credentials: "same-origin",

                body: JSON.stringify({
                    nome,
                    email,
                    whatsapp,
                    senha
                })
            }
        );

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.message ||
                "Não foi possível criar sua conta."
            );
        }

        estado.cliente = resultado.cliente;

        estado.endereco.nome =
            resultado.cliente.nome || "";

        estado.endereco.email =
            resultado.cliente.email || "";

        estado.endereco.whatsapp =
            resultado.cliente.whatsapp || "";

        estado.erroAuth = "";

        render();

    } catch (erro) {
        estado.erroAuth = erro.message;
        render();
    }
}


async function entrarCliente() {
    const email =
        document.getElementById("login-email")?.value || "";

    const senha =
        document.getElementById("login-senha")?.value || "";

    estado.erroAuth = "";

    try {
        const resposta = await fetch(
            CONFIG.api.login,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                credentials: "same-origin",

                body: JSON.stringify({
                    email,
                    senha
                })
            }
        );

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.message ||
                "Não foi possível entrar."
            );
        }

        estado.cliente = resultado.cliente;

        estado.endereco.nome =
            resultado.cliente.nome || "";

        estado.endereco.email =
            resultado.cliente.email || "";

        estado.endereco.whatsapp =
            resultado.cliente.whatsapp || "";

        estado.erroAuth = "";

        await Promise.all([
    carregarEnderecoSalvo(),
    carregarEnderecos()
]);

render();

    } catch (erro) {
        estado.erroAuth = erro.message;
        render();
    }
}


async function sairCliente() {
    try {
        await fetch(
            CONFIG.api.logout,
            {
                method: "POST",
                credentials: "same-origin"
            }
        );

    } catch (erro) {
        console.error(
            "Erro ao sair:",
            erro
        );
    }

    estado.cliente = null;
estado.modoPerfil = "login";
estado.erroAuth = "";

// Limpa os dados pessoais ao sair da conta
estado.endereco = {
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
};

render();
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
    mostrarMensagem("🐧 Essa área ainda está em construção.");
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

async function avancarEndereco() {
    if (!validarEndereco()) {
        render();
        return;
    }

    // =====================================
    // ADICIONANDO UM NOVO ENDEREÇO
    // =====================================
    if (
        estado.cliente &&
        estado.adicionandoEndereco
    ) {
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

                        nome:
                            estado.endereco.nome,

                        cep:
                            estado.endereco.cep,

                        rua:
                            estado.endereco.rua,

                        numero:
                            estado.endereco.numero,

                        bairro:
                            estado.endereco.bairro,

                        cidade:
                            estado.endereco.cidade,

                        uf:
                            estado.endereco.uf,

                        complemento:
                            estado.endereco.complemento,

                        referencia:
                            estado.endereco.referencia,

                        principal: false
                    })
                }
            );

            const resultado =
                await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    resultado.message ||
                    "Não foi possível adicionar o endereço."
                );
            }

            // Sai do modo "novo endereço"
            estado.adicionandoEndereco = false;
            estado.nomeNovoEndereco = "";

            // Atualiza a lista do perfil
            await carregarEnderecos();

            // Volta a carregar o principal no checkout
            await carregarEnderecoSalvo();

            mostrarMensagem("Novo endereço adicionado com sucesso!");

            ir("perfil");

            return;

        } catch (erro) {
            console.error(
                "Erro adicionando endereço:",
                erro
            );

            alert(erro.message);

            return;
        }
    }


    // =====================================
    // ENDEREÇO PRINCIPAL NORMAL
    // =====================================
    if (estado.cliente) {
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
                        nome:
                            estado.endereco.nome,

                        cep:
                            estado.endereco.cep,

                        rua:
                            estado.endereco.rua,

                        numero:
                            estado.endereco.numero,

                        bairro:
                            estado.endereco.bairro,

                        cidade:
                            estado.endereco.cidade,

                        uf:
                            estado.endereco.uf,

                        complemento:
                            estado.endereco.complemento,

                        referencia:
                            estado.endereco.referencia
                    })
                }
            );

            const resultado =
                await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    resultado.message ||
                    "Não foi possível salvar o endereço."
                );
            }

            await carregarEnderecos();

        } catch (erro) {
            console.error(
                "Erro salvando endereço:",
                erro
            );

            alert(
                "Não foi possível salvar o endereço."
            );

            return;
        }
    }


    // =====================================
    // SEM PRODUTOS NO CARRINHO
    // =====================================
    if (quantidadeCarrinho() === 0) {
    mostrarMensagem("Endereço salvo com sucesso!");

    ir("perfil");

    return;
}
    // =====================================
    // COMPRA NORMAL
    // =====================================
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
    endereco: estado.endereco,

    enderecoId:
        estado.enderecoSelecionadoId || null
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
        src="LOGO-POLO-NORTE.png"
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
                    src="LOGO-POLO-NORTE.png"
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
    ${
        quantidadeCarrinho() === 0
            ? "Salvar endereço"
            : "Continuar para entrega"
    }

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
                                mostrarMensagem("Código Pix copiado! 📋");
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

    // CLIENTE LOGADO
    if (estado.cliente) {
        return `
            ${header("home")}

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
    onclick="ir('endereco')"
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
            ${header("home")}

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
        ${header("home")}

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
    confirmacao,
    perfil: perfilTela
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

async function iniciarApp() {
    await Promise.all([
        carregarProdutos(),
        carregarCliente()
    ]);

    if (estado.cliente) {
        await Promise.all([
            carregarEnderecoSalvo(),
            carregarEnderecos()
        ]);
    }

    render();
}

iniciarApp();