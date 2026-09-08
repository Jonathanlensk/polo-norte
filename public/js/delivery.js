function taxaEntregaAtual() {
    return Number(estado.cotacaoEntrega?.fee || 0);
}

function previsaoEntregaAtual() {
    return estado.cotacaoEntrega?.estimatedText || CONFIG.entrega.previsao;
}

function distanciaEntregaAtual() {
    const km = Number(estado.cotacaoEntrega?.distanceKm);

    if (!Number.isFinite(km)) {
        return null;
    }

    return `${km.toFixed(1).replace(".", ",")} km`;
}

function invalidarCotacaoEntrega() {
    estado.cotacaoEntrega = null;
    estado.erroEntrega = "";
    estado.carregandoEntrega = false;
}

async function carregarCotacaoEntrega() {
    if (!estado.unidade?.id) {
        estado.erroEntrega = "Selecione uma unidade antes de calcular a entrega.";
        estado.carregandoEntrega = false;
        render();
        return;
    }

    estado.carregandoEntrega = true;
    estado.erroEntrega = "";
    render();

    try {
        const resposta = await fetch(CONFIG.api.deliveryQuote, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                unidadeId: estado.unidade.id,
                endereco: estado.endereco
            })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.message ||
                "Não foi possível calcular a entrega."
            );
        }

        estado.cotacaoEntrega = resultado.quote;
        estado.erroEntrega = "";
    } catch (erro) {
        console.error("Erro calculando entrega:", erro);
        estado.cotacaoEntrega = null;
        estado.erroEntrega =
            erro.message ||
            "Não foi possível calcular a entrega agora.";
    }

    estado.carregandoEntrega = false;
    render();
}

async function abrirEntregaComCotacao() {
    estado.tela = "entrega";
    estado.cotacaoEntrega = null;
    estado.erroEntrega = "";
    estado.carregandoEntrega = true;
    render();

    await carregarCotacaoEntrega();
}
