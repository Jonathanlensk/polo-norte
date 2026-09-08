function entrega() {
    const e = estado.endereco;
    const unidade = estado.unidade || {};
    const cotacao = estado.cotacaoEntrega;
    const distancia = distanciaEntregaAtual();
    const taxa = taxaEntregaAtual();

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

    const entregaConteudo = estado.carregandoEntrega
        ? `
            <div class="entrega-calculando">
                <div class="spinner entrega-spinner"></div>
                <strong>Calculando sua rota...</strong>
                <span>Estamos verificando distância, taxa e previsão.</span>
            </div>
        `
        : estado.erroEntrega
            ? `
                <div class="entrega-erro">
                    <div class="entrega-erro-icone">
                        ${icon("info", 21)}
                    </div>

                    <div>
                        <strong>Não foi possível calcular a entrega</strong>
                        <span>${estado.erroEntrega}</span>
                    </div>
                </div>

                <button
                    type="button"
                    class="entrega-tentar-novamente"
                    onclick="carregarCotacaoEntrega()"
                >
                    Tentar novamente
                </button>
            `
            : cotacao
                ? `
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
                                    ${taxa > 0 ? dinheiro(taxa) : "Grátis"}
                                </strong>
                            </div>

                            <span class="entrega-tempo">
                                ${previsaoEntregaAtual()}
                            </span>

                            <small>
                                ${unidade.nome || "Polo Norte"}
                                ${distancia ? ` · ${distancia}` : ""}
                            </small>

                            <small class="entrega-rota-info">
                                ${cotacao.travelMinutes} min de trajeto estimado
                            </small>
                        </div>
                    </button>
                `
                : `
                    <button
                        type="button"
                        class="entrega-tentar-novamente"
                        onclick="carregarCotacaoEntrega()"
                    >
                        Calcular entrega
                    </button>
                `;

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

                ${entregaConteudo}

                ${
                    cotacao
                        ? `
                            <p class="entrega-regra-info">
                                A taxa é calculada automaticamente pela distância da rota entre a unidade e seu endereço.
                            </p>
                        `
                        : ""
                }
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
                    ${!cotacao || estado.carregandoEntrega || estado.erroEntrega ? "disabled" : ""}
                >
                    Continuar
                </button>
            </div>
        </div>
    `;
}
