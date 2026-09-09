function reiniciarPedido() {
    estado.carrinho = {};
    estado.numeroPedido = null;
    estado.pix = null;
    estado.cartaoPagamento = null;

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
    cartaoStatus,
    confirmacao,
    pedidos: pedidosTela,
    pedido: pedidoTela,
    favoritos: favoritosTela,
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

    desmontarCardPaymentBrick();

    app.innerHTML = tela();
}

let atualizandoCatalogoCliente = false;

async function atualizarCatalogoSilencioso() {
    if (atualizandoCatalogoCliente) return;

    atualizandoCatalogoCliente = true;

    try {
        await carregarProdutos();

        // Só redesenha telas relacionadas ao catálogo para não interromper
        // pagamento/endereço enquanto o cliente está preenchendo dados.
        if (["menu", "carrinho", "favoritos"].includes(estado.tela)) {
            render();
        }
    } catch (erro) {
        console.warn("Não foi possível atualizar o catálogo em segundo plano:", erro);
    } finally {
        atualizandoCatalogoCliente = false;
    }
}

window.addEventListener("focus", () => {
    atualizarCatalogoSilencioso();
});

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        atualizarCatalogoSilencioso();
    }
});

setInterval(() => {
    if (["menu", "carrinho", "favoritos"].includes(estado.tela)) {
        atualizarCatalogoSilencioso();
    }
}, 20000);

async function iniciarApp() {
    await Promise.all([
        carregarProdutos(),
        carregarCliente()
    ]);

    carregarFavoritosLocais();

    if (estado.cliente) {
        await Promise.all([
            carregarEnderecoSalvo(),
            carregarEnderecos()
        ]);
    }

    render();
}

iniciarApp();
