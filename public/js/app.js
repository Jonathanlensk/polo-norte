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
