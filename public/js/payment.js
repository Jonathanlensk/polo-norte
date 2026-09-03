function gerarNumeroPedido() {
    return `#${1000 + Math.floor(Math.random() * 9000)}`;
}

let cardPaymentBrickController = null;
let montandoCardPaymentBrick = false;
let intervaloCartao = null;
let verificandoCartao = false;
let listener3dsRegistrado = false;

const VALOR_MINIMO_CARTAO = 0.50;

function tipoCartaoMercadoPago() {
    return estado.tipoCartao === "debito"
        ? "debit_card"
        : "credit_card";
}

function selecionarFormaCartao(tipo) {
    if (!["credito", "debito"].includes(tipo)) {
        return;
    }

    estado.pagamento = "cartao";
    estado.tipoCartao = tipo;
    estado.erros = {};
    desmontarCardPaymentBrick();
    render();
}

// Mantido para compatibilidade com versões anteriores da tela.
function selecionarTipoCartao(tipo) {
    selecionarFormaCartao(tipo);
}

function cartaoDisponivelPorValor() {
    return Number(totalPedido()) >= VALOR_MINIMO_CARTAO;
}

function publicKeyMercadoPagoValida(chave) {
    const valor = String(chave || "").trim();

    return Boolean(
        valor &&
        valor.length >= 20 &&
        !/COLOQUE|SUA_PUBLIC_KEY|PUBLIC_KEY_AQUI/i.test(valor)
    );
}

async function obterPublicKeyMercadoPago() {
    if (publicKeyMercadoPagoValida(window.POLO_NORTE_PUBLIC_KEY)) {
        return String(window.POLO_NORTE_PUBLIC_KEY).trim();
    }

    const resposta = await fetch(CONFIG.api.config, {
        cache: "no-store"
    });
    const resultado = await resposta.json();

    if (
        !resposta.ok ||
        !resultado.publicKeyConfigured ||
        !publicKeyMercadoPagoValida(resultado.publicKey)
    ) {
        throw new Error(
            "A Public Key do Mercado Pago não está configurada corretamente. " +
            "Preencha MERCADO_PAGO_PUBLIC_KEY no arquivo .env com a Public Key da mesma aplicação usada pelo Access Token."
        );
    }

    window.POLO_NORTE_PUBLIC_KEY = String(resultado.publicKey).trim();
    return window.POLO_NORTE_PUBLIC_KEY;
}

function mensagemErroBrickMercadoPago(erro) {
    const texto = [
        erro?.cause,
        erro?.message,
        erro?.error,
        erro?.type,
        erro?.code,
        JSON.stringify(erro || {})
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    if (
        texto.includes("get_payment_methods_failed") ||
        texto.includes("payment methods") ||
        texto.includes("identification types")
    ) {
        return "Não foi possível consultar os meios de pagamento. Confira a MERCADO_PAGO_PUBLIC_KEY no .env e confirme que ela pertence à mesma aplicação do Access Token.";
    }

    if (
        texto.includes("fields_setup_failed") ||
        texto.includes("secure fields")
    ) {
        return "O Mercado Pago não conseguiu carregar os campos seguros do cartão. Atualize a página e tente novamente em um navegador comum.";
    }

    return "O formulário de cartão do Mercado Pago encontrou um erro. Confira a Public Key e tente novamente.";
}

function exibirErroBrickMercadoPago(erro) {
    const box = document.getElementById(
        "card-payment-integration-error"
    );

    if (!box) {
        return;
    }

    box.hidden = false;
    box.innerHTML = `
        ${icon("info", 18)}
        <span>${mensagemErroBrickMercadoPago(erro)}</span>
    `;
}

function desmontarCardPaymentBrick() {
    const controller =
        cardPaymentBrickController ||
        window.cardPaymentBrickController;

    cardPaymentBrickController = null;
    window.cardPaymentBrickController = null;

    if (!controller?.unmount) {
        return;
    }

    try {
        const resultado = controller.unmount();

        if (resultado?.catch) {
            resultado.catch((erro) => {
                console.warn(
                    "Não foi possível desmontar o Card Payment Brick:",
                    erro
                );
            });
        }
    } catch (erro) {
        console.warn(
            "Não foi possível desmontar o Card Payment Brick:",
            erro
        );
    }
}

function agendarCardPaymentBrick() {
    setTimeout(() => {
        if (
            estado.tela === "pagamento" &&
            estado.pagamento === "cartao"
        ) {
            montarCardPaymentBrick();
        }
    }, 0);
}

async function montarCardPaymentBrick() {
    const container = document.getElementById(
        "cardPaymentBrick_container"
    );

    if (
        !container ||
        montandoCardPaymentBrick ||
        estado.tela !== "pagamento" ||
        estado.pagamento !== "cartao"
    ) {
        return;
    }

    if (!cartaoDisponivelPorValor()) {
        container.innerHTML = `
            <div class="card-payment-error">
                ${icon("info", 18)}
                <span>
                    Pagamentos com cartão exigem pedido de pelo menos
                    ${dinheiro(VALOR_MINIMO_CARTAO)}.
                    Adicione mais itens ou escolha Pix.
                </span>
            </div>
        `;
        return;
    }

    montandoCardPaymentBrick = true;

    try {
        desmontarCardPaymentBrick();

        if (typeof MercadoPago === "undefined") {
            throw new Error(
                "O formulário seguro do Mercado Pago não carregou. Atualize a página e tente novamente."
            );
        }

        const publicKey = await obterPublicKeyMercadoPago();
        const mp = new MercadoPago(publicKey, {
            locale: "pt-BR"
        });

        const bricksBuilder = mp.bricks();
        const tipoSelecionado = tipoCartaoMercadoPago();

        const tiposExcluidos =
            tipoSelecionado === "credit_card"
                ? ["debit_card", "prepaid_card"]
                : ["credit_card", "prepaid_card"];

        const settings = {
            initialization: {
                amount: Number(totalPedido()),
                payer: {
                    email:
                        estado.cliente?.email ||
                        estado.endereco.email ||
                        undefined
                }
            },

            customization: {
                // Polo Norte não trabalha com parcelamento:
                // crédito sempre em 1x e débito naturalmente à vista.
                paymentMethods: {
                    types: {
                        excluded: tiposExcluidos
                    },
                    ...(tipoSelecionado === "credit_card" && {
                        minInstallments: 1,
                        maxInstallments: 1
                    })
                },
                visual: {
                    texts: {
                        formSubmit: "Pagar com cartão"
                    }
                }
            },

            callbacks: {
                onReady: () => {
                    const loading = document.getElementById(
                        "card-payment-loading"
                    );

                    if (loading) {
                        loading.remove();
                    }
                },

                onSubmit: (formData, additionalData) => {
                    return new Promise(
                        async (resolve, reject) => {
                            try {
                                const dadosCartao = {
                                    token: formData.token,
                                    payment_method_id:
                                        formData.payment_method_id,
                                    payment_type_id:
                                        additionalData?.paymentTypeId ||
                                        formData.payment_type_id ||
                                        tipoSelecionado,
                                    installments:
                                        tipoSelecionado === "credit_card"
                                            ? 1
                                            : null,
                                    issuer_id:
                                        formData.issuer_id || null,
                                    payer: {
                                        email:
                                            formData.payer?.email ||
                                            estado.cliente?.email ||
                                            estado.endereco.email,
                                        identification:
                                            formData.payer?.identification ||
                                            null
                                    }
                                };

                                if (
                                    dadosCartao.payment_type_id !==
                                    tipoSelecionado
                                ) {
                                    throw new Error(
                                        "O tipo de cartão retornado pelo Mercado Pago não corresponde à opção selecionada. Escolha Crédito ou Débito novamente."
                                    );
                                }

                                await processarPagamento(
                                    "cartao",
                                    dadosCartao
                                );

                                resolve();
                            } catch (erro) {
                                console.error(
                                    "Erro ao enviar pagamento com cartão:",
                                    erro
                                );
                                reject(erro);
                            }
                        }
                    );
                },

                onError: (erro) => {
                    console.error(
                        "Card Payment Brick:",
                        erro
                    );
                    exibirErroBrickMercadoPago(erro);
                }
            }
        };

        cardPaymentBrickController =
            await bricksBuilder.create(
                "cardPayment",
                "cardPaymentBrick_container",
                settings
            );

        window.cardPaymentBrickController =
            cardPaymentBrickController;

    } catch (erro) {
        console.error(
            "Erro ao montar pagamento com cartão:",
            erro
        );

        const containerAtual = document.getElementById(
            "cardPaymentBrick_container"
        );

        if (containerAtual) {
            containerAtual.innerHTML = `
                <div class="card-payment-error">
                    ${icon("info", 18)}
                    <span>
                        ${erro.message ||
                        "Não foi possível carregar o pagamento com cartão."}
                    </span>
                </div>

                <button
                    class="botao-principal card-payment-retry"
                    onclick="montarCardPaymentBrick()"
                >
                    Tentar novamente
                </button>
            `;
        }
    } finally {
        montandoCardPaymentBrick = false;
    }
}

async function finalizarPagamento() {
    if (!validarEndereco()) {
        estado.tela = "endereco";
        render();
        return;
    }

    await processarPagamento("pix");
}

function mensagemErroCartao(statusDetail) {
    const mensagens = {
        accredited: "Pagamento aprovado.",
        pending_challenge:
            "Confirme a compra no aplicativo ou site do seu banco.",
        cc_rejected_bad_filled_card_number:
            "Confira o número do cartão.",
        cc_rejected_bad_filled_date:
            "Confira a validade do cartão.",
        cc_rejected_bad_filled_security_code:
            "Confira o código de segurança do cartão.",
        cc_rejected_insufficient_amount:
            "O cartão não possui limite ou saldo suficiente.",
        cc_rejected_call_for_authorize:
            "O banco pediu autorização para esta compra. Entre em contato com o emissor do cartão.",
        cc_rejected_card_disabled:
            "O cartão está desabilitado. Entre em contato com o banco.",
        cc_rejected_duplicated_payment:
            "O banco identificou um pagamento duplicado. Aguarde alguns minutos antes de tentar novamente.",
        cc_rejected_high_risk:
            "O pagamento não foi aprovado pelo banco. Tente outro cartão ou Pix.",
        cc_rejected_3ds_challenge:
            "Não foi possível concluir a autenticação do cartão.",
        failed:
            "O pagamento não foi aprovado pelo banco."
    };

    return mensagens[statusDetail] ||
        "O pagamento com cartão não foi aprovado. Tente novamente ou use Pix.";
}

async function processarPagamento(metodo, dadosCartao = null) {
    estado.processando = true;
    estado.metodoProcessando = metodo;
    estado.erros = {};

    // PIX pode sair da tela imediatamente. No cartão, o POST nasce dentro
    // do onSubmit do Brick; desmontar o Brick antes dessa Promise terminar
    // pode interromper o envio em alguns navegadores.
    if (metodo === "pix") {
        estado.tela = "processando";
        render();
    }

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
            credentials: "same-origin",
            body: JSON.stringify(payload)
        });

        const textoResposta = await resposta.text();
        let resultado = {};

        try {
            resultado = textoResposta
                ? JSON.parse(textoResposta)
                : {};
        } catch {
            resultado = {
                message: textoResposta ||
                    "Resposta inválida do servidor."
            };
        }

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
            estado.cartaoPagamento = {
                mercadoPagoOrderId:
                    resultado.mercadoPagoOrderId,
                mercadoPagoPaymentId:
                    resultado.mercadoPagoPaymentId || null,
                status: resultado.status,
                statusDetail: resultado.statusDetail || null,
                challengeUrl: null
            };

            estado.tela = "confirmacao";

        } else if (
            resultado.paymentMethod === "cartao" &&
            resultado.status === "pending"
        ) {
            estado.cartaoPagamento = {
                mercadoPagoOrderId:
                    resultado.mercadoPagoOrderId,
                mercadoPagoPaymentId:
                    resultado.mercadoPagoPaymentId || null,
                status: resultado.status,
                statusDetail: resultado.statusDetail || null,
                challengeUrl:
                    resultado.challengeUrl || null
            };

            estado.tela = "cartaoStatus";

        } else {
            estado.erros.pagamento =
                mensagemErroCartao(
                    resultado.statusDetail ||
                    resultado.status
                );

            estado.tela = "pagamento";
        }

    } catch (erro) {
        estado.processando = false;

        const falhaRede =
            /failed to fetch|networkerror|load failed/i.test(
                String(erro?.message || "")
            );

        estado.erros.pagamento = falhaRede
            ? "A conexão com o servidor foi interrompida ao enviar o pagamento. Tente novamente. Se continuar, confira o terminal onde o npm run dev está aberto."
            : (erro.message ||
                "Não foi possível processar o pagamento.");

        estado.tela = "pagamento";
    }

    render();
}

function registrarListener3ds() {
    if (listener3dsRegistrado) {
        return;
    }

    window.addEventListener("message", (evento) => {
        if (
            estado.tela === "cartaoStatus" &&
            evento?.data?.status === "COMPLETE"
        ) {
            verificarPagamentoCartao();
        }
    });

    listener3dsRegistrado = true;
}

function iniciarVerificacaoCartao() {
    registrarListener3ds();

    if (intervaloCartao) {
        return;
    }

    verificarPagamentoCartao();

    intervaloCartao = setInterval(
        verificarPagamentoCartao,
        3000
    );
}

function pararVerificacaoCartao() {
    if (intervaloCartao) {
        clearInterval(intervaloCartao);
        intervaloCartao = null;
    }

    verificandoCartao = false;
}

async function verificarPagamentoCartao() {
    if (estado.tela !== "cartaoStatus") {
        pararVerificacaoCartao();
        return;
    }

    if (verificandoCartao) {
        return;
    }

    const orderId =
        estado.cartaoPagamento?.mercadoPagoOrderId;

    if (!orderId) {
        pararVerificacaoCartao();
        return;
    }

    verificandoCartao = true;

    try {
        const resposta = await fetch(
            `/api/orders/${encodeURIComponent(orderId)}`
        );

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.message ||
                "Erro ao consultar pagamento com cartão."
            );
        }

        estado.cartaoPagamento = {
            ...estado.cartaoPagamento,
            status: resultado.status,
            statusDetail:
                resultado.statusDetail || null,
            challengeUrl:
                resultado.challengeUrl ||
                estado.cartaoPagamento.challengeUrl ||
                null
        };

        if (resultado.status === "approved") {
            pararVerificacaoCartao();

            estado.numeroPedido =
                resultado.orderNumber ||
                estado.numeroPedido;

            estado.tela = "confirmacao";
            render();
            return;
        }

        if (
            ["rejected", "cancelled"].includes(
                resultado.status
            )
        ) {
            pararVerificacaoCartao();

            estado.erros.pagamento =
                mensagemErroCartao(
                    resultado.statusDetail ||
                    resultado.status
                );

            estado.tela = "pagamento";
            render();
        }

    } catch (erro) {
        console.error(
            "Erro consultando cartão:",
            erro
        );
    } finally {
        verificandoCartao = false;
    }
}
