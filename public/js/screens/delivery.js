function entrega() {
    const e = estado.endereco;
    const unidade = estado.unidade || {};

    const enderecoLinha1 = [
        e.rua,
        e.numero
    ]
        .filter(Boolean)
        .join(", ");

    const complemento = e.complemento
        ? ` · ${e.complemento}`
        : "";

    const enderecoLinha2 = [
        e.bairro,
        e.cidade && e.uf
            ? `${e.cidade}/${e.uf}`
            : e.cidade || e.uf
    ]
        .filter(Boolean)
        .join(" · ");

    return `
        ${header("endereco")}

        <main class="entrega-mobile">

            <section class="entrega-secao entrega-secao-principal">
                <h1 class="entrega-titulo">Entrega</h1>

                <h2 class="entrega-secao-titulo">
                    Entregar no endereço
                </h2>

                <div class="entrega-endereco">
                    <div class="entrega-endereco-pin">
                        ${icon("pin", 22)}
                    </div>

                    <div class="entrega-endereco-dados">
                        <strong>
                            ${enderecoLinha1}${complemento}
                        </strong>

                        <span>
                            ${enderecoLinha2}
                        </span>
                    </div>

                    <button
                        type="button"
                        class="entrega-trocar"
                        onclick="abrirModalEnderecosEntrega()"
                    >
                        Trocar
                    </button>
                </div>
            </section>

            <div class="entrega-divisor"></div>

            <section class="entrega-secao">
                <h2 class="entrega-secao-titulo">
                    Opções de entrega
                </h2>

                <button
                    type="button"
                    class="entrega-opcao ativa"
                    aria-pressed="true"
                >
                    <div class="entrega-radio" aria-hidden="true">
                        <span></span>
                    </div>

                    <div class="entrega-opcao-conteudo">
                        <div class="entrega-opcao-linha">
                            <strong>Entrega padrão</strong>
                            <strong class="entrega-gratis">
                                Grátis
                            </strong>
                        </div>

                        <span class="entrega-tempo">
                            ${CONFIG.entrega.previsao}
                        </span>

                        <small>
                            ${unidade.nome || "Polo Norte"}
                            ${unidade.distancia
                                ? ` · ${unidade.distancia}`
                                : ""}
                        </small>
                    </div>
                </button>
            </section>

            <div class="entrega-espaco-footer"></div>
        </main>

        <div class="entrega-footer">
            <div class="entrega-footer-conteudo">
                <div class="entrega-total">
                    <span>Total</span>
                    <strong>${dinheiro(totalPedido())}</strong>
                </div>

                <button
                    type="button"
                    class="entrega-continuar"
                    onclick="ir('pagamento')"
                >
                    Continuar
                </button>
            </div>
        </div>
    `;
}
