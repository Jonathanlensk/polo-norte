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
