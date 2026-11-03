// ==================================================
// BLOOMMARKET — PÁGINA DA LOJA (loja.html?id=1)
// Dados da loja, produtos com filtro e avaliações,
// tudo vindo do back-end.
// ==================================================


document.addEventListener('DOMContentLoaded', async () => {
    const B = window.Bloom;
    const { criar, api } = B;


    const area = document.getElementById('pagina-loja');
    if (!area) return;


    const id = new URLSearchParams(window.location.search).get('id');


    function naoEncontrada() {
        area.replaceChildren();
        const caixa = criar('section', 'produto-nao-encontrado cartao-branco');
        const voltar = criar('a', 'botao-principal', 'Ver outras flores');
        voltar.href = 'floresdaminharegiao.html';
        caixa.append(criar('h1', '', 'Loja não encontrada'),
            criar('p', '', 'Esta loja não existe ou não está mais vendendo no BloomMarket.'), voltar);
        area.append(caixa);
        document.title = 'Loja não encontrada | BloomMarket';
    }


    if (!id) return naoEncontrada();


    B.mostrarCarregando(area, 'Carregando loja...');


    let loja, produtos, avaliacoes;


    try {
        [loja, produtos, avaliacoes] = await Promise.all([
            api(`/lojas/${encodeURIComponent(id)}`),
            api(`/variacoes?idLoja=${encodeURIComponent(id)}`),
            api(`/lojas/${encodeURIComponent(id)}/avaliacoes`)
        ]);
    } catch (erro) {
        if ([400, 403, 404].includes(erro.status)) return naoEncontrada();
        B.mostrarErro(area, erro);
        return;
    }


    document.title = `${loja.nome} | BloomMarket`;
    area.replaceChildren();


    // ---------- Caminho ----------
    const caminho = criar('nav', 'caminho-produto');
    const linkHome = criar('a', '', 'Home');
    linkHome.href = 'index.html';
    const linkFlores = criar('a', '', 'Flores');
    linkFlores.href = 'floresdaminharegiao.html';
    caminho.append(linkHome, ' › ', linkFlores, ' › ', criar('span', 'atual', loja.nome));
    area.append(caminho);


    // ---------- Topo ----------
    const topo = criar('section', 'topo-loja cartao-branco');
    const avatar = criar('div', 'avatar-loja', loja.nome.charAt(0).toUpperCase());
    avatar.setAttribute('aria-hidden', 'true');


    const info = criar('div', 'info-loja');
    info.append(criar('h1', '', loja.nome));
    info.append(criar('p', 'local-loja', `📍 ${loja.cidade} · região ${loja.localizacao} · responsável: ${loja.responsavel}`));
    if (loja.descricao) info.append(criar('p', 'meta', loja.descricao));


    const numeros = criar('div', 'numeros-loja');
    const nota = criar('span', 'numero-loja');
    if (loja.notaMedia) {
        nota.append(criar('strong', 'estrelas-douradas', `★ ${String(loja.notaMedia).replace('.', ',')}`),
            ` (${loja.avaliacoes} ${loja.avaliacoes === 1 ? 'avaliação' : 'avaliações'})`);
    } else {
        nota.textContent = 'Ainda sem avaliações';
    }


    const desde = new Date(`${loja.dataCadastro}T12:00:00`);
    numeros.append(
        nota,
        criar('span', 'numero-loja', `🌷 ${loja.produtosNaVitrine} ${loja.produtosNaVitrine === 1 ? 'produto' : 'produtos'}`),
        criar('span', 'numero-loja', `🚚 ${loja.entregas} ${loja.entregas === 1 ? 'entrega feita' : 'entregas feitas'}`)
    );
    if (!isNaN(desde)) {
        numeros.append(criar('span', 'numero-loja',
            `No BloomMarket desde ${desde.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`));
    }
    info.append(numeros);


    const acoes = criar('div', 'acoes-loja');
    const telefone = B.apenasNumeros(loja.telefone);
    if (telefone.length >= 10) {
        const whatsapp = criar('a', 'botao-principal', 'Falar com a loja');
        whatsapp.href = `https://wa.me/55${telefone}`;
        whatsapp.target = '_blank';
        whatsapp.rel = 'noopener';
        acoes.append(whatsapp);
    }


    topo.append(avatar, info, acoes);
    area.append(topo);


    // ---------- Produtos com filtro por flor ----------
    const secaoProdutos = criar('section', 'secao-loja');
    secaoProdutos.append(criar('h2', '', 'Produtos da loja'));


    if (!produtos.length) {
        secaoProdutos.append(criar('p', 'lista-vazia', 'Esta loja ainda não tem produtos disponíveis.'));
    } else {
        const filtros = criar('div', 'filtros-loja');
        const grade = criar('div', 'grid-produtos-vitrine');
        const flores = [...new Set(produtos.map(p => p.produto))].sort();


        function mostrar(flor) {
            B.mostrarCartoes(grade, flor ? produtos.filter(p => p.produto === flor) : produtos);
            filtros.querySelectorAll('.chip-filtro').forEach(chip => {
                const ativo = chip.dataset.flor === (flor || '');
                chip.classList.toggle('ativo', ativo);
                chip.setAttribute('aria-pressed', String(ativo));
            });
        }


        [['', `Todas (produtos.length)`],...flores.map(f=>[f,`{f} (${produtos.filter(p => p.produto === f).length})`])]
            .forEach(([flor, texto]) => {
                const chip = criar('button', 'chip-filtro', texto);
                chip.type = 'button';
                chip.dataset.flor = flor;
                chip.addEventListener('click', () => mostrar(flor));
                filtros.append(chip);
            });


        secaoProdutos.append(filtros, grade);
        mostrar('');
    }
    area.append(secaoProdutos);


    // ---------- Avaliações ----------
    const secaoAval = criar('section', 'secao-loja');
    secaoAval.id = 'avaliacoes';
    secaoAval.append(criar('h2', '', 'O que os clientes dizem'));


    if (!avaliacoes.length) {
        secaoAval.append(criar('p', 'lista-vazia',
            'Esta loja ainda não recebeu avaliações. Quem compra aqui pode avaliar em "Meus pedidos" depois da entrega.'));
    } else {
        const layout = criar('div', 'layout-avaliacoes-loja');
        const media = avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length;


        const resumo = criar('div', 'resumo-nota cartao-branco');
        resumo.append(
            criar('strong', 'nota-grande', media.toFixed(1).replace('.', ',')),
            criar('span', 'estrelas-douradas estrelas-resumo', B.estrelas(media)),
            criar('span', 'meta', `${avaliacoes.length} ${avaliacoes.length === 1 ? 'avaliação' : 'avaliações'} de compras verificadas`)
        );


        const barras = criar('div', 'barras-nota');
        for (let estrela = 5; estrela >= 1; estrela--) {
            const qtd = avaliacoes.filter(a => a.nota === estrela).length;
            const linha = criar('div', 'linha-nota');
            const trilho = criar('div', 'trilho-nota');
            const cheio = criar('div', 'preenchido-nota');
            cheio.style.width = `${(qtd / avaliacoes.length) * 100}%`;
            trilho.append(cheio);
            linha.append(criar('span', '', `${estrela}★`), trilho, criar('span', '', String(qtd)));
            barras.append(linha);
        }
        resumo.append(barras);


        const lista = criar('div', 'lista-avaliacoes-loja');
        avaliacoes.forEach(a => {
            const cartao = criar('article', 'avaliacao-loja cartao-branco');
            const cab = criar('div', 'cabecalho-avaliacao-loja');
            cab.append(criar('strong', '', a.cliente), criar('span', 'selo-verificada', '✔ Compra verificada'));
            cartao.append(cab, criar('span', 'estrelas-douradas', B.estrelas(a.nota)),
                criar('p', 'meta', `${B.dataBR(a.data)} · ${a.produtos}`));
            if (a.comentario) cartao.append(criar('p', 'comentario-avaliacao-loja', a.comentario));
            lista.append(cartao);
        });


        layout.append(resumo, lista);
        secaoAval.append(layout);
    }


    area.append(secaoAval);


    if (window.location.hash === '#avaliacoes') secaoAval.scrollIntoView();
});



