function formatarDataPedido(valor) {
    if (!valor) return "";

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(valor));
}

function textoMetodoPagamento(metodo) {
    const textos = {
        pix: "Pix",
        cartao: "Cartão",
        credit_card: "Cartão de crédito",
        debit_card: "Cartão de débito",
        cash: "Dinheiro"
    };

    return textos[metodo] || "Pagamento";
}

function infoStatusPedido(pedido) {
    if (pedido.orderStatus === "delivered") {
        return {
            texto: "Entregue",
            classe: "entregue"
        };
    }

    if (pedido.orderStatus === "out_for_delivery") {
        return {
            texto: "Saiu para entrega",
            classe: "andamento"
        };
    }

    if (pedido.orderStatus === "preparing") {
        return {
            texto: "Em separação",
            classe: "andamento"
        };
    }

    if (["rejected", "cancelled"].includes(pedido.paymentStatus)) {
        return {
            texto: "Pagamento não aprovado",
            classe: "erro"
        };
    }

    if (pedido.paymentStatus !== "approved") {
        return {
            texto: "Aguardando pagamento",
            classe: "pendente"
        };
    }

    return {
        texto: "Pedido recebido",
        classe: "andamento"
    };
}

function etapasAcompanhamento(pedido) {
    const statusPedido = pedido.orderStatus || "received";
    const pagamentoAprovado = pedido.paymentStatus === "approved";

    const preparando = [
        "preparing",
        "out_for_delivery",
        "delivered"
    ].includes(statusPedido);

    const saiu = [
        "out_for_delivery",
        "delivered"
    ].includes(statusPedido);

    const entregue = statusPedido === "delivered";

    const etapas = [
        {
            titulo: "Pedido recebido",
            descricao: "Seu pedido foi registrado.",
            concluida: true
        },
        {
            titulo: "Pagamento aprovado",
            descricao: pagamentoAprovado
                ? "Pagamento confirmado."
                : "Aguardando confirmação do pagamento.",
            concluida: pagamentoAprovado
        },
        {
            titulo: "Em separação",
            descricao: "A loja está preparando seus produtos.",
            concluida: preparando
        },
        {
            titulo: "Saiu para entrega",
            descricao: "Seu pedido está a caminho.",
            concluida: saiu
        },
        {
            titulo: "Entregue",
            descricao: "Pedido finalizado.",
            concluida: entregue
        }
    ];

    let atualEncontrada = false;

    return etapas.map((etapa) => {
        let estadoEtapa = "futura";

        if (etapa.concluida) {
            estadoEtapa = "concluida";
        } else if (!atualEncontrada) {
            estadoEtapa = "atual";
            atualEncontrada = true;
        }

        return {
            ...etapa,
            estado: estadoEtapa
        };
    });
}

async function abrirMeusPedidos() {
    estado.tela = "pedidos";
    estado.pedidoSelecionado = null;
    estado.erroPedidos = "";

    if (!estado.cliente) {
        estado.carregandoPedidos = false;
        render();
        return;
    }

    estado.carregandoPedidos = true;
    render();

    try {
        const resposta = await fetch(
            CONFIG.api.customerOrders,
            {
                credentials: "same-origin"
            }
        );

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.message ||
                "Não foi possível carregar seus pedidos."
            );
        }

        estado.pedidos = resultado.orders || [];

    } catch (erro) {
        estado.erroPedidos = erro.message;

    } finally {
        estado.carregandoPedidos = false;
        render();
    }
}

async function abrirPedido(numeroPedido) {
    if (!estado.cliente) {
        return acompanharPedidoAtual();
    }

    estado.tela = "pedido";
    estado.pedidoSelecionado = null;
    estado.carregandoPedido = true;
    estado.erroPedido = "";
    render();

    try {
        const resposta = await fetch(
            `${CONFIG.api.customerOrders}/${encodeURIComponent(numeroPedido)}`,
            {
                credentials: "same-origin"
            }
        );

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.message ||
                "Não foi possível carregar o pedido."
            );
        }

        estado.pedidoSelecionado = resultado.order;

    } catch (erro) {
        estado.erroPedido = erro.message;

    } finally {
        estado.carregandoPedido = false;
        render();
    }
}

function criarPedidoAtualVisitante() {
    const itens = Object.entries(estado.carrinho).map(
        ([id, quantidade]) => {
            const produto = produtoPorId(id);

            return {
                productId: Number(id),
                productName: produto?.nome || "Produto",
                unitPrice: Number(produto?.preco || 0),
                quantity: Number(quantidade),
                subtotal:
                    Number(produto?.preco || 0) * Number(quantidade)
            };
        }
    );

    const endereco = estado.endereco;

    return {
        orderNumber: estado.numeroPedido,
        total: totalPedido(),
        subtotal: subtotal(),
        deliveryFee: 0,
        paymentMethod: estado.metodoProcessando || estado.pagamento || "pix",
        paymentStatus: "approved",
        orderStatus: "received",
        deliveryAddress: [
            `${endereco.rua}, ${endereco.numero}`,
            endereco.bairro,
            endereco.cidade && endereco.uf
                ? `${endereco.cidade}/${endereco.uf}`
                : endereco.cidade || ""
        ].filter(Boolean).join(" · "),
        deliveryReference: endereco.referencia || null,
        createdAt: new Date().toISOString(),
        items: itens,
        visitante: true
    };
}

async function acompanharPedidoAtual() {
    const numeroPedido = estado.numeroPedido;

    if (!numeroPedido) {
        mostrarMensagem("Pedido não encontrado.");
        return;
    }

    if (estado.cliente) {
        estado.carrinho = {};
        await abrirPedido(numeroPedido);
        return;
    }

    estado.pedidoSelecionado = criarPedidoAtualVisitante();
    estado.carrinho = {};
    estado.tela = "pedido";
    render();
}
