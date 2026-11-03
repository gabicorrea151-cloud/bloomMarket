// ==================================================
// BLOOMMARKET — MEUS PEDIDOS
// Pedidos do cliente vindos do back-end: andamento,
// cancelar (enquanto "Recebido") e avaliar (depois de entregue).
// Também dá para acompanhar um pedido pelo número, sem entrar.
// ==================================================


document.addEventListener('DOMContentLoaded', () => {
    const B = window.Bloom;
    const { criar, moeda, api, aviso } = B;


    const ETAPAS = [
        ['novo', 'Pedido recebido'],
        ['preparo', 'Em preparo'],
        ['entrega', 'Saiu para entrega'],
        ['entregue', 'Entregue']
    ];


    const areaLogado = document.getElementById('mp-logado');
    const areaConvite = document.getElementById('mp-convite');
    const lista = document.getElementById('mp-lista');
    const saudacao = document.getElementById('mp-saudacao');
    const resultadoRastreio = document.getElementById('mp-resultado-rastreio');


    let ultimaBusca = null;


    // ==========================================
    // CARTÃO DE UM PEDIDO
    // ==========================================


    function montarPedido(p) {
        const cartao = criar('article', 'pedido-cliente');


        // Topo
        const topo = criar('div', 'pedido-cliente-topo');
        const cabecalho = criar('div');
        cabecalho.append(criar('h2', '', `Pedido #${p.codigo}`));


        const meta = criar('p', 'meta');
        const linkLoja = criar('a', 'link-loja', p.loja);
        linkLoja.href = `loja.html?id=${p.idLoja}`;
        meta.append(`Feito em ${B.dataHoraBR(p.dataPedido)}, loja `, linkLoja);
        cabecalho.append(meta);


        topo.append(cabecalho, criar('span', `etiqueta status-${p.status}`, B.STATUS[p.status] || p.status));
        cartao.append(topo);


        // Linha do tempo
        if (p.status === 'cancelado') {
            const quem = p.canceladoPor === 'cliente' ? 'por você' : 'pela loja';
            cartao.append(criar('p', 'aviso-cancelado',
                `Este pedido foi cancelado ${quem}. Se você já pagou, o valor é devolvido em até 7 dias úteis.`));
        } else {
            const atual = ETAPAS.findIndex(([status]) => status === p.status);
            const linha = criar('ol', 'linha-tempo');


            ETAPAS.forEach(([, titulo], indice) => {
                let estado = 'futura';
                if (indice < atual) estado = 'feita';
                if (indice === atual) estado = 'atual';


                const passo = criar('li', `etapa ${estado}`);
                passo.append(criar('span', 'bolinha'), criar('span', 'nome-etapa', titulo));
                if (estado === 'atual') passo.setAttribute('aria-current', 'step');
                linha.append(passo);
            });


            cartao.append(linha);
        }


        // Entrega e pagamento
        const detalhes = criar('div', 'pedido-detalhes');


        const entrega = criar('div', 'detalhe-pedido');
        entrega.append(
            criar('span', 'rotulo-detalhe', 'Entrega'),
            criar('p', '', `${B.dataBR(p.dataEntrega)}, ${B.PERIODOS[p.periodo] || p.periodo}`),
            criar('p', '', `${p.rua}, p.numero{p.complemento ? ' - ' + p.complemento : ''}`),
            criar('p', '', `${p.bairro}, ${p.cidade} - ${p.estado}`)
        );
        if (p.destinatario) entrega.append(criar('p', '', `Para: ${p.destinatario}`));
        if (p.mensagem) entrega.append(criar('p', '', `💌 “${p.mensagem}”`));


        const pagamento = criar('div', 'detalhe-pedido');
        pagamento.append(
            criar('span', 'rotulo-detalhe', 'Pagamento'),
            criar('p', '', p.detalhePagamento || p.formaPagamento)
        );


        detalhes.append(entrega, pagamento);
        cartao.append(detalhes);


        // Itens e valores
        const itens = criar('ul', 'pedido-itens');


        p.itens.forEach(item => {
            const linha = criar('li');
            linha.append(
                criar('span', '', `${item.quantidade}x Arranjo de item.produto({item.cor}, ${item.tamanho})`),
                criar('span', '', moeda(item.subtotal))
            );
            itens.append(linha);
        });


        if (Number(p.desconto) > 0) {
            const linha = criar('li', 'linha-frete');
            linha.append(criar('span', '', `Desconto${p.cupom ? ` (${p.cupom})` : ''}`), criar('span', '', `- ${moeda(p.desconto)}`));
            itens.append(linha);
        }


        const frete = criar('li', 'linha-frete');
        frete.append(criar('span', '', 'Entrega'), criar('span', '', Number(p.taxaEntrega) > 0 ? moeda(p.taxaEntrega) : 'Grátis'));
        itens.append(frete);


        cartao.append(itens);


        // Rodapé: total e ações
        const rodape = criar('div', 'pedido-rodape');
        rodape.append(criar('strong', '', `Total: ${moeda(p.total)}`));


        const acoes = criar('div', 'acoes-pedido-cliente');
        const logado = B.cliente();
        const ehDono = logado && logado.idCli === p.idCliente;


        if (ehDono && p.status === 'novo') {
            const cancelar = criar('button', 'botao-cancelar-pedido', 'Cancelar pedido');
            cancelar.type = 'button';
            cancelar.addEventListener('click', () => cancelarPedido(p, cancelar));
            acoes.append(cancelar);
        }


        let formulario = null;


        if (ehDono && p.status === 'entregue' && !p.avaliado) {
            const avaliar = criar('button', 'botao-contorno', '★ Avaliar esta compra');
            avaliar.type = 'button';
            formulario = montarFormAvaliacao(p);
            formulario.hidden = true;


            avaliar.addEventListener('click', () => {
                formulario.hidden = !formulario.hidden;
                avaliar.setAttribute('aria-expanded', String(!formulario.hidden));
            });
            acoes.append(avaliar);
        }


        if (p.avaliado) acoes.append(criar('span', 'selo-verificada', '✔ Você já avaliou'));


        rodape.append(acoes);
        cartao.append(rodape);
        if (formulario) cartao.append(formulario);


        return cartao;
    }


    // ==========================================
    // CANCELAR
    // ==========================================


    async function cancelarPedido(p, botao) {
        if (!confirm(`Cancelar o pedido #${p.codigo}?\n\nSe você já pagou, o valor é devolvido em até 7 dias úteis.`)) return;


        botao.disabled = true;


        try {
            await api(`/pedidos/${p.idPedido}/cancelar`, { metodo: 'POST', corpo: { idCliente: B.cliente().idCli } });
            aviso(`Pedido #${p.codigo} cancelado.`);
            atualizarTudo();
        } catch (erro) {
            aviso(erro.message, true);
            botao.disabled = false;
            atualizarTudo();
        }
    }


    // ==========================================
    // AVALIAR
    // ==========================================


    function montarFormAvaliacao(p) {
        const form = criar('form', 'form-avaliar');
        form.noValidate = true;
        form.append(criar('h3', '', `Como foi comprar na ${p.loja}?`));


        let nota = 0;
        const grupo = criar('div', 'estrelas-escolha');
        grupo.setAttribute('role', 'group');
        grupo.setAttribute('aria-label', 'Escolha uma nota de 1 a 5');
        const botoes = [];


        const pintar = valor => botoes.forEach((b, i) => b.classList.toggle('marcada', i < valor));


        for (let valor = 1; valor <= 5; valor++) {
            const estrela = criar('button', 'estrela-escolha', '★');
            estrela.type = 'button';
            estrela.setAttribute('aria-label', `${valor} ${valor === 1 ? 'estrela' : 'estrelas'}`);
            estrela.addEventListener('click', () => { nota = valor; pintar(nota); });
            estrela.addEventListener('mouseenter', () => pintar(valor));
            estrela.addEventListener('mouseleave', () => pintar(nota));
            botoes.push(estrela);
            grupo.append(estrela);
        }


        const rotulo = criar('label', 'rotulo-detalhe', 'Comentário (opcional)');
        const comentario = criar('textarea');
        comentario.id = `comentario-${p.idPedido}`;
        comentario.maxLength = 200;
        comentario.placeholder = 'As flores chegaram bonitas? A entrega foi no horário?';
        rotulo.htmlFor = comentario.id;


        const erro = criar('p', 'erro-form');
        erro.hidden = true;
        erro.setAttribute('role', 'alert');


        const enviar = criar('button', 'submit-btn', 'Enviar avaliação');
        enviar.type = 'submit';


        form.append(grupo, rotulo, comentario, erro, enviar);


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
    // LISTA DO CLIENTE LOGADO
    // ==========================================


    async function mostrarMeusPedidos() {
        const quem = B.cliente();


        if (areaLogado) areaLogado.hidden = !quem;
        if (areaConvite) areaConvite.hidden = Boolean(quem);
        if (!quem || !lista) return;


        if (saudacao) saudacao.textContent = `Olá, ${quem.nome.split(' ')[0]}! Estes são os seus pedidos.`;


        if (!lista.children.length) B.mostrarCarregando(lista, 'Carregando seus pedidos...');


        try {
            const pedidos = await api(`/clientes/${quem.idCli}/pedidos`);
            lista.replaceChildren();


            if (!pedidos.length) {
                const vazio = criar('div', 'lista-vazia');
                const link = criar('a', 'botao-principal', 'Ver flores');
                link.href = 'floresdaminharegiao.html';
                vazio.append(criar('p', '', 'Você ainda não fez nenhum pedido.'), link);
                lista.append(vazio);
                return;
            }


            pedidos.forEach(p => lista.append(montarPedido(p)));
        } catch (erro) {
            B.mostrarErro(lista, erro);
        }
    }


    document.getElementById('btn-mp-entrar')?.addEventListener('click', () => B.abrirLogin());


    // ==========================================
    // ACOMPANHAR PELO NÚMERO (SEM CONTA)
    // ==========================================


    async function mostrarRastreio(codigo, email) {
        if (!resultadoRastreio) return;
        ultimaBusca = { codigo, email };
        B.mostrarCarregando(resultadoRastreio, 'Procurando pedido...');


        try {
            const pedido = await api(`/pedidos/rastrear${B.parametros({ codigo, email })}`);
            resultadoRastreio.replaceChildren(montarPedido(pedido));
        } catch (erro) {
            resultadoRastreio.replaceChildren(criar('p', 'erro-form', erro.message));
        }
    }


    document.getElementById('form-rastrear')?.addEventListener('submit', evento => {
        evento.preventDefault();
        const codigo = document.getElementById('rt-codigo').value.trim();
        const email = document.getElementById('rt-email').value.trim();


        if (!codigo || !email) {
            resultadoRastreio?.replaceChildren(criar('p', 'erro-form', 'Preencha o número do pedido e o e-mail.'));
            return;
        }


        mostrarRastreio(codigo, email);
    });


    // Vindo do checkout: meus-pedidos.html?codigo=ABC123&email=...
    const url = new URLSearchParams(window.location.search);
    if (url.get('codigo') && url.get('email')) {
        const campoCodigo = document.getElementById('rt-codigo');
        const campoEmail = document.getElementById('rt-email');
        if (campoCodigo) campoCodigo.value = url.get('codigo');
        if (campoEmail) campoEmail.value = url.get('email');
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
        if (lista) lista.replaceChildren();
        mostrarMeusPedidos();
    });


    // A loja pode mudar o status: confere de novo a cada 30 segundos
    setInterval(() => {
        if (document.visibilityState === 'visible' && !document.querySelector('.form-avaliar:not([hidden])')) {
            atualizarTudo();
        }
    }, 30000);


    mostrarMeusPedidos();
});



