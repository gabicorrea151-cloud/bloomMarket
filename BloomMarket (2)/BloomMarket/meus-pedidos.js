// ==================================================
// BLOOMMARKET — MEUS PEDIDOS
// Resumo, abas (andamento, entregues, cancelados), busca e
// um cartão organizado para cada pedido: andamento, flores,
// detalhes da entrega, valores e ações (cancelar, avaliar,
// comprar de novo). Também acompanha pedido pelo número.
// ==================================================

document.addEventListener('DOMContentLoaded', () => {
    const B = window.Bloom;
    const { criar, moeda, api, aviso } = B;
    const $ = id => document.getElementById(id);

    const ETAPAS = [
        ['novo', 'Recebido', '🧾'],
        ['preparo', 'Em preparo', '💐'],
        ['entrega', 'A caminho', '🚚'],
        ['entregue', 'Entregue', '🏡']
    ];

    const ABAS = [
        ['todos', 'Todos', () => true],
        ['andamento', 'Em andamento', p => ['novo', 'preparo', 'entrega'].includes(p.status)],
        ['entregues', 'Entregues', p => p.status === 'entregue'],
        ['cancelados', 'Cancelados', p => p.status === 'cancelado']
    ];

    const areaLogado = $('mp-logado');
    const areaConvite = $('mp-convite');
    const lista = $('mp-lista');
    const resultadoRastreio = $('mp-resultado-rastreio');

    let pedidos = [];
    let abaAtual = 'todos';
    let ultimaBusca = null;

    // ==========================================
    // APOIO
    // ==========================================

    // "2026-10-24" -> "sexta, 24/10"
    function diaDaSemana(iso) {
        const data = new Date(`${iso}T12:00:00`);
        if (isNaN(data)) return B.dataBR(iso);
        return data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
    }

    function botao(texto, classe, acao) {
        const b = criar('button', classe, texto);
        b.type = 'button';
        b.addEventListener('click', acao);
        return b;
    }

    function blocoInfo(titulo, linhas) {
        const bloco = criar('div', 'mp-info');
        bloco.append(criar('span', 'mp-info-titulo', titulo));
        linhas.filter(Boolean).forEach(linha => bloco.append(criar('p', '', linha)));
        return bloco;
    }

    function linhaValor(rotulo, valor, classe) {
        const linha = criar('div', 'mp-valor' + (classe ? ` ${classe}` : ''));
        linha.append(criar('span', '', rotulo), criar('span', '', valor));
        return linha;
    }

    // ==========================================
    // CARTÃO DE UM PEDIDO
    // ==========================================

    function montarPedido(p) {
        const logado = B.cliente();
        const ehDono = Boolean(logado && logado.idCli === p.idCliente);
        const cartao = criar('article', `mp-pedido mp-status-${p.status}`);

        // ---------- Topo: loja, número, status e total ----------
        const topo = criar('header', 'mp-pedido-topo');

        const loja = criar('div', 'mp-loja');
        const avatar = criar('span', 'mp-avatar', p.loja.charAt(0).toUpperCase());
        avatar.setAttribute('aria-hidden', 'true');

        const nomes = criar('div');
        const linkLoja = criar('a', 'mp-loja-nome', p.loja);
        linkLoja.href = `loja.html?id=${p.idLoja}`;
        nomes.append(linkLoja, criar('small', '', `Pedido #${p.codigo} · ${B.dataHoraBR(p.dataPedido)}`));
        loja.append(avatar, nomes);

        const direita = criar('div', 'mp-topo-direita');
        direita.append(
            criar('span', `mp-selo mp-selo-${p.status}`, B.STATUS[p.status] || p.status),
            criar('strong', 'mp-total', moeda(p.total))
        );

        topo.append(loja, direita);
        cartao.append(topo);

        // ---------- Andamento ----------
        if (p.status === 'cancelado') {
            const quem = p.canceladoPor === 'cliente' ? 'por você' : 'pela loja';
            const avisoCancelado = criar('div', 'mp-cancelado');
            avisoCancelado.append(
                criar('strong', '', `Pedido cancelado ${quem}.`),
                criar('span', '', ' Se você já pagou, o valor volta em até 7 dias úteis.')
            );
            cartao.append(avisoCancelado);
        } else {
            const atual = ETAPAS.findIndex(([status]) => status === p.status);
            const progresso = criar('ol', 'mp-progresso');

            ETAPAS.forEach(([, nome, icone], i) => {
                const estado = i < atual ? 'feita' : i === atual ? 'atual' : 'futura';
                const etapa = criar('li', `mp-etapa ${estado}`);
                etapa.append(
                    criar('span', 'mp-bolinha', i < atual ? '✓' : icone),
                    criar('span', 'mp-etapa-nome', nome)
                );
                if (estado === 'atual') etapa.setAttribute('aria-current', 'step');
                progresso.append(etapa);
            });

            cartao.append(progresso);

            const previsao = p.status === 'entregue'
                ? `Entregue no dia ${B.dataBR(p.dataEntrega)}.`
                : `Entrega prevista: ${diaDaSemana(p.dataEntrega)}, ${B.PERIODOS[p.periodo] || p.periodo}.`;
            cartao.append(criar('p', 'mp-previsao', previsao));
        }

        // ---------- Flores do pedido ----------
        const itens = criar('ul', 'mp-itens');

        p.itens.forEach(item => {
            const linha = criar('li', 'mp-item');

            const foto = criar('img');
            const desenho = { produto: item.produto, cor: item.cor };
            foto.src = B.imagemDe(desenho);
            foto.alt = '';
            foto.loading = 'lazy';
            foto.addEventListener('error', () => { foto.src = B.imagemPadrao(desenho); }, { once: true });

            const texto = criar('div', 'mp-item-texto');
            texto.append(
                criar('strong', '', `Arranjo de ${item.produto}`),
                criar('small', '', `${item.cor} · ${item.tamanho} · ${item.quantidade} ${item.quantidade === 1 ? 'unidade' : 'unidades'}`)
            );

            linha.append(foto, texto, criar('span', 'mp-item-preco', moeda(item.subtotal)));
            itens.append(linha);
        });

        cartao.append(itens);

        // ---------- Detalhes (abre e fecha) ----------
        const detalhes = criar('details', 'mp-detalhes');
        detalhes.append(criar('summary', '', 'Ver entrega, pagamento e valores'));

        const grade = criar('div', 'mp-info-grade');
        grade.append(blocoInfo('📍 Entrega', [
            `${diaDaSemana(p.dataEntrega)}, ${B.PERIODOS[p.periodo] || p.periodo}`,
            `${p.rua}, ${p.numero}${p.complemento ? ' - ' + p.complemento : ''}`,
            `${p.bairro}, ${p.cidade} - ${p.estado}`,
            `CEP ${p.cep}`
        ]));

        grade.append(blocoInfo('💳 Pagamento', [p.detalhePagamento || p.formaPagamento]));

        if (p.destinatario || p.mensagem) {
            grade.append(blocoInfo('🎁 Presente', [
                p.destinatario ? `Para: ${p.destinatario}` : '',
                p.mensagem ? `“${p.mensagem}”` : ''
            ]));
        }

        const valores = criar('div', 'mp-valores');
        valores.append(linhaValor('Produtos', moeda(p.subtotal)));
        if (Number(p.desconto) > 0) {
            valores.append(linhaValor(`Desconto${p.cupom ? ` (${p.cupom})` : ''}`, `- ${moeda(p.desconto)}`, 'mp-valor-desconto'));
        }
        valores.append(
            linhaValor('Entrega', Number(p.taxaEntrega) > 0 ? moeda(p.taxaEntrega) : 'Grátis'),
            linhaValor('Total', moeda(p.total), 'mp-valor-total')
        );

        detalhes.append(grade, valores);
        cartao.append(detalhes);

        // ---------- Ações ----------
        const acoes = criar('footer', 'mp-acoes');
        let formulario = null;

        if (ehDono && p.status === 'novo') {
            acoes.append(botao('Cancelar pedido', 'mp-botao mp-botao-perigo', evento => cancelarPedido(p, evento.currentTarget)));
        }

        if (ehDono && p.status === 'entregue' && !p.avaliado) {
            formulario = montarFormAvaliacao(p);
            formulario.hidden = true;

            const avaliar = botao('★ Avaliar a loja', 'mp-botao mp-botao-destaque', () => {
                formulario.hidden = !formulario.hidden;
                avaliar.setAttribute('aria-expanded', String(!formulario.hidden));
            });
            acoes.append(avaliar);
        }

        if (p.avaliado) acoes.append(criar('span', 'mp-chip-avaliado', '✔ Você avaliou esta compra'));

        if (ehDono && p.status !== 'novo') {
            acoes.append(botao('Comprar de novo', 'mp-botao', evento => comprarDeNovo(p, evento.currentTarget)));
        }

        if (acoes.children.length) cartao.append(acoes);
        if (formulario) cartao.append(formulario);

        return cartao;
    }

    // ==========================================
    // CANCELAR
    // ==========================================

    async function cancelarPedido(p, botaoCancelar) {
        if (!confirm(`Cancelar o pedido #${p.codigo}?\n\nSe você já pagou, o valor volta em até 7 dias úteis.`)) return;

        botaoCancelar.disabled = true;

        try {
            await api(`/pedidos/${p.idPedido}/cancelar`, { metodo: 'POST', corpo: { idCliente: B.cliente().idCli } });
            aviso(`Pedido #${p.codigo} cancelado.`);
        } catch (erro) {
            aviso(erro.message, true);
        }

        atualizarTudo();
    }

    // ==========================================
    // COMPRAR DE NOVO (coloca as mesmas flores no carrinho)
    // ==========================================

    async function comprarDeNovo(p, botaoComprar) {
        botaoComprar.disabled = true;
        let colocados = 0;
        let faltaram = 0;

        for (const item of p.itens) {
            try {
                const v = await api(`/variacoes/${item.idVariacao}`);
                B.lembrar(v);
                const quantidade = Math.min(item.quantidade, Number(v.estoque) || 0);

                if (B.estaDisponivel(v) && quantidade > 0 && B.carrinho.adicionar(v, quantidade)) colocados++;
                else faltaram++;
            } catch (erro) {
                faltaram++;
            }
        }

        botaoComprar.disabled = false;

        if (colocados) {
            aviso(faltaram
                ? `${colocados} flor(es) no carrinho. ${faltaram} não estão disponíveis agora.`
                : 'As flores deste pedido estão no seu carrinho!');
            $('btn-ver-carrinho')?.click();
        } else {
            aviso('Essas flores não estão disponíveis agora.', true);
        }
    }

    // ==========================================
    // AVALIAR
    // ==========================================

    function montarFormAvaliacao(p) {
        const form = criar('form', 'mp-avaliar');
        form.noValidate = true;
        form.append(criar('h3', '', `Como foi comprar na ${p.loja}?`));

        let nota = 0;
        const grupo = criar('div', 'estrelas-escolha');
        grupo.setAttribute('role', 'group');
        grupo.setAttribute('aria-label', 'Escolha uma nota de 1 a 5');
        const estrelas = [];
        const pintar = valor => estrelas.forEach((e, i) => e.classList.toggle('marcada', i < valor));

        for (let valor = 1; valor <= 5; valor++) {
            const estrela = criar('button', 'estrela-escolha', '★');
            estrela.type = 'button';
            estrela.setAttribute('aria-label', `${valor} ${valor === 1 ? 'estrela' : 'estrelas'}`);
            estrela.addEventListener('click', () => { nota = valor; pintar(nota); });
            estrela.addEventListener('mouseenter', () => pintar(valor));
            estrela.addEventListener('mouseleave', () => pintar(nota));
            estrelas.push(estrela);
            grupo.append(estrela);
        }

        const comentario = criar('textarea');
        comentario.maxLength = 200;
        comentario.placeholder = 'Conte como foi (opcional): as flores chegaram bonitas? A entrega foi no horário?';
        comentario.setAttribute('aria-label', 'Comentário');

        const erro = criar('p', 'erro-form');
        erro.hidden = true;
        erro.setAttribute('role', 'alert');

        const enviar = criar('button', 'submit-btn', 'Enviar avaliação');
        enviar.type = 'submit';

        form.append(grupo, comentario, erro, enviar);

        form.addEventListener('submit', async evento => {
            evento.preventDefault();

            if (nota < 1) {
                erro.textContent = 'Escolha de 1 a 5 estrelas.';
                erro.hidden = false;
                return;
            }

            enviar.disabled = true;
            enviar.textContent = 'Enviando...';

            try {
                await api('/avaliacoes', {
                    metodo: 'POST',
                    corpo: { idCliente: B.cliente().idCli, idPedido: p.idPedido, nota, comentario: comentario.value.trim() }
                });
                aviso('Obrigado! Sua avaliação já aparece na página da loja.');
                atualizarTudo();
            } catch (falha) {
                erro.textContent = falha.message;
                erro.hidden = false;
                enviar.disabled = false;
                enviar.textContent = 'Enviar avaliação';
            }
        });

        return form;
    }

    // ==========================================
    // RESUMO, ABAS E LISTA
    // ==========================================

    function mostrarResumo() {
        const resumo = $('mp-resumo');
        const validos = pedidos.filter(p => p.status !== 'cancelado');
        const numeros = [
            ['🧾', 'Pedidos', pedidos.length],
            ['🚚', 'Em andamento', pedidos.filter(ABAS[1][2]).length],
            ['🏡', 'Entregues', pedidos.filter(ABAS[2][2]).length],
            ['💰', 'Total em compras', moeda(validos.reduce((s, p) => s + Number(p.total), 0))]
        ];

        resumo.replaceChildren();
        numeros.forEach(([icone, rotulo, valor]) => {
            const cartao = criar('div', 'mp-resumo-cartao');
            cartao.append(criar('span', 'mp-resumo-icone', icone), criar('strong', '', String(valor)), criar('span', '', rotulo));
            resumo.append(cartao);
        });
    }

    function mostrarAbas() {
        const abas = $('mp-abas');
        abas.replaceChildren();

        ABAS.forEach(([id, nome, filtro]) => {
            const quantidade = pedidos.filter(filtro).length;
            const aba = botao('', 'mp-aba' + (id === abaAtual ? ' ativa' : ''), () => {
                abaAtual = id;
                mostrarAbas();
                mostrarLista();
            });
            aba.setAttribute('role', 'tab');
            aba.setAttribute('aria-selected', String(id === abaAtual));
            aba.append(nome, criar('span', 'mp-aba-numero', String(quantidade)));
            abas.append(aba);
        });
    }

    function mostrarLista() {
        const filtro = ABAS.find(([id]) => id === abaAtual)[2];
        const termo = $('mp-busca').value.trim().toLowerCase();

        const visiveis = pedidos.filter(filtro).filter(p => !termo ||
            `${p.codigo} ${p.loja} ${p.itens.map(i => `${i.produto} ${i.cor}`).join(' ')}`.toLowerCase().includes(termo));

        lista.replaceChildren();

        if (!pedidos.length) {
            const vazio = criar('div', 'mp-vazio cartao-branco');
            const link = criar('a', 'botao-principal', 'Ver flores');
            link.href = 'floresdaminharegiao.html';
            vazio.append(criar('span', 'mp-vazio-icone', '🌷'), criar('h2', '', 'Você ainda não fez nenhum pedido'),
                criar('p', '', 'Quando você comprar, o pedido aparece aqui com cada etapa da entrega.'), link);
            lista.append(vazio);
            return;
        }

        if (!visiveis.length) {
            lista.append(criar('p', 'mp-nada', termo ? 'Nenhum pedido encontrado com essa busca.' : 'Nenhum pedido nesta aba.'));
            return;
        }

        visiveis.forEach(p => lista.append(montarPedido(p)));
    }

    async function mostrarMeusPedidos() {
        const quem = B.cliente();

        areaLogado.hidden = !quem;
        areaConvite.hidden = Boolean(quem);
        if (!quem) return;

        $('mp-saudacao').textContent = `Olá, ${quem.nome.split(' ')[0]}! Acompanhe suas compras, do preparo até a entrega.`;

        if (!pedidos.length) B.mostrarCarregando(lista, 'Carregando seus pedidos...');

        try {
            pedidos = await api(`/clientes/${quem.idCli}/pedidos`);
            mostrarResumo();
            mostrarAbas();
            mostrarLista();
        } catch (erro) {
            B.mostrarErro(lista, erro);
        }
    }

    $('mp-busca').addEventListener('input', mostrarLista);
    $('btn-mp-entrar')?.addEventListener('click', () => B.abrirLogin());

    // ==========================================
    // ACOMPANHAR PELO NÚMERO
    // ==========================================

    async function mostrarRastreio(codigo, email) {
        ultimaBusca = { codigo, email };
        B.mostrarCarregando(resultadoRastreio, 'Procurando pedido...');

        try {
            const pedido = await api(`/pedidos/rastrear${B.parametros({ codigo, email })}`);
            resultadoRastreio.replaceChildren(montarPedido(pedido));
        } catch (erro) {
            resultadoRastreio.replaceChildren(criar('p', 'erro-form', erro.message));
        }
    }

    $('form-rastrear')?.addEventListener('submit', evento => {
        evento.preventDefault();
        const codigo = $('rt-codigo').value.trim();
        const email = $('rt-email').value.trim();

        if (!codigo || !email) {
            resultadoRastreio.replaceChildren(criar('p', 'erro-form', 'Preencha o número do pedido e o e-mail.'));
            return;
        }

        mostrarRastreio(codigo, email);
    });

    const url = new URLSearchParams(window.location.search);
    if (url.get('codigo') && url.get('email')) {
        $('rt-codigo').value = url.get('codigo');
        $('rt-email').value = url.get('email');
        mostrarRastreio(url.get('codigo'), url.get('email'));
    }

    // ==========================================
    // ATUALIZAÇÃO
    // ==========================================

    function atualizarTudo() {
        mostrarMeusPedidos();
        if (ultimaBusca) mostrarRastreio(ultimaBusca.codigo, ultimaBusca.email);
    }

    document.addEventListener('bloom:conta', () => {
        pedidos = [];
        abaAtual = 'todos';
        mostrarMeusPedidos();
    });

    // A loja muda o status: confere de novo a cada 30 segundos
    // (não atualiza se a pessoa estiver escrevendo uma avaliação ou com detalhes abertos)
    setInterval(() => {
        const ocupado = document.querySelector('.mp-avaliar:not([hidden]), .mp-detalhes[open]');
        if (document.visibilityState === 'visible' && !ocupado) atualizarTudo();
    }, 30000);

    mostrarMeusPedidos();
});
