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

function novoEndereco(origem = "perfil") {
    estado.origemNovoEndereco = origem;
    estado.editandoEnderecoPrincipal = false;

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
    estado.editandoEnderecoPrincipal = false;

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
