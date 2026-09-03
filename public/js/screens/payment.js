function pagamento() {
    const pixAtivo = estado.pagamento === "pix";

    if (!pixAtivo && cartaoDisponivelPorValor()) {
        agendarCardPaymentBrick();
    }

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
                class="pagamento ${!pixAtivo && estado.tipoCartao === "credito" ? "ativo" : ""}"
                onclick="selecionarFormaCartao('credito')"
            >
                <div class="icone">
                    ${icon("cartao", 18)}
                </div>

                <div>
                    <strong>Crédito</strong>
                    <small>Cartão de crédito · à vista 1x</small>
                </div>

                <span class="radio"></span>
            </button>

            <button
                class="pagamento ${!pixAtivo && estado.tipoCartao === "debito" ? "ativo" : ""}"
                onclick="selecionarFormaCartao('debito')"
            >
                <div class="icone">
                    ${icon("cartao", 18)}
                </div>

                <div>
                    <strong>Débito</strong>
                    <small>Cartão de débito · à vista</small>
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
                    <section class="card-payment-box">
                        <div class="card-payment-safe">
                            ${icon("escudo", 18)}
                            <span>
                                Seus dados do cartão são preenchidos
                                diretamente no ambiente seguro do Mercado Pago.
                            </span>
                        </div>

                        ${
                            cartaoDisponivelPorValor()
                                ? `
                                <div
                                    id="card-payment-integration-error"
                                    class="card-payment-error"
                                    hidden
                                ></div>

                                <div id="card-payment-loading">
                                    Carregando pagamento seguro...
                                </div>

                                <div id="cardPaymentBrick_container"></div>
                                `
                                : `
                                <div class="card-payment-error">
                                    ${icon("info", 18)}
                                    <span>
                                        O cartão fica disponível a partir de
                                        <strong>${dinheiro(VALOR_MINIMO_CARTAO)}</strong>.
                                        Seu pedido está em
                                        <strong>${dinheiro(totalPedido())}</strong>.
                                        Adicione mais itens ou pague por Pix.
                                    </span>
                                </div>

                                <button
                                    class="botao-principal card-payment-retry"
                                    onclick="irInicio()"
                                >
                                    Adicionar mais itens
                                </button>
                                `
                        }
                    </section>
                    `
            }

            ${resumoPedido()}

        </main>

        ${bottomNav()}
    `;
}

function cartaoStatus() {
    const pagamentoCartao =
        estado.cartaoPagamento || {};

    const temChallenge =
        Boolean(pagamentoCartao.challengeUrl);

    setTimeout(() => {
        iniciarVerificacaoCartao();
    }, 500);

    return `
        ${header()}

        <main class="container card-status-page">

            <div class="card-status-icon">
                ${icon("escudo", 34)}
            </div>

            <h1 class="titulo card-status-title">
                ${
                    temChallenge
                        ? "Confirme a compra"
                        : "Pagamento em análise"
                }
            </h1>

            <p class="subtitulo card-status-subtitle">
                ${
                    temChallenge
                        ? "Seu banco precisa confirmar que é você quem está fazendo esta compra."
                        : "Estamos aguardando a confirmação do seu cartão."
                }
            </p>

            ${
                temChallenge
                    ? `
                    <div class="card-challenge-box">
                        <iframe
                            id="card-3ds-frame"
                            title="Confirmação de segurança do cartão"
                            src="${pagamentoCartao.challengeUrl}"
                            allow="payment *"
                        ></iframe>
                    </div>
                    `
                    : `
                    <div class="card-status-waiting">
                        <div class="spinner"></div>
                        <strong>
                            Aguardando o banco...
                        </strong>
                        <span>
                            Isso costuma levar apenas alguns segundos.
                        </span>
                    </div>
                    `
            }

            <div class="card-status-order">
                <span>Pedido</span>
                <strong>${estado.numeroPedido || "—"}</strong>
            </div>

            <p class="card-status-note">
                Não feche esta tela enquanto o pagamento estiver sendo confirmado.
            </p>

        </main>
    `;
}

async function copiarCodigoPix() {
    const campo = document.getElementById("pix-copia-cola");
    const codigo = campo?.value?.trim();

    if (!codigo) {
        mostrarMensagem("Código Pix não encontrado.");
        return;
    }

    let copiado = false;

    // Método moderno: funciona em HTTPS e em localhost.
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(codigo);
            copiado = true;
        } catch (erro) {
            console.warn("Clipboard API indisponível:", erro);
        }
    }

    // Fallback para acesso pelo IP da rede local no celular.
    if (!copiado) {
        const temporario = document.createElement("textarea");
        temporario.value = codigo;
        temporario.setAttribute("readonly", "");
        temporario.style.position = "fixed";
        temporario.style.top = "0";
        temporario.style.left = "-9999px";
        temporario.style.opacity = "0";

        document.body.appendChild(temporario);
        temporario.focus();
        temporario.select();
        temporario.setSelectionRange(0, temporario.value.length);

        try {
            copiado = document.execCommand("copy");
        } catch (erro) {
            console.warn("Fallback de cópia indisponível:", erro);
        }

        temporario.remove();
    }

    if (copiado) {
        mostrarMensagem("Código Pix copiado! 📋");
        return;
    }

    // Último recurso: deixa o código selecionado para cópia manual.
    campo.focus();
    campo.select();
    campo.setSelectionRange(0, campo.value.length);

    mostrarMensagem(
        "Não foi possível copiar automaticamente. O código Pix foi selecionado."
    );
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
                            onclick="copiarCodigoPix()"
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
