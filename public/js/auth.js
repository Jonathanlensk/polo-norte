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
