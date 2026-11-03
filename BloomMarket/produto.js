// ==================================================
// BLOOMMARKET — PÁGINA DO PRODUTO (produto.html?id=12)
// Busca a flor no back-end, mostra cores e tamanhos da
// mesma loja, avaliações da loja e flores parecidas.
// ==================================================


document.addEventListener('DOMContentLoaded', async () => {
    const B = window.Bloom;
    const { criar, moeda, api } = B;


    const area = document.getElementById('pagina-produto');
    if (!area) return;


    const FRETE_GRATIS_A_PARTIR = 150;
    const PARCELA_MINIMA = 10;
    const MAXIMO_PARCELAS = 6;


    const CUIDADOS = [
        'Corte 2 cm da ponta dos caules, na diagonal, assim que receber.',
        'Deixe em água limpa e troque a água a cada 2 dias.',
        'Mantenha longe do sol forte e de frutas maduras.',
        'Retire as flores que murcharem para as outras durarem mais.'
    ];


    const id = new URLSearchParams(window.location.search).get('id');


    function naoEncontrado(mensagem) {
        area.replaceChildren();
        const caixa = criar('section', 'produto-nao-encontrado cartao-branco');
        const voltar = criar('a', 'botao-principal', 'Ver outras flores');
        voltar.href = 'floresdaminharegiao.html';
        caixa.append(criar('h1', '', 'Produto não encontrado'), criar('p', '', mensagem), voltar);
        area.append(caixa);
        document.title = 'Produto não encontrado | BloomMarket';
    }


    if (!id) {
        naoEncontrado('O endereço da página está incompleto.');
        return;
    }


    B.mostrarCarregando(area, 'Carregando produto...');


    let v;
    try {
        v = await api(`/variacoes/${encodeURIComponent(id)}`);
    } catch (erro) {
        if (erro.status === 404 || erro.status === 400) {
            naoEncontrado('Este produto não existe ou não está mais à venda.');
        } else {
            B.mostrarErro(area, erro);
        }
        return;
    }


    B.lembrar(v);
    document.title = `${B.nomeDe(v)} ${v.cor} | BloomMarket`;


    // As outras cores e tamanhos da mesma flor na mesma loja
    let irmas = [];
    let loja = null;
    let avaliacoes = [];
    let parecidas = [];


    try {
        [irmas, loja, avaliacoes, parecidas] = await Promise.all([
            api(`/variacoes${B.parametros({ idProd: v.idProd, idLoja: v.idLoja, somenteDisponiveis: false })}`),
            api(`/lojas/${v.idLoja}`).catch(() => null),
            api(`/lojas/${v.idLoja}/avaliacoes`).catch(() => []),
            api(`/variacoes${B.parametros({ idProd: v.idProd })}`).catch(() => [])
        ]);
    } catch (erro) {
        irmas = [v];
    }


    irmas.forEach(B.lembrar);
    area.replaceChildren();


    // ---------- Caminho ----------
    const caminho = criar('nav', 'caminho-produto');
    caminho.setAttribute('aria-label', 'Você está em');
    const linkHome = criar('a', '', 'Home');
    linkHome.href = 'index.html';
    const linkFlores = criar('a', '', v.produto);
    linkFlores.href = `floresdaminharegiao.html?idProd=${v.idProd}`;
    caminho.append(linkHome, ' › ', linkFlores, ' › ', criar('span', 'atual', `${v.cor} · ${v.tamanho}`));
    area.append(caminho);


    // ---------- Foto + informações ----------
    const principal = criar('section', 'produto-principal');


    const foto = criar('div', 'produto-foto');
    const imagem = criar('img');
    imagem.src = B.imagemDe(v);
    imagem.alt = `${B.nomeDe(v)}, ${B.detalheDe(v)}`;
    foto.append(imagem);


    const info = criar('div', 'produto-info');
    info.append(criar('span', 'selo', v.categoria || 'Arranjo'));
    info.append(criar('h1', '', B.nomeDe(v)));
    info.append(criar('p', 'detalhe-variacao', B.detalheDe(v)));


    const vendedor = criar('p', 'produto-vendedor');
    const linkLoja = criar('a', 'link-loja', v.loja);
    linkLoja.href = `loja.html?id=${v.idLoja}`;
    vendedor.append('Vendido por ', linkLoja, `, ${v.localizacao}`);
    info.append(vendedor);


    if (loja?.notaMedia) {
        const nota = criar('a', 'nota-loja-mini');
        nota.href = `loja.html?id=${v.idLoja}#avaliacoes`;
        nota.append(
            criar('span', 'estrelas-douradas', `★ ${String(loja.notaMedia).replace('.', ',')}`),
            ` nota da loja (${loja.avaliacoes} ${loja.avaliacoes === 1 ? 'avaliação' : 'avaliações'})`
        );
        info.append(nota);
    }


    info.append(criar('p', 'produto-preco', moeda(v.preco)));


    let parcelas = 1;
    for (let vezes = MAXIMO_PARCELAS; vezes >= 1; vezes--) {
        if (v.preco / vezes >= PARCELA_MINIMA) { parcelas = vezes; break; }
    }
    if (parcelas > 1) {
        info.append(criar('p', 'produto-parcelas', `ou até ${parcelas}x de ${moeda(v.preco / parcelas)} sem juros no cartão`));
    }


    // ---------- Escolher cor e tamanho ----------
    function seletor(titulo, valores, atual, buscar) {
        const bloco = criar('div', 'escolha-variacao');
        bloco.append(criar('h3', '', titulo));
        const opcoes = criar('div', 'opcoes-variacao');


        valores.forEach(valor => {
            const destino = buscar(valor);
            const botao = criar('button', 'opcao-variacao' + (valor === atual ? ' ativa' : ''), valor);
            botao.type = 'button';
            botao.disabled = !destino;
            botao.setAttribute('aria-pressed', String(valor === atual));
            if (destino && valor !== atual) {
                botao.addEventListener('click', () => { window.location.href = `produto.html?id=${destino.idVar}`; });
            }
            opcoes.append(botao);
        });


        bloco.append(opcoes);
        return bloco;
    }


    const cores = [...new Set(irmas.map(i => i.cor))];
    const tamanhos = [...new Set(irmas.map(i => i.tamanho))];


    if (cores.length > 1) {
        info.append(seletor('Cor', cores, v.cor, cor =>
            irmas.find(i => i.cor === cor && i.tamanho === v.tamanho) || irmas.find(i => i.cor === cor)));
    }


    if (tamanhos.length > 1) {
        info.append(seletor('Tamanho', tamanhos, v.tamanho, tamanho =>
            irmas.find(i => i.tamanho === tamanho && i.cor === v.cor)));
    }


    // ---------- Estoque ----------
    const disponivel = B.estaDisponivel(v);
    let textoEstoque = 'Em estoque';
    let classeEstoque = 'estoque-ok';


    if (!disponivel) {
        textoEstoque = v.disponivel ? 'Esgotado no momento' : 'Indisponível no momento';
        classeEstoque = 'estoque-zero';
    } else if (v.estoque <= 3) {
        textoEstoque = v.estoque === 1 ? 'Última unidade!' : `Últimas ${v.estoque} unidades!`;
        classeEstoque = 'estoque-pouco';
    }
    info.append(criar('p', `produto-estoque ${classeEstoque}`, textoEstoque));


    // ---------- Quantidade + comprar + favorito ----------
    const compra = criar('div', 'produto-compra');
    const maximo = Math.max(1, Math.min(Number(v.estoque) || 1, 20));


    const seletorQtd = criar('div', 'seletor-quantidade');
    seletorQtd.setAttribute('role', 'group');
    seletorQtd.setAttribute('aria-label', 'Quantidade');


    const menos = criar('button', '', '−');
    menos.type = 'button';
    menos.setAttribute('aria-label', 'Diminuir quantidade');


    const campoQtd = criar('input');
    campoQtd.type = 'number';
    campoQtd.min = '1';
    campoQtd.max = String(maximo);
    campoQtd.value = '1';
    campoQtd.setAttribute('aria-label', 'Quantidade');


    const mais = criar('button', '', '+');
    mais.type = 'button';
    mais.setAttribute('aria-label', 'Aumentar quantidade');


    function ajustar(valor) {
        const n = Math.min(maximo, Math.max(1, parseInt(valor, 10) || 1));
        campoQtd.value = String(n);
        menos.disabled = n <= 1;
        mais.disabled = n >= maximo;
    }


    menos.addEventListener('click', () => ajustar(Number(campoQtd.value) - 1));
    mais.addEventListener('click', () => ajustar(Number(campoQtd.value) + 1));
    campoQtd.addEventListener('change', () => ajustar(campoQtd.value));
    ajustar(1);
    seletorQtd.append(menos, campoQtd, mais);


    const comprar = criar('button', 'comprar-btn botao-comprar-produto', disponivel ? 'Adicionar ao carrinho' : 'Indisponível');
    comprar.type = 'button';
    comprar.disabled = !disponivel;
    comprar.addEventListener('click', () => {
        if (B.carrinho.adicionar(v, Number(campoQtd.value))) {
            B.aviso(`${B.nomeDe(v)} adicionado ao carrinho.`);
            document.getElementById('btn-ver-carrinho')?.click();
        }
    });


    if (disponivel) compra.append(seletorQtd, comprar);
    compra.append(B.botaoFavorito(v, true));
    info.append(compra);


    // ---------- Vantagens ----------
    const vantagens = criar('ul', 'produto-vantagens');
    [
        '🚚 Entrega no dia e no período que você escolher',
        `🎁 Entrega grátis em compras a partir de ${moeda(FRETE_GRATIS_A_PARTIR)} na mesma loja`,
        '💌 Você pode mandar uma mensagem de cartão junto',
        `🌱 Produzido em ${v.localizacao}`
    ].forEach(texto => vantagens.append(criar('li', '', texto)));
    info.append(vantagens);


    principal.append(foto, info);
    area.append(principal);


    // ---------- Descrição e cuidados ----------
    const detalhes = criar('section', 'produto-detalhes');


    const descricao = criar('div', 'cartao-branco');
    descricao.append(
        criar('h2', '', 'Descrição'),
        criar('p', '', v.descricao ||
            `Arranjo de ${v.produto.toLowerCase()} na cor ${v.cor.toLowerCase()}, tamanho ${v.tamanho.toLowerCase()}, ` +
            `montado pela loja ${v.loja} com flores colhidas em ${v.localizacao}.`)
    );


    if (loja?.descricao) {
        const sobre = criar('p', 'meta');
        sobre.append('Sobre a loja: ', loja.descricao);
        descricao.append(sobre);
    }


    const cuidados = criar('div', 'cartao-branco');
    const lista = criar('ul', 'lista-cuidados');
    CUIDADOS.forEach(dica => lista.append(criar('li', '', dica)));
    cuidados.append(criar('h2', '', 'Como cuidar'), lista);


    detalhes.append(descricao, cuidados);
    area.append(detalhes);


    // ---------- O que dizem da loja ----------
    if (avaliacoes.length) {
        const secao = criar('section', 'secao-avaliacoes-produto');
        const cabecalho = criar('div', 'cabecalho-secao-produto');
        const verTodas = criar('a', 'link-loja', 'Ver todas as avaliações');
        verTodas.href = `loja.html?id=${v.idLoja}#avaliacoes`;
        cabecalho.append(criar('h2', '', `O que dizem da ${v.loja}`), verTodas);


        const listaAval = criar('div', 'lista-avaliacoes-loja');
        avaliacoes.slice(0, 3).forEach(a => {
            const cartao = criar('article', 'avaliacao-loja cartao-branco');
            const topo = criar('div', 'cabecalho-avaliacao-loja');
            topo.append(criar('strong', '', a.cliente), criar('span', 'selo-verificada', '✔ Compra verificada'));
            cartao.append(topo, criar('span', 'estrelas-douradas', B.estrelas(a.nota)));
            if (a.comentario) cartao.append(criar('p', 'comentario-avaliacao-loja', a.comentario));
            listaAval.append(cartao);
        });


        secao.append(cabecalho, listaAval);
        area.append(secao);
    }


    // ---------- Você também pode gostar (mesma flor, outras lojas ou cores) ----------
    const outras = parecidas.filter(p => p.idVar !== v.idVar).slice(0, 4);


    if (outras.length) {
        const secao = criar('section', 'produtos-parecidos');
        const grade = criar('div', 'grid-produtos-vitrine');
        secao.append(criar('h2', '', 'Você também pode gostar'), grade);
        B.mostrarCartoes(grade, outras);
        area.append(secao);
    }
});



