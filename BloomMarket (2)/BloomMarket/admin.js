// ==================================================
// BLOOMMARKET — PAINEL DO ADMINISTRADOR
// Tudo vem do back-end (rotas /api/admin). Depois do login,
// cada pedido leva o cabeçalho X-Admin-Token.
// Precisa do script.js carregado antes (objeto Bloom).
// ==================================================

document.addEventListener('DOMContentLoaded', () => {
    const B = window.Bloom;
    const { criar, moeda, aviso } = B;
    const $ = id => document.getElementById(id);

    const CHAVE_ADMIN = 'adminBloomMarket';

    // ==========================================
    // 1. SESSÃO DO ADMINISTRADOR
    // ==========================================

    function sessao() {
        try {
            return JSON.parse(localStorage.getItem(CHAVE_ADMIN));
        } catch (erro) {
            return null;
        }
    }

    function sairDoPainel(mensagem) {
        localStorage.removeItem(CHAVE_ADMIN);
        mostrarAcesso();
        if (mensagem) erroLogin(mensagem);
    }

    // Chama a API já com o token do administrador
    async function apiAdmin(caminho, opcoes = {}) {
        const atual = sessao();

        try {
            return await B.api('/admin' + caminho, {
                ...opcoes,
                cabecalhos: { 'X-Admin-Token': atual?.token || '' }
            });
        } catch (erro) {
            if (erro.status === 401 || erro.status === 403) {
                sairDoPainel('Sua sessão terminou. Entre de novo.');
            }
            throw erro;
        }
    }

    // ==========================================
    // 2. APOIO
    // ==========================================

    function erroLogin(mensagem) {
        const caixa = $('erro-login-admin');
        caixa.textContent = mensagem || '';
        caixa.hidden = !mensagem;
    }

    function botaoPequeno(texto, acao, extra) {
        const botao = criar('button', 'botao-pequeno' + (extra ? ` ${extra}` : ''), texto);
        botao.type = 'button';
        botao.addEventListener('click', acao);
        return botao;
    }

    function itemAdmin(tituloTexto, etiqueta, numeros, acoes) {
        const item = criar('article', 'item-admin');
        const info = criar('div', 'info-item-admin');

        const titulo = criar('div', 'titulo-item-admin');
        titulo.append(criar('h3', '', tituloTexto));
        if (etiqueta) titulo.append(etiqueta);

        const linha = criar('div', 'numeros-item');
        numeros.filter(Boolean).forEach(n => linha.append(n));

        info.append(titulo, linha);
        item.append(info);

        if (acoes?.length) {
            const caixa = criar('div', 'acoes-item');
            acoes.forEach(a => caixa.append(a));
            item.append(caixa);
        }

        return item;
    }

    function vazio(lista, texto) {
        lista.replaceChildren(criar('p', 'lista-vazia', texto));
    }

    function diaLocal(data) {
        const d = new Date(data);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    // Dados que várias seções usam
    let lojas = [];
    let pedidos = [];
    let clientes = [];
    let cupons = [];
    let avaliacoes = [];

    // ==========================================
    // 3. LOGIN E SAÍDA
    // ==========================================

    function mostrarAcesso() {
        $('admin-acesso').hidden = false;
        $('admin-painel').hidden = true;
        $('menu-admin').hidden = true;
        $('btn-sair-admin').hidden = true;
        $('btn-voltar-loja-admin').hidden = false;
        clearInterval(timer);
    }

    function mostrarPainel() {
        $('admin-acesso').hidden = true;
        $('admin-painel').hidden = false;
        $('menu-admin').hidden = false;
        $('btn-sair-admin').hidden = false;
        $('btn-voltar-loja-admin').hidden = true;
        trocarSecao('visao');
        atualizarTudo();

        clearInterval(timer);
        timer = setInterval(() => {
            if (document.visibilityState === 'visible') atualizarTudo();
        }, 30000);
    }

    let timer = null;

    $('form-login-admin').addEventListener('submit', async evento => {
        evento.preventDefault();
        const email = $('adm-email').value.trim();
        const senha = $('adm-senha').value;

        if (!email || !senha) return erroLogin('Preencha o e-mail e a senha.');

        const botao = evento.target.querySelector('button[type="submit"]');
        botao.disabled = true;

        try {
            const dados = await B.api('/admin/login', { metodo: 'POST', corpo: { email, senha } });
            localStorage.setItem(CHAVE_ADMIN, JSON.stringify(dados));
            evento.target.reset();
            erroLogin('');
            mostrarPainel();
            aviso('Bem-vindo(a) ao painel!');
        } catch (erro) {
            erroLogin(erro.message);
        } finally {
            botao.disabled = false;
        }
    });

    $('btn-sair-admin').addEventListener('click', () => {
        sairDoPainel();
        aviso('Você saiu do painel.');
    });

    // ==========================================
    // 4. MENU
    // ==========================================

    function trocarSecao(nome) {
        document.querySelectorAll('[data-menu-admin]').forEach(botao => {
            const ativo = botao.dataset.menuAdmin === nome;
            botao.classList.toggle('ativo', ativo);
            if (ativo) botao.setAttribute('aria-current', 'page');
            else botao.removeAttribute('aria-current');
        });

        document.querySelectorAll('[data-secao-admin]').forEach(secao => {
            secao.hidden = secao.dataset.secaoAdmin !== nome;
        });
    }

    document.querySelectorAll('[data-menu-admin]').forEach(botao => {
        botao.addEventListener('click', () => {
            trocarSecao(botao.dataset.menuAdmin);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // ==========================================
    // 5. CARREGAR TUDO
    // ==========================================

    async function atualizarTudo() {
        try {
            const [resumo, listaLojas, listaPedidos, listaClientes, listaCupons, listaAvaliacoes] = await Promise.all([
                apiAdmin('/resumo'),
                apiAdmin('/lojas'),
                apiAdmin('/pedidos'),
                apiAdmin('/clientes'),
                apiAdmin('/cupons'),
                B.api('/avaliacoes')
            ]);

            lojas = listaLojas;
            pedidos = listaPedidos;
            clientes = listaClientes;
            cupons = listaCupons;
            avaliacoes = listaAvaliacoes;

            mostrarResumo(resumo);
            mostrarGraficos();
            mostrarLojas();
            preencherFiltroLojas();
            mostrarPedidos();
            mostrarClientes();
            mostrarCupons();
            mostrarAvaliacoes();
        } catch (erro) {
            if (erro.status !== 401 && erro.status !== 403) aviso(erro.message, true);
        }
    }

    // ==========================================
    // 6. VISÃO GERAL
    // ==========================================

    function mostrarResumo(r) {
        $('adm-faturamento').textContent = moeda(r.faturamento);
        $('adm-comissao').textContent = moeda(r.comissao);
        $('adm-pedidos').textContent = r.pedidos;
        $('adm-ticket').textContent = moeda(r.ticketMedio);
        $('adm-lojas').textContent = r.lojasAtivas;
        $('adm-clientes').textContent = r.clientes;
        $('adm-abertos').textContent = r.pedidosEmAndamento;
        $('adm-cancelados').textContent = r.pedidosCancelados;
    }

    function mostrarGraficos() {
        const validos = pedidos.filter(p => p.status !== 'cancelado');

        // ---------- Vendas dos últimos 7 dias (colunas) ----------
        const graficoDias = $('grafico-dias');
        graficoDias.replaceChildren();

        const dias = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dias.push(diaLocal(d));
        }

        const totais = dias.map(dia => validos
            .filter(p => diaLocal(p.dataPedido) === dia)
            .reduce((soma, p) => soma + Number(p.total), 0));
        const maior = Math.max(...totais, 1);

        dias.forEach((dia, i) => {
            const coluna = criar('div', 'coluna');
            const barra = criar('span', 'coluna-barra');
            barra.style.height = `${Math.max(2, (totais[i] / maior) * 100)}%`;
            barra.title = `${moeda(totais[i])} em ${B.dataBR(dia)}`;

            const [, mes, diaNumero] = dia.split('-');
            coluna.append(
                criar('span', 'coluna-valor', totais[i] > 0 ? moeda(totais[i]).replace(',00', '') : ''),
                barra,
                criar('span', 'coluna-rotulo', i === 6 ? 'Hoje' : `${diaNumero}/${mes}`)
            );
            graficoDias.append(coluna);
        });

        // ---------- Vendas por região (barras) ----------
        const graficoRegioes = $('grafico-polos');
        graficoRegioes.replaceChildren();

        const regiaoDaLoja = Object.fromEntries(lojas.map(l => [l.idLoja, l.localizacao]));
        const porRegiao = {};
        validos.forEach(p => {
            const regiao = regiaoDaLoja[p.idLoja] || 'Outras';
            porRegiao[regiao] = (porRegiao[regiao] || 0) + Number(p.total);
        });

        const regioes = Object.entries(porRegiao).sort((a, b) => b[1] - a[1]);
        const maiorRegiao = Math.max(...regioes.map(r => r[1]), 1);

        if (!regioes.length) {
            graficoRegioes.append(criar('p', 'lista-vazia', 'Nenhuma venda ainda.'));
        }

        regioes.forEach(([regiao, valor]) => {
            const linha = criar('div', 'barra-linha');
            const trilho = criar('div', 'barra-trilho');
            const cheia = criar('div', 'barra-preenchida');
            cheia.style.width = `${(valor / maiorRegiao) * 100}%`;
            trilho.append(cheia);
            linha.append(criar('span', 'barra-nome', regiao), trilho, criar('strong', 'barra-valor', moeda(valor)));
            graficoRegioes.append(linha);
        });

        // ---------- Lojas que mais vendem ----------
        const ranking = $('top-lojas');
        ranking.replaceChildren();

        const porLoja = {};
        validos.forEach(p => { porLoja[p.loja] = (porLoja[p.loja] || 0) + Number(p.total); });
        const top = Object.entries(porLoja).sort((a, b) => b[1] - a[1]).slice(0, 5);

        if (!top.length) ranking.append(criar('li', 'lista-vazia', 'Nenhuma venda ainda.'));

        top.forEach(([loja, total], posicao) => {
            const item = criar('li');
            item.append(
                criar('span', 'posicao-ranking', `${posicao + 1}º`),
                criar('span', 'nome-ranking', loja),
                criar('strong', '', moeda(total))
            );
            ranking.append(item);
        });
    }

    // ==========================================
    // 7. LOJAS
    // ==========================================

    function mostrarLojas() {
        const lista = $('lista-lojas-admin');
        const termo = $('busca-lojas').value.trim().toLowerCase();

        const filtradas = lojas.filter(l =>
            `${l.nome} ${l.cidade} ${l.email} ${l.localizacao}`.toLowerCase().includes(termo));

        if (!filtradas.length) return vazio(lista, termo ? 'Nenhuma loja encontrada.' : 'Nenhuma loja cadastrada.');
        lista.replaceChildren();

        filtradas.forEach(loja => {
            const vendas = pedidos
                .filter(p => p.idLoja === loja.idLoja && p.status !== 'cancelado')
                .reduce((soma, p) => soma + Number(p.total), 0);

            const etiqueta = criar('span', `etiqueta ${loja.bloqueada ? 'pausado' : 'ativo'}`, loja.bloqueada ? 'Bloqueada' : 'Ativa');

            const link = criar('a', 'link-loja', 'Ver no site');
            link.href = `loja.html?id=${loja.idLoja}`;
            link.target = '_blank';

            lista.append(itemAdmin(loja.nome, etiqueta, [
                criar('span', '', `${loja.localizacao}, ${loja.cidade}`),
                criar('span', '', `Responsável: ${loja.responsavel}`),
                criar('span', '', loja.email),
                criar('span', '', loja.telefone),
                criar('span', '', `${loja.produtosNaVitrine} produto(s) na vitrine`),
                criar('span', '', loja.notaMedia ? `★ ${String(loja.notaMedia).replace('.', ',')} (${loja.avaliacoes})` : 'Sem avaliações'),
                criar('strong', '', `Vendas: ${moeda(vendas)}`)
            ], [
                link,
                botaoPequeno(loja.bloqueada ? 'Desbloquear' : 'Bloquear', () => alternarBloqueio(loja), loja.bloqueada ? '' : 'perigo')
            ]));
        });
    }

    async function alternarBloqueio(loja) {
        const bloquear = !loja.bloqueada;

        if (bloquear && !confirm(`Bloquear a loja "${loja.nome}"?\n\nOs produtos saem da vitrine e a loja não consegue entrar no painel.`)) return;

        try {
            await apiAdmin(`/lojas/${loja.idLoja}/bloqueio`, { metodo: 'PUT', corpo: { bloqueada: bloquear } });
            aviso(bloquear ? `${loja.nome} foi bloqueada.` : `${loja.nome} foi desbloqueada.`);
            atualizarTudo();
        } catch (erro) {
            aviso(erro.message, true);
        }
    }

    $('busca-lojas').addEventListener('input', mostrarLojas);

    // ==========================================
    // 8. PEDIDOS
    // ==========================================

    const filtroStatus = $('filtro-status-admin');
    const filtroLoja = $('filtro-loja-admin');
    const buscaPedidos = $('busca-pedidos-admin');

    function preencherFiltroLojas() {
        const escolhida = filtroLoja.value;
        filtroLoja.replaceChildren(new Option('Todas as lojas', ''));
        lojas.forEach(l => filtroLoja.append(new Option(l.nome, l.idLoja)));
        filtroLoja.value = escolhida;
    }

    function mostrarPedidos() {
        const lista = $('lista-pedidos-admin');
        const termo = buscaPedidos.value.trim().toLowerCase();

        const filtrados = pedidos.filter(p =>
            (!filtroStatus.value || p.status === filtroStatus.value) &&
            (!filtroLoja.value || String(p.idLoja) === filtroLoja.value) &&
            (!termo || `${p.codigo} ${p.cliente}`.toLowerCase().includes(termo)));

        $('contador-pedidos-admin').textContent =
            `${filtrados.length} de ${pedidos.length} pedido(s). Atualiza sozinho a cada 30 segundos.`;

        if (!filtrados.length) return vazio(lista, 'Nenhum pedido encontrado com esses filtros.');
        lista.replaceChildren();

        filtrados.forEach(p => {
            const quantidade = p.itens.reduce((s, i) => s + i.quantidade, 0);
            const etiqueta = criar('span', `etiqueta status-${p.status}`, B.STATUS[p.status] || p.status);

            const item = itemAdmin(`Pedido #${p.codigo}`, etiqueta, [
                criar('span', '', B.dataHoraBR(p.dataPedido)),
                criar('span', '', `Loja: ${p.loja}`),
                criar('span', '', `Cliente: ${p.cliente}`),
                criar('span', '', `${quantidade} item(ns)`),
                criar('span', '', p.detalhePagamento || p.formaPagamento),
                p.cupom ? criar('span', '', `Cupom ${p.cupom}`) : null,
                criar('strong', '', moeda(p.total))
            ]);

            item.querySelector('.info-item-admin').append(criar('p', 'itens-resumidos',
                p.itens.map(i => `${i.quantidade}x ${i.produto} ${i.cor} (${i.tamanho})`).join(', ')));

            lista.append(item);
        });
    }

    [filtroStatus, filtroLoja].forEach(campo => campo.addEventListener('change', mostrarPedidos));
    buscaPedidos.addEventListener('input', mostrarPedidos);

    // ==========================================
    // 9. CLIENTES
    // ==========================================

    function mostrarClientes() {
        const lista = $('lista-clientes-admin');
        $('contador-clientes-admin').textContent = `${clientes.length} pessoa(s) com conta no BloomMarket.`;

        if (!clientes.length) return vazio(lista, 'Nenhum cliente cadastrado ainda.');
        lista.replaceChildren();

        clientes.forEach(c => {
            lista.append(itemAdmin(c.nome, null, [
                criar('span', '', c.email),
                criar('span', '', c.telefone),
                criar('span', '', c.cidade ? `${c.cidade} - ${c.estado}` : 'Cidade não informada'),
                criar('span', '', `Cliente desde ${B.dataBR(c.dataCadastro)}`),
                criar('span', '', `${c.pedidos} pedido(s)`),
                criar('strong', '', `Gastou ${moeda(c.gasto)}`)
            ]));
        });
    }

    // ==========================================
    // 10. CUPONS
    // ==========================================

    const formCupom = $('form-cupom-admin');
    const campoTipo = $('cp-tipo');

    function ajustarCampoValor() {
        $('grupo-cp-valor').hidden = campoTipo.value === 'frete';
        $('rotulo-cp-valor').textContent = campoTipo.value === 'porcentagem' ? 'Desconto (%)' : 'Desconto (R$)';
    }

    campoTipo.addEventListener('change', ajustarCampoValor);
    ajustarCampoValor();

    $('cp-codigo').addEventListener('input', evento => {
        evento.target.value = evento.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });

    const numero = texto => Number(String(texto || '0').replace(',', '.'));

    formCupom.addEventListener('submit', async evento => {
        evento.preventDefault();
        const erro = $('erro-cupom-admin');
        const mostrarErro = mensagem => { erro.textContent = mensagem; erro.hidden = !mensagem; };

        const tipo = campoTipo.value;
        const valor = tipo === 'frete' ? 0 : numero($('cp-valor').value);

        const corpo = {
            codigo: $('cp-codigo').value.trim(),
            tipo,
            valor,
            minimo: numero($('cp-minimo').value),
            validade: $('cp-validade').value || null,
            limiteUsos: Number($('cp-limite').value) || 0,
            primeiraCompra: $('cp-primeira').checked
        };

        if (corpo.codigo.length < 3) return mostrarErro('O código precisa ter pelo menos 3 letras ou números.');
        if (tipo !== 'frete' && !(valor > 0)) return mostrarErro('Digite o valor do desconto.');
        if (tipo === 'porcentagem' && valor > 90) return mostrarErro('O desconto em porcentagem pode ser de no máximo 90%.');

        try {
            await apiAdmin('/cupons', { metodo: 'POST', corpo });
            formCupom.reset();
            ajustarCampoValor();
            mostrarErro('');
            aviso(`Cupom ${corpo.codigo} criado! Ele já funciona no checkout.`);
            atualizarTudo();
        } catch (falha) {
            mostrarErro(falha.message);
        }
    });

    function mostrarCupons() {
        const lista = $('lista-cupons-admin');
        if (!cupons.length) return vazio(lista, 'Nenhum cupom cadastrado.');
        lista.replaceChildren();

        const classes = { Ativo: 'ativo', Pausado: 'pausado', Expirado: 'sem-estoque', Esgotado: 'sem-estoque' };

        cupons.forEach(c => {
            const etiqueta = criar('span', `etiqueta ${classes[c.situacao] || ''}`, c.situacao);

            lista.append(itemAdmin(c.codigo, etiqueta, [
                criar('strong', '', c.descricao),
                criar('span', '', Number(c.minimo) > 0 ? `Pedido mínimo: ${moeda(c.minimo)}` : 'Sem pedido mínimo'),
                criar('span', '', c.validade ? `Até ${B.dataBR(c.validade)}` : 'Sem data de validade'),
                criar('span', '', c.limiteUsos > 0 ? `Usado ${c.usos} de ${c.limiteUsos} vezes` : `Usado ${c.usos} vez(es)`),
                c.primeiraCompra ? criar('span', '', 'Só na primeira compra') : null
            ], [
                botaoPequeno(c.ativo ? 'Pausar' : 'Ativar', () => alternarCupom(c)),
                botaoPequeno('Excluir', () => excluirCupom(c), 'perigo')
            ]));
        });
    }

    async function alternarCupom(c) {
        try {
            await apiAdmin(`/cupons/${encodeURIComponent(c.codigo)}/ativo`, { metodo: 'PUT' });
            aviso(c.ativo ? `Cupom ${c.codigo} pausado.` : `Cupom ${c.codigo} ativado.`);
            atualizarTudo();
        } catch (erro) {
            aviso(erro.message, true);
        }
    }

    async function excluirCupom(c) {
        if (!confirm(`Excluir o cupom ${c.codigo}?`)) return;

        try {
            await apiAdmin(`/cupons/${encodeURIComponent(c.codigo)}`, { metodo: 'DELETE' });
            aviso(`Cupom ${c.codigo} excluído.`);
            atualizarTudo();
        } catch (erro) {
            aviso(erro.message, true);
        }
    }

    // ==========================================
    // 11. AVALIAÇÕES DAS LOJAS
    // ==========================================

    function mostrarAvaliacoes() {
        const lista = $('lista-avaliacoes-admin');

        if (!avaliacoes.length) {
            $('media-avaliacoes').textContent = 'Nenhuma avaliação ainda.';
            return vazio(lista, 'Quando um cliente avaliar um pedido entregue, a avaliação aparece aqui.');
        }

        const media = avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length;
        $('media-avaliacoes').textContent =
            `Nota média ${media.toFixed(1).replace('.', ',')} de 5, em ${avaliacoes.length} avaliação(ões) de compras verificadas.`;

        lista.replaceChildren();

        avaliacoes.forEach(a => {
            const etiqueta = criar('span', 'estrelas-admin', B.estrelas(a.nota));

            const item = itemAdmin(a.cliente, etiqueta, [
                criar('span', '', `Loja: ${a.loja}`),
                criar('span', '', `Pedido #${a.codigoPedido}`),
                criar('span', '', B.dataBR(a.data)),
                criar('span', '', a.produtos)
            ], [
                botaoPequeno('Excluir', () => excluirAvaliacao(a), 'perigo')
            ]);

            if (a.comentario) {
                item.querySelector('.info-item-admin').append(criar('p', 'comentario-admin', `“${a.comentario}”`));
            }

            lista.append(item);
        });
    }

    async function excluirAvaliacao(a) {
        if (!confirm(`Excluir a avaliação de ${a.cliente} sobre a loja ${a.loja}?\n\nUse só para comentários ofensivos ou falsos.`)) return;

        try {
            await apiAdmin(`/avaliacoes/${a.idAva}`, { metodo: 'DELETE' });
            aviso('Avaliação excluída.');
            atualizarTudo();
        } catch (erro) {
            aviso(erro.message, true);
        }
    }

    // ==========================================
    // 12. INÍCIO
    // ==========================================

    if (sessao()?.token) mostrarPainel();
    else mostrarAcesso();
});
