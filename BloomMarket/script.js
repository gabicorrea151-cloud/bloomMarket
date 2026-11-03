// ==================================================
// BLOOMMARKET — SCRIPT PRINCIPAL (todas as páginas)
// O site agora conversa com o back-end (Spring Boot + SQL Server).
// O back-end precisa estar rodando em http://localhost:8080
//
// Este arquivo cria o objeto "Bloom", usado também por
// produto.js, loja.js, checkout.js e meus-pedidos.js.
// ==================================================


(function () {


    // ==========================================
    // 1. CONFIGURAÇÕES
    // ==========================================


    const API_URL = 'http://localhost:8080/api';


    const CHAVE_CLIENTE = 'clienteBloomMarket';         // quem está logado
    const CHAVE_CARRINHO = 'carrinhoBloomMarketV2';     // itens do carrinho
    const CHAVE_FAVORITOS = 'favoritosBloomMarketV2';   // ids das flores favoritas


    // Emoji e cor de fundo usados quando a flor não tem foto
    const EMOJIS = {
        'Rosa': '🌹', 'Tulipa': '🌷', 'Girassol': '🌻', 'Margarida': '🌼',
        'Lírio': '💮', 'Orquídea': '🌸', 'Peônia': '🌺', 'Jasmin': '🤍',
        'Lavanda': '💜', 'Papoula': '🌺', 'Dália': '🏵️', 'Gardênia': '🤍'
    };


    const CORES_FUNDO = {
        'Amarelo': '#fff3b0', 'Azul': '#dbeafe', 'Branco': '#f4f4ec', 'Rosa': '#fde2e8',
        'Roxo': '#ede4f7', 'Vermelho': '#fde0e0', 'Laranja': '#ffe5cc'
    };


    const PERIODOS = {
        manha: 'Manhã (8h às 12h)',
        tarde: 'Tarde (12h às 18h)',
        noite: 'Noite (18h às 21h)'
    };


    const STATUS = {
        novo: 'Recebido',
        preparo: 'Em preparo',
        entrega: 'Saiu para entrega',
        entregue: 'Entregue',
        cancelado: 'Cancelado'
    };


    // ==========================================
    // 2. FUNÇÕES DE APOIO
    // ==========================================


    function moeda(valor) {
        return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }


    function apenasNumeros(texto) {
        return String(texto ?? '').replace(/\D/g, '');
    }


    function criar(tag, classe, texto) {
        const elemento = document.createElement(tag);
        if (classe) elemento.className = classe;
        if (texto !== undefined && texto !== null) elemento.textContent = texto;
        return elemento;
    }


    function lerJSON(chave, padrao) {
        try {
            const valor = JSON.parse(localStorage.getItem(chave));
            return valor ?? padrao;
        } catch (erro) {
            return padrao;
        }
    }


    function salvarJSON(chave, valor) {
        try {
            localStorage.setItem(chave, JSON.stringify(valor));
        } catch (erro) {
            console.error('Não foi possível salvar no navegador:', erro);
        }
    }


    // "2026-10-22" -> "22/10/2026"
    function dataBR(iso) {
        if (!iso) return '';
        const [ano, mes, dia] = String(iso).slice(0, 10).split('-');
        return `dia/{mes}/${ano}`;
    }


    function dataHoraBR(iso) {
        const data = new Date(iso);
        return isNaN(data) ? '' : data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }


    function estrelas(nota) {
        const n = Math.round(Number(nota) || 0);
        return '★'.repeat(n) + '☆'.repeat(5 - n);
    }


    function mascaraTelefone(texto) {
        const n = apenasNumeros(texto).slice(0, 11);
        if (n.length === 0) return '';
        if (n.length <= 2) return `(${n}`;
        if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
        if (n.length <= 10) return `(${n.slice(0, 2)}) n.slice(2,6)-{n.slice(6)}`;
        return `(${n.slice(0, 2)}) n.slice(2,7)-{n.slice(7)}`;
    }


    function mascaraCPF(texto) {
        const n = apenasNumeros(texto).slice(0, 11);
        return n
            .replace(/(\d{3})(\d)/, '1.2')
            .replace(/(\d{3})(\d)/, '1.2')
            .replace(/(\d{3})(\d{1,2})/,'1-$2');
    }


    function mascaraCEP(texto) {
        const n = apenasNumeros(texto).slice(0, 8);
        return n.length > 5 ? `n.slice(0,5)-{n.slice(5)}` : n;
    }


    // Busca o endereço pelo CEP (BrasilAPI)
    async function buscarCEP(cep) {
        const n = apenasNumeros(cep);
        if (n.length !== 8) return null;


        try {
            const resposta = await fetch(`https://brasilapi.com.br/api/cep/v2/${n}`);
            if (!resposta.ok) return null;
            const dados = await resposta.json();
            return {
                cep: mascaraCEP(n),
                rua: dados.street || '',
                bairro: dados.neighborhood || '',
                cidade: dados.city || '',
                estado: dados.state || ''
            };
        } catch (erro) {
            return null;
        }
    }


    // ==========================================
    // 3. CONVERSA COM O BACK-END
    // ==========================================


    async function api(caminho, opcoes = {}) {
        const { metodo = 'GET', corpo, cabecalhos = {} } = opcoes;
        let resposta;


        try {
            resposta = await fetch(API_URL + caminho, {
                method: metodo,
                headers: {
                    ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
                    ...cabecalhos
                },
                body: corpo !== undefined ? JSON.stringify(corpo) : undefined
            });
        } catch (erro) {
            const falha = new Error('Não foi possível conectar ao servidor. Confira se o back-end (Spring) está rodando.');
            falha.status = 0;
            throw falha;
        }


        if (resposta.status === 204) return null;


        let dados = null;
        try {
            dados = await resposta.json();
        } catch (erro) {
            dados = null;
        }


        if (!resposta.ok) {
            const falha = new Error(dados?.erro || `Erro ${resposta.status} no servidor.`);
            falha.status = resposta.status;
            throw falha;
        }


        return dados;
    }


    // Monta "?a=1&b=2" ignorando o que estiver vazio
    function parametros(objeto) {
        const busca = new URLSearchParams();
        Object.entries(objeto).forEach(([chave, valor]) => {
            if (valor !== undefined && valor !== null && valor !== '') busca.set(chave, valor);
        });
        const texto = busca.toString();
        return texto ? `?${texto}` : '';
    }


    // ==========================================
    // 4. AVISO RÁPIDO (TOAST)
    // ==========================================


    let timerAviso;


    function aviso(mensagem, erro = false) {
        let toast = document.getElementById('toast');


        if (!toast) {
            toast = criar('div', 'toast');
            toast.id = 'toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.append(toast);
        }


        toast.textContent = mensagem;
        toast.classList.toggle('erro', erro);
        toast.classList.add('visivel');


        clearTimeout(timerAviso);
        timerAviso = setTimeout(() => toast.classList.remove('visivel'), 3500);
    }


    // ==========================================
    // 5. CLIENTE LOGADO
    // ==========================================


    function cliente() {
        return lerJSON(CHAVE_CLIENTE, null);
    }


    function salvarCliente(dados) {
        salvarJSON(CHAVE_CLIENTE, dados);
        document.dispatchEvent(new CustomEvent('bloom:conta'));
    }


    function sair() {
        localStorage.removeItem(CHAVE_CLIENTE);
        document.dispatchEvent(new CustomEvent('bloom:conta'));
    }


    // ==========================================
    // 6. FLORES (VARIAÇÕES): NOME, FOTO E CARTÃO
    // ==========================================


    // Guarda as flores que já apareceram na tela (para o carrinho usar)
    const variacoesConhecidas = new Map();


    function lembrar(variacao) {
        if (variacao?.idVar) variacoesConhecidas.set(String(variacao.idVar), variacao);
        return variacao;
    }


    function variacao(id) {
        return variacoesConhecidas.get(String(id)) || null;
    }


    function emojiDe(nomeFlor) {
        return EMOJIS[nomeFlor] || '✿';
    }


    function nomeDe(v) {
        return `Arranjo de ${v.produto}`;
    }


    function detalheDe(v) {
        return `${v.cor} · ${v.tamanho}`;
    }


    function imagemPadrao(v) {
        const emoji = EMOJIS[v?.produto] || '✿';
        const fundo = CORES_FUNDO[v?.cor] || '#efefdf';


        return 'data:image/svg+xml,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">' +
            `<rect width="300" height="200" fill="${fundo}"/>` +
            `<text x="150" y="130" font-size="90" text-anchor="middle">${emoji}</text>` +
            '</svg>'
        );
    }


    function imagemDe(v) {
        const img = v?.imagem;
        if (typeof img === 'string' && (img.startsWith('data:image/') || /^imagens\/[\w\-./]+$/.test(img))) {
            return img;
        }
        return imagemPadrao(v);
    }


    function estaDisponivel(v) {
        return Boolean(v?.disponivel) && Number(v?.estoque) > 0;
    }


    // ---------- Coração de favorito ----------


    const CORACAO_VAZIO =
        '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">' +
        '<path d="M12 20.5s-7.5-4.6-9.3-9.4C1.5 7.8 3.6 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.4 0 5.5 3.3 4.3 6.6-1.8 4.8-9.3 9.4-9.3 9.4z"/></svg>';


    const CORACAO_CHEIO = CORACAO_VAZIO.replace('fill="none"', 'fill="currentColor"');


    function favoritos() {
        return lerJSON(CHAVE_FAVORITOS, []).map(String);
    }


    function ehFavorito(id) {
        return favoritos().includes(String(id));
    }


    function pintarCoracao(botao, favorito) {
        botao.classList.toggle('favoritado', favorito);
        botao.setAttribute('aria-pressed', String(favorito));
        botao.setAttribute('aria-label', favorito ? 'Tirar dos favoritos' : 'Salvar nos favoritos');
        botao.title = favorito ? 'Tirar dos favoritos' : 'Salvar nos favoritos';


        if (botao.classList.contains('botao-favorito-grande')) {
            botao.innerHTML = (favorito ? CORACAO_CHEIO : CORACAO_VAZIO) +
                `<span>${favorito ? 'Salvo nos favoritos' : 'Salvar nos favoritos'}</span>`;
        } else {
            botao.innerHTML = favorito ? CORACAO_CHEIO : CORACAO_VAZIO;
        }
    }


    function botaoFavorito(v, grande = false) {
        const botao = criar('button', 'botao-favorito' + (grande ? ' botao-favorito-grande' : ''));
        botao.type = 'button';
        botao.dataset.id = v.idVar;
        pintarCoracao(botao, ehFavorito(v.idVar));
        return botao;
    }


    function alternarFavorito(id) {
        const lista = favoritos();
        const chave = String(id);
        const jaEra = lista.includes(chave);
        const nova = jaEra ? lista.filter(item => item !== chave) : [chave, ...lista];


        salvarJSON(CHAVE_FAVORITOS, nova);


        document.querySelectorAll(`.botao-favorito[data-id="${chave}"]`).forEach(botao => {
            pintarCoracao(botao, !jaEra);
        });


        aviso(jaEra ? 'Removido dos favoritos.' : 'Salvo nos favoritos ♥');
        document.dispatchEvent(new CustomEvent('bloom:favoritos', { detail: { id: chave, favorito: !jaEra } }));
    }


    // ---------- Cartão de produto (igual em todas as páginas) ----------


    function cartaoVariacao(v) {
        lembrar(v);


        const disponivel = estaDisponivel(v);
        const cartao = criar('div', 'cartao-produto' + (disponivel ? '' : ' cartao-indisponivel'));
        cartao.dataset.id = v.idVar;


        cartao.append(botaoFavorito(v));


        const link = criar('a', 'link-produto');
        link.href = `produto.html?id=${v.idVar}`;


        const foto = criar('img');
        foto.src = imagemDe(v);
        foto.alt = `${nomeDe(v)}, ${detalheDe(v)}`;
        foto.loading = 'lazy';


        link.append(foto, criar('h4', '', nomeDe(v)));
        cartao.append(link);


        cartao.append(criar('p', 'detalhe-variacao', detalheDe(v)));
        cartao.append(criar('p', 'polo-origem', `📍 ${v.localizacao}`));


        const vendido = criar('p', 'vendido-por');
        const linkLoja = criar('a', 'link-loja', v.loja);
        linkLoja.href = `loja.html?id=${v.idLoja}`;
        vendido.append('Loja: ', linkLoja);
        cartao.append(vendido);


        cartao.append(criar('p', 'preco', moeda(v.preco)));


        if (disponivel && Number(v.estoque) <= 3) {
            cartao.append(criar('p', 'estoque-baixo', `Últimas ${v.estoque} unidades`));
        }


        const botao = criar('button', 'comprar-btn btn-add-carrinho', disponivel ? 'Adicionar ao Carrinho' : 'Indisponível');
        botao.type = 'button';
        botao.disabled = !disponivel;
        botao.dataset.id = v.idVar;
        cartao.append(botao);


        return cartao;
    }


    // Mostra uma lista de flores dentro de uma grade
    function mostrarCartoes(grade, lista, mensagemVazia) {
        grade.replaceChildren();


        if (!lista.length) {
            grade.append(criar('p', 'lista-vazia', mensagemVazia || 'Nenhuma flor encontrada.'));
            return;
        }


        lista.forEach(v => grade.append(cartaoVariacao(v)));
    }


    function mostrarCarregando(elemento, texto = 'Carregando...') {
        elemento.replaceChildren(criar('p', 'carregando-produto', texto));
    }


    function mostrarErro(elemento, erro) {
        const caixa = criar('div', 'erro-servidor');
        caixa.append(
            criar('strong', '', 'Não deu para carregar agora.'),
            criar('p', '', erro?.message || 'Tente de novo em alguns segundos.')
        );
        elemento.replaceChildren(caixa);
    }


    // ==========================================
    // 7. CARRINHO (fica salvo no navegador)
    // ==========================================


    function lerCarrinho() {
        const lista = lerJSON(CHAVE_CARRINHO, []);
        return Array.isArray(lista) ? lista.filter(item => item && item.id && item.quantidade > 0) : [];
    }


    function salvarCarrinho(lista) {
        salvarJSON(CHAVE_CARRINHO, lista);
        document.dispatchEvent(new CustomEvent('bloom:carrinho'));
    }


    function adicionarAoCarrinho(v, quantidade = 1) {
        if (!estaDisponivel(v)) {
            aviso('Esta flor não está disponível no momento.', true);
            return false;
        }


        const lista = lerCarrinho();
        const existente = lista.find(item => String(item.id) === String(v.idVar));
        const total = (existente ? existente.quantidade : 0) + quantidade;


        if (total > Number(v.estoque)) {
            aviso(`Só temos ${v.estoque} unidade(s) desta flor.`, true);
            return false;
        }


        if (existente) {
            existente.quantidade = total;
            existente.preco = Number(v.preco);
            existente.estoque = Number(v.estoque);
        } else {
            lista.push({
                id: v.idVar,
                nome: nomeDe(v),
                detalhe: detalheDe(v),
                preco: Number(v.preco),
                quantidade,
                estoque: Number(v.estoque),
                idLoja: v.idLoja,
                loja: v.loja,
                produto: v.produto,
                cor: v.cor,
                imagem: /^imagens\//.test(v.imagem || '') ? v.imagem : ''
            });
        }


        salvarCarrinho(lista);
        return true;
    }


    function limparCarrinho() {
        salvarCarrinho([]);
    }


    // ==========================================
    // 8. OBJETO USADO PELAS OUTRAS PÁGINAS
    // ==========================================


    window.Bloom = {
        API_URL, PERIODOS, STATUS,
        api, parametros, aviso, criar, moeda, apenasNumeros, dataBR, dataHoraBR, estrelas,
        mascaraTelefone, mascaraCPF, mascaraCEP, buscarCEP,
        cliente, salvarCliente, sair,
        lembrar, variacao, emojiDe, nomeDe, detalheDe, imagemDe, imagemPadrao, estaDisponivel,
        botaoFavorito, alternarFavorito, favoritos, cartaoVariacao, mostrarCartoes, mostrarCarregando, mostrarErro,
        carrinho: { ler: lerCarrinho, salvar: salvarCarrinho, adicionar: adicionarAoCarrinho, limpar: limparCarrinho },
        abrirLogin: () => document.dispatchEvent(new CustomEvent('bloom:abrir-login'))
    };


})();




// ==================================================
// O QUE RODA DEPOIS QUE A PÁGINA CARREGA
// ==================================================


document.addEventListener('DOMContentLoaded', () => {
    const B = window.Bloom;
    const { criar, api, aviso, moeda, apenasNumeros } = B;


    // ==========================================
    // A. ÍCONE E ESTILOS EXTRAS
    // ==========================================


    if (!document.querySelector('link[rel="icon"]')) {
        const icone = document.createElement('link');
        icone.rel = 'icon';
        icone.href = 'data:image/svg+xml,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌷</text></svg>'
        );
        document.head.append(icone);
    }


    ['complementos.css', 'favoritos.css', 'vitrine.css'].forEach(arquivo => {
        if (document.querySelector(`link[href="${arquivo}"]`)) return;
        const estilo = document.createElement('link');
        estilo.rel = 'stylesheet';
        estilo.href = arquivo;
        document.head.append(estilo);
    });


    // ==========================================
    // B. CLIQUES QUE VALEM PARA O SITE TODO
    // ==========================================


    document.addEventListener('click', evento => {
        // Coração de favorito
        const coracao = evento.target.closest('.botao-favorito');
        if (coracao) {
            evento.preventDefault();
            evento.stopPropagation();
            B.alternarFavorito(coracao.dataset.id);
            return;
        }


        // Botão "Adicionar ao Carrinho" dos cartões
        const botao = evento.target.closest('.btn-add-carrinho');
        if (botao && !botao.classList.contains('botao-comprar-produto')) {
            const v = botao.dataset.id ? B.variacao(botao.dataset.id) : null;
            if (v && B.carrinho.adicionar(v, 1)) abrirCarrinho();
        }
    });


    // ==========================================
    // C. CONTA DO CLIENTE (LOGIN, CADASTRO, MINHA CONTA)
    // ==========================================


    const modal = document.getElementById('modalAuth');
    const botaoConta = document.getElementById('btn-abrir-auth');


    const telas = {
        escolha: document.getElementById('containerEscolha'),
        login: document.getElementById('containerLogin'),
        cadastro: document.getElementById('containerCadastro'),
        conta: document.getElementById('containerConta'),
        recuperar: null
    };


    // ---------- Campos que o JavaScript coloca no modal ----------


    // CPF no cadastro (logo depois do e-mail)
    const campoEmailCadastro = document.getElementById('cad-email');
    if (campoEmailCadastro && !document.getElementById('cad-cpf')) {
        const caixa = criar('div', 'input-box');
        caixa.innerHTML = '<input required type="text" id="cad-cpf" inputmode="numeric" maxlength="14" placeholder=" "><span>CPF</span>';
        campoEmailCadastro.closest('.input-box').after(caixa);
    }


    // Tela "Esqueci minha senha"
    if (modal && !document.getElementById('containerRecuperar')) {
        const tela = criar('div', 'form-container');
        tela.id = 'containerRecuperar';
        tela.style.display = 'none';
        tela.innerHTML = `
            <a href="#" class="voltar-login-cliente">← Voltar</a>
            <button type="button" class="close-btn id-btn-fechar" aria-label="Fechar">&times;</button>
            <h2>Criar nova senha</h2>
            <p class="texto-recuperar">Confirme o e-mail e o CPF que você usou no cadastro.</p>
            <form id="form-recuperar-cliente" novalidate>
                <div class="input-box">
                    <input required type="email" id="rc-email" autocomplete="email" placeholder=" ">
                    <span>E-mail</span>
                </div>
                <div class="input-box">
                    <input required type="text" id="rc-cpf" inputmode="numeric" maxlength="14" placeholder=" ">
                    <span>CPF</span>
                </div>
                <div class="input-box">
                    <input required type="password" id="rc-nova" minlength="6" autocomplete="new-password" placeholder=" ">
                    <span>Nova senha</span>
                </div>
                <div class="input-box">
                    <input required type="password" id="rc-confirmar" autocomplete="new-password" placeholder=" ">
                    <span>Confirmar nova senha</span>
                </div>
                <p class="erro-form" id="erro-recuperar-cliente" role="alert" hidden></p>
                <button type="submit" class="submit-btn">Salvar nova senha</button>
            </form>`;
        modal.append(tela);
    }
    telas.recuperar = document.getElementById('containerRecuperar');


    // Link "Esqueci minha senha"
    const formLogin = document.getElementById('form-login-cliente');
    if (formLogin && !document.getElementById('link-esqueci-cliente')) {
        const link = criar('button', 'link-simples link-esqueci-cliente', 'Esqueci minha senha');
        link.type = 'button';
        link.id = 'link-esqueci-cliente';
        formLogin.append(link);
    }


    // Botão "Meus favoritos" na Minha conta
    const botaoSair = document.getElementById('btn-sair-cliente');
    if (botaoSair && !document.getElementById('link-favoritos-conta')) {
        const link = criar('a', 'botao-secundario botao-favoritos-conta', '♡ Meus favoritos');
        link.id = 'link-favoritos-conta';
        link.href = 'favoritos.html';
        botaoSair.before(link);
    }


    // ---------- Olhinho nas senhas ----------


    const OLHO =
        '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    const OLHO_FECHADO =
        '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-7-11-7a18.45 18.45 0 0 1 5.06-5.94"/>' +
        '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19"/>' +
        '<path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';


    document.querySelectorAll('input[type="password"]').forEach(campo => {
        if (campo.dataset.olho) return;
        campo.dataset.olho = '1';
        campo.classList.add('campo-com-olho');


        const olho = criar('button', 'botao-olho');
        olho.type = 'button';


        const pintar = mostrando => {
            olho.innerHTML = mostrando ? OLHO_FECHADO : OLHO;
            olho.setAttribute('aria-label', mostrando ? 'Ocultar senha' : 'Mostrar senha');
        };
        pintar(false);


        olho.addEventListener('click', () => {
            const mostrar = campo.type === 'password';
            campo.type = mostrar ? 'text' : 'password';
            pintar(mostrar);
            campo.focus();
        });


        const pai = campo.parentElement;
        if (pai.classList.contains('input-box')) {
            pai.append(olho);
        } else {
            const envoltorio = criar('div', 'envoltorio-senha');
            pai.insertBefore(envoltorio, campo);
            envoltorio.append(campo, olho);
        }
    });


    // ---------- Máscaras ----------


    const mascaras = [
        ['cad-telefone', B.mascaraTelefone],
        ['cad-cpf', B.mascaraCPF],
        ['rc-cpf', B.mascaraCPF],
        ['cad-cep', B.mascaraCEP]
    ];


    mascaras.forEach(([id, mascara]) => {
        const campo = document.getElementById(id);
        campo?.addEventListener('input', evento => {
            if (!evento.isComposing) campo.value = mascara(campo.value);
        });
    });


    // ---------- Abrir e fechar o modal ----------


    function mostrarTela(nome) {
        Object.entries(telas).forEach(([chave, tela]) => {
            if (tela) tela.style.display = chave === nome ? 'block' : 'none';
        });
        document.querySelectorAll('#modalAuth .erro-form').forEach(caixa => { caixa.hidden = true; });
    }


    function abrirModal() {
        if (!modal) return;
        modal.classList.add('ativo');


        if (B.cliente() && telas.conta) {
            preencherConta();
            mostrarTela('conta');
        } else {
            mostrarTela(telas.escolha ? 'escolha' : 'login');
        }
    }


    function fecharModal() {
        modal?.classList.remove('ativo');
        modal?.querySelectorAll('input[type="text"].campo-com-olho').forEach(campo => { campo.type = 'password'; });
    }


    botaoConta?.addEventListener('click', abrirModal);


    // Link "Criar conta" vindo de outra página: index.html?entrar=cadastro
    const pedidoEntrar = new URLSearchParams(window.location.search).get('entrar');
    if (modal && pedidoEntrar && !B.cliente()) {
        modal.classList.add('ativo');
        mostrarTela(pedidoEntrar === 'cadastro' ? 'cadastro' : 'login');
    }
    document.addEventListener('bloom:abrir-login', () => {
        if (!modal) return;
        modal.classList.add('ativo');
        mostrarTela('login');
    });


    modal?.addEventListener('click', evento => {
        if (evento.target === modal) fecharModal();
        if (evento.target.closest('.id-btn-fechar')) fecharModal();
    });


    document.getElementById('btn-sou-cliente')?.addEventListener('click', () => mostrarTela('login'));
    document.getElementById('link-ir-cadastro')?.addEventListener('click', e => { e.preventDefault(); mostrarTela('cadastro'); });
    document.getElementById('link-ir-login')?.addEventListener('click', e => { e.preventDefault(); mostrarTela('login'); });
    document.getElementById('link-esqueci-cliente')?.addEventListener('click', () => {
        const email = document.getElementById('login-email')?.value || '';
        mostrarTela('recuperar');
        const campo = document.getElementById('rc-email');
        if (campo && email) campo.value = email;
    });


    modal?.addEventListener('click', evento => {
        if (evento.target.closest('.voltar-escolha')) { evento.preventDefault(); mostrarTela('escolha'); }
        if (evento.target.closest('.voltar-login-cliente')) { evento.preventDefault(); mostrarTela('login'); }
    });


    function erroNoForm(id, mensagem) {
        const caixa = document.getElementById(id);
        if (!caixa) return;
        caixa.textContent = mensagem || '';
        caixa.hidden = !mensagem;
    }


    // Trava o botão enquanto espera o servidor
    async function enviando(form, acao) {
        const botao = form.querySelector('button[type="submit"]');
        const textoOriginal = botao?.textContent;
        if (botao) { botao.disabled = true; botao.textContent = 'Aguarde...'; }


        try {
            await acao();
        } finally {
            if (botao) { botao.disabled = false; botao.textContent = textoOriginal; }
        }
    }


    // ---------- Botão do topo: "Entrar" ou "Olá, Nome" ----------


    function atualizarBotaoConta() {
        if (!botaoConta) return;
        const quem = B.cliente();
        botaoConta.textContent = quem ? `Olá, ${quem.nome.split(' ')[0]}` : 'Entrar';
    }


    document.addEventListener('bloom:conta', atualizarBotaoConta);
    window.addEventListener('storage', evento => {
        if (evento.key === 'clienteBloomMarket') atualizarBotaoConta();
    });
    atualizarBotaoConta();


    // ---------- Minha conta ----------


    function textoEndereco(c) {
        if (!c) return '';
        const partes = [
            c.rua ? `${c.rua}, ${c.numero}` : `Número ${c.numero}`,
            c.complemento,
            c.bairro,
            c.cidade && c.estado ? `${c.cidade} - ${c.estado}` : c.cidade,
            `CEP ${c.cep}`
        ];
        return partes.filter(Boolean).join(', ');
    }


    function escreverConta(c) {
        const valores = {
            'conta-nome': c.nome,
            'conta-email': c.email,
            'conta-telefone': c.telefone,
            'conta-endereco': textoEndereco(c)
        };
        Object.entries(valores).forEach(([id, texto]) => {
            const campo = document.getElementById(id);
            if (campo) campo.textContent = texto || 'Não informado';
        });
    }


    async function preencherConta() {
        const quem = B.cliente();
        if (!quem) return;
        escreverConta(quem);


        // Atualiza com o que está no banco
        try {
            const atual = await api(`/clientes/${quem.idCli}`);
            B.salvarCliente(atual);
            escreverConta(atual);
        } catch (erro) {
            if (erro.status === 404) {
                B.sair();
                fecharModal();
                aviso('Sua conta não foi encontrada. Entre de novo.', true);
            }
        }
    }


    botaoSair?.addEventListener('click', () => {
        B.sair();
        fecharModal();
        aviso('Você saiu da sua conta.');
    });


    // ---------- Login ----------


    formLogin?.addEventListener('submit', evento => {
        evento.preventDefault();


        const email = document.getElementById('login-email').value.trim();
        const senha = document.getElementById('login-senha').value;


        if (!email || !senha) return erroNoForm('erro-login-cliente', 'Preencha o e-mail e a senha.');


        enviando(formLogin, async () => {
            try {
                const dados = await api('/clientes/login', { metodo: 'POST', corpo: { email, senha } });
                B.salvarCliente(dados);
                formLogin.reset();
                fecharModal();
                aviso(`Bem-vindo(a) de volta, ${dados.nome.split(' ')[0]}!`);
            } catch (erro) {
                erroNoForm('erro-login-cliente', erro.message);
            }
        });
    });


    // ---------- Cadastro ----------


    const formCadastro = document.getElementById('form-cadastro-cliente');
    const campoCepCadastro = document.getElementById('cad-cep');
    const infoCep = document.getElementById('cad-info-cep');
    let enderecoCadastro = null;


    campoCepCadastro?.addEventListener('input', async () => {
        enderecoCadastro = null;
        if (infoCep) infoCep.textContent = '';
        if (apenasNumeros(campoCepCadastro.value).length !== 8) return;


        if (infoCep) infoCep.textContent = 'Buscando endereço...';
        const endereco = await B.buscarCEP(campoCepCadastro.value);


        if (apenasNumeros(campoCepCadastro.value) !== apenasNumeros(endereco?.cep)) {
            if (infoCep && !endereco) infoCep.textContent = 'Não encontramos esse CEP. Você pode completar o endereço no checkout.';
            return;
        }


        enderecoCadastro = endereco;
        if (infoCep) {
            infoCep.textContent = '📍 ' + [endereco.rua, endereco.bairro, `${endereco.cidade} - ${endereco.estado}`]
                .filter(Boolean).join(', ');
        }
    });


    formCadastro?.addEventListener('submit', evento => {
        evento.preventDefault();


        const valor = id => (document.getElementById(id)?.value || '').trim();
        const dados = {
            nome: valor('cad-nome'),
            email: valor('cad-email'),
            cpf: valor('cad-cpf'),
            telefone: valor('cad-telefone'),
            cep: valor('cad-cep'),
            numero: valor('cad-numero'),
            complemento: valor('cad-complemento'),
            senha: document.getElementById('cad-senha')?.value || ''
        };
        const confirmar = document.getElementById('cad-confirmar-senha')?.value || '';
        const erro = mensagem => erroNoForm('erro-cadastro-cliente', mensagem);


        if (dados.nome.length < 3) return erro('Digite seu nome completo.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) return erro('Digite um e-mail válido.');
        if (apenasNumeros(dados.cpf).length !== 11) return erro('O CPF precisa ter 11 números.');
        if (apenasNumeros(dados.telefone).length < 10) return erro('Digite o telefone com DDD.');
        if (apenasNumeros(dados.cep).length !== 8) return erro('O CEP precisa ter 8 números.');
        if (!dados.numero) return erro('Digite o número do endereço.');
        if (dados.senha.length < 6) return erro('A senha precisa ter pelo menos 6 caracteres.');
        if (dados.senha !== confirmar) return erro('As duas senhas não são iguais.');


        const endereco = enderecoCadastro || {};


        enviando(formCadastro, async () => {
            try {
                const novo = await api('/clientes', {
                    metodo: 'POST',
                    corpo: {
                        ...dados,
                        rua: endereco.rua || null,
                        bairro: endereco.bairro || null,
                        cidade: endereco.cidade || null,
                        estado: endereco.estado || null
                    }
                });


                B.salvarCliente(novo);
                formCadastro.reset();
                enderecoCadastro = null;
                if (infoCep) infoCep.textContent = '';
                fecharModal();
                aviso(`Conta criada! Bem-vindo(a), ${novo.nome.split(' ')[0]}.`);
            } catch (falha) {
                erro(falha.message);
            }
        });
    });


    // ---------- Esqueci minha senha ----------


    const formRecuperar = document.getElementById('form-recuperar-cliente');


    formRecuperar?.addEventListener('submit', evento => {
        evento.preventDefault();


        const email = document.getElementById('rc-email').value.trim();
        const documento = document.getElementById('rc-cpf').value;
        const novaSenha = document.getElementById('rc-nova').value;
        const confirmar = document.getElementById('rc-confirmar').value;
        const erro = mensagem => erroNoForm('erro-recuperar-cliente', mensagem);


        if (!email || !documento || !novaSenha) return erro('Preencha todos os campos.');
        if (novaSenha.length < 6) return erro('A nova senha precisa ter pelo menos 6 caracteres.');
        if (novaSenha !== confirmar) return erro('As duas senhas não são iguais.');


        enviando(formRecuperar, async () => {
            try {
                await api('/clientes/recuperar-senha', { metodo: 'POST', corpo: { email, documento, novaSenha } });
                formRecuperar.reset();
                mostrarTela('login');
                document.getElementById('login-email').value = email;
                aviso('Senha alterada! Agora é só entrar com a nova senha.');
            } catch (falha) {
                erro(falha.message);
            }
        });
    });


    // ==========================================
    // D. CARRINHO LATERAL
    // ==========================================


    const carrinhoLateral = document.getElementById('carrinho-lateral');
    const fundoCarrinho = document.getElementById('carrinho-fundo');
    const listaCarrinho = document.getElementById('carrinho-itens');
    const contador = document.getElementById('contador-carrinho');
    const totalCarrinho = document.getElementById('preco-total-carrinho');


    function abrirCarrinho() {
        carrinhoLateral?.classList.add('aberto');
        fundoCarrinho?.classList.add('aberto');
    }


    function fecharCarrinho() {
        carrinhoLateral?.classList.remove('aberto');
        fundoCarrinho?.classList.remove('aberto');
    }


    document.getElementById('btn-ver-carrinho')?.addEventListener('click', abrirCarrinho);
    document.getElementById('btn-fechar-carrinho')?.addEventListener('click', fecharCarrinho);
    fundoCarrinho?.addEventListener('click', fecharCarrinho);


    document.addEventListener('keydown', evento => {
        if (evento.key === 'Escape') {
            fecharCarrinho();
            fecharModal();
        }
    });


    function mudarQuantidade(id, diferenca) {
        const lista = B.carrinho.ler();
        const item = lista.find(i => String(i.id) === String(id));
        if (!item) return;


        const nova = item.quantidade + diferenca;


        if (diferenca > 0 && nova > Number(item.estoque || 99)) {
            aviso(`Só temos ${item.estoque} unidade(s) desta flor.`, true);
            return;
        }


        if (nova <= 0) {
            B.carrinho.salvar(lista.filter(i => i !== item));
        } else {
            item.quantidade = nova;
            B.carrinho.salvar(lista);
        }
    }


    function desenharCarrinho() {
        const lista = B.carrinho.ler();
        const quantidade = lista.reduce((soma, item) => soma + item.quantidade, 0);
        const total = lista.reduce((soma, item) => soma + item.preco * item.quantidade, 0);


        if (contador) contador.textContent = quantidade;
        if (totalCarrinho) totalCarrinho.textContent = moeda(total);
        if (!listaCarrinho) return;


        listaCarrinho.replaceChildren();


        if (!lista.length) {
            listaCarrinho.append(criar('p', 'carrinho-vazio', 'Seu carrinho está vazio.'));
            return;
        }


        lista.forEach(item => {
            const linha = criar('div', 'item-carrinho');
            const info = criar('div');


            info.append(
                criar('h4', '', item.nome),
                criar('p', 'vendedor-item', `${item.detalhe} · ${item.loja}`),
                criar('p', '', `Preço: ${moeda(item.preco)}`),
                criar('p', '', `Subtotal: ${moeda(item.preco * item.quantidade)}`)
            );


            const controles = criar('div', 'controles-quantidade');
            const menos = criar('button', '', '−');
            menos.type = 'button';
            menos.setAttribute('aria-label', 'Diminuir quantidade');
            menos.addEventListener('click', () => mudarQuantidade(item.id, -1));


            const mais = criar('button', '', '+');
            mais.type = 'button';
            mais.setAttribute('aria-label', 'Aumentar quantidade');
            mais.addEventListener('click', () => mudarQuantidade(item.id, 1));


            controles.append(menos, criar('span', '', String(item.quantidade)), mais);
            info.append(controles);


            const remover = criar('button', 'remover-item', 'Remover');
            remover.type = 'button';
            remover.addEventListener('click', () => {
                B.carrinho.salvar(B.carrinho.ler().filter(i => String(i.id) !== String(item.id)));
            });


            linha.append(info, remover);
            listaCarrinho.append(linha);
        });
    }


    document.getElementById('btn-finalizar-pedido')?.addEventListener('click', () => {
        if (!B.carrinho.ler().length) {
            aviso('Seu carrinho está vazio!', true);
            return;
        }
        window.location.href = 'checkout.html';
    });


    document.addEventListener('bloom:carrinho', desenharCarrinho);
    window.addEventListener('storage', evento => {
        if (evento.key === 'carrinhoBloomMarketV2') desenharCarrinho();
    });
    desenharCarrinho();


    // ==========================================
    // E. HOME (index.html)
    // ==========================================


    // Região mais perto de cada estado (os 5 polos das lojas)
    const POLO_POR_ESTADO = {
        SP: 'Holambra - SP', MG: 'Holambra - SP', RJ: 'Holambra - SP', ES: 'Holambra - SP',
        PR: 'São José dos Pinhais - PR', SC: 'São José dos Pinhais - PR', RS: 'São José dos Pinhais - PR',
        DF: 'Brasília - DF', GO: 'Brasília - DF', MT: 'Brasília - DF', MS: 'Brasília - DF', TO: 'Brasília - DF',
        PE: 'Gravatá - PE', BA: 'Gravatá - PE', AL: 'Gravatá - PE', SE: 'Gravatá - PE', PB: 'Gravatá - PE',
        RN: 'Gravatá - PE', CE: 'Gravatá - PE', PI: 'Gravatá - PE', MA: 'Gravatá - PE',
        PA: 'Benevides - PA', AM: 'Benevides - PA', AP: 'Benevides - PA', RR: 'Benevides - PA',
        RO: 'Benevides - PA', AC: 'Benevides - PA'
    };


    const campoCEP = document.getElementById('cep');
    const resultadoCEP = document.getElementById('resultado-endereco');


    if (campoCEP && resultadoCEP) {
        campoCEP.setAttribute('inputmode', 'numeric');


        campoCEP.addEventListener('input', async () => {
            campoCEP.value = B.mascaraCEP(campoCEP.value);
            resultadoCEP.replaceChildren();
            resultadoCEP.classList.remove('visivel');


            if (apenasNumeros(campoCEP.value).length !== 8) return;


            resultadoCEP.classList.add('visivel');
            resultadoCEP.append(criar('p', '', 'Buscando endereço...'));


            const endereco = await B.buscarCEP(campoCEP.value);
            resultadoCEP.replaceChildren();


            if (!endereco || apenasNumeros(endereco.cep) !== apenasNumeros(campoCEP.value)) {
                const p = criar('p', '', 'Não encontramos esse CEP. Confira os números e tente novamente.');
                p.style.color = '#c90019';
                resultadoCEP.append(p);
                return;
            }


            const polo = POLO_POR_ESTADO[endereco.estado] || '';
            const botao = criar('button', 'sugestao-endereco');
            botao.type = 'button';
            botao.textContent = `📍 ${[endereco.rua, endereco.bairro, `${endereco.cidade} - ${endereco.estado}`].filter(Boolean).join(', ')}` +
                (polo ? ` — Ver flores de ${polo}` : ' — Ver todas as flores');


            botao.addEventListener('click', () => {
                window.location.href = 'floresdaminharegiao.html' + B.parametros({
                    localizacao: polo,
                    cidade: endereco.cidade,
                    estado: endereco.estado
                });
            });


            resultadoCEP.append(botao);
        });
    }


    // Flores (tipos) com o preço "a partir de"
    const homeFlores = document.getElementById('home-flores');


    if (homeFlores) {
        api('/produtos')
            .then(produtos => {
                homeFlores.replaceChildren();


                produtos.forEach(p => {
                    const cartao = criar('a', 'cartao-flor' + (p.opcoesDisponiveis ? '' : ' cartao-indisponivel'));
                    cartao.href = `floresdaminharegiao.html?idProd=${p.idProd}`;


                    const emoji = criar('span', 'emoji-flor', B.emojiDe(p.nome));
                    emoji.setAttribute('aria-hidden', 'true');


                    cartao.append(
                        emoji,
                        criar('strong', '', p.nome),
                        criar('small', '', p.precoAPartirDe ? `a partir de ${moeda(p.precoAPartirDe)}` : 'Esgotado')
                    );
                    homeFlores.append(cartao);
                });
            })
            .catch(erro => B.mostrarErro(homeFlores, erro));
    }


    // Lojas parceiras
    const homeLojas = document.getElementById('home-lojas');


    if (homeLojas) {
        api('/lojas')
            .then(lojas => {
                homeLojas.replaceChildren();


                lojas.forEach(loja => {
                    const cartao = criar('a', 'cartao-loja-home');
                    cartao.href = `loja.html?id=${loja.idLoja}`;


                    const avatar = criar('span', 'avatar-loja-mini', loja.nome.charAt(0));
                    avatar.setAttribute('aria-hidden', 'true');


                    const info = criar('span', 'info-loja-home');
                    info.append(
                        criar('strong', '', loja.nome),
                        criar('small', '', `📍 ${loja.localizacao}`),
                        criar('small', '', loja.notaMedia
                            ? `★ ${String(loja.notaMedia).replace('.', ',')} · ${loja.produtosNaVitrine} produtos`
                            : `${loja.produtosNaVitrine} produtos`)
                    );


                    cartao.append(avatar, info);
                    homeLojas.append(cartao);
                });
            })
            .catch(erro => B.mostrarErro(homeLojas, erro));
    }


    // Novidades
    const homeDestaques = document.getElementById('home-destaques');


    if (homeDestaques) {
        B.mostrarCarregando(homeDestaques, 'Carregando flores...');
        api('/variacoes')
            .then(lista => B.mostrarCartoes(homeDestaques, lista.slice(0, 8), 'Nenhuma flor à venda no momento.'))
            .catch(erro => B.mostrarErro(homeDestaques, erro));
    }


    // ==========================================
    // F. VITRINE (floresdaminharegiao.html)
    // ==========================================


    const gradeVitrine = document.getElementById('grid-vitrine');


    if (gradeVitrine) {
        const filtros = {
            flor: document.getElementById('filtro-flor'),
            cor: document.getElementById('filtro-cor'),
            tamanho: document.getElementById('filtro-tamanho'),
            regiao: document.getElementById('filtro-regiao'),
            loja: document.getElementById('filtro-loja'),
            preco: document.getElementById('slider-preco'),
            busca: document.getElementById('busca-flores'),
            ordem: document.getElementById('ordenar-flores')
        };


        const textoPreco = document.getElementById('texto-preco');
        const contagem = document.getElementById('contagem-flores');
        const avisoRegiao = document.getElementById('aviso-regiao');
        const url = new URLSearchParams(window.location.search);
        let precoMaximo = 0;
        let pedidoAtual = 0;
        let timerBusca;


        function preencherSelect(select, opcoes, textoTodos) {
            if (!select) return;
            select.replaceChildren(new Option(textoTodos, ''));
            opcoes.forEach(([valor, texto]) => select.append(new Option(texto, valor)));
        }


        function atualizarTextoPreco() {
            if (!filtros.preco || !textoPreco) return;
            textoPreco.textContent = Number(filtros.preco.value) >= precoMaximo
                ? 'Qualquer preço'
                : `Até ${moeda(filtros.preco.value)}`;
        }


        async function carregarVitrine() {
            const numero = ++pedidoAtual;
            const preco = Number(filtros.preco?.value || 0);


            const consulta = {
                idProd: filtros.flor?.value,
                cor: filtros.cor?.value,
                tamanho: filtros.tamanho?.value,
                localizacao: filtros.regiao?.value,
                idLoja: filtros.loja?.value,
                precoMax: preco && preco < precoMaximo ? preco : '',
                busca: filtros.busca?.value.trim(),
                ordem: filtros.ordem?.value
            };


            // Deixa o endereço da página igual aos filtros (dá para compartilhar)
            history.replaceState(null, '', 'floresdaminharegiao.html' + B.parametros({ ...consulta, ordem: '' }));


            B.mostrarCarregando(gradeVitrine, 'Buscando flores...');
            if (contagem) contagem.textContent = '';


            try {
                const lista = await api('/variacoes' + B.parametros(consulta));
                if (numero !== pedidoAtual) return;


                B.mostrarCartoes(gradeVitrine, lista,
                    'Nenhuma flor encontrada com esses filtros. Tente outra cor, outro tamanho ou outra região.');


                if (contagem) {
                    contagem.textContent = lista.length === 1 ? '1 flor encontrada' : `${lista.length} flores encontradas`;
                }
            } catch (erro) {
                if (numero === pedidoAtual) B.mostrarErro(gradeVitrine, erro);
            }
        }


        function carregarDepois() {
            clearTimeout(timerBusca);
            timerBusca = setTimeout(carregarVitrine, 350);
        }


        async function iniciarVitrine() {
            B.mostrarCarregando(gradeVitrine, 'Carregando filtros...');


            try {
                const opcoes = await api('/variacoes/filtros');


                preencherSelect(filtros.flor, opcoes.produtos.map(p => [p.id, p.nome]), 'Todas as flores');
                preencherSelect(filtros.cor, opcoes.cores.map(c => [c, c]), 'Todas as cores');
                preencherSelect(filtros.tamanho, opcoes.tamanhos.map(t => [t, t]), 'Todos os tamanhos');
                preencherSelect(filtros.regiao, opcoes.localizacoes.map(l => [l, l]), 'Todas as regiões');
                preencherSelect(filtros.loja, opcoes.lojas.map(l => [l.id, l.nome]), 'Todas as lojas');


                precoMaximo = Math.ceil(Number(opcoes.maiorPreco || 200) / 10) * 10;
                if (filtros.preco) {
                    filtros.preco.max = String(precoMaximo);
                    filtros.preco.min = '10';
                    filtros.preco.step = '5';
                    filtros.preco.value = String(precoMaximo);
                }
            } catch (erro) {
                B.mostrarErro(gradeVitrine, erro);
                return;
            }


            // Filtros que vieram no endereço (ex.: da home ou do CEP)
            if (filtros.flor && url.get('idProd')) filtros.flor.value = url.get('idProd');
            if (filtros.cor && url.get('cor')) filtros.cor.value = url.get('cor');
            if (filtros.tamanho && url.get('tamanho')) filtros.tamanho.value = url.get('tamanho');
            if (filtros.regiao && url.get('localizacao')) filtros.regiao.value = url.get('localizacao');
            if (filtros.loja && url.get('idLoja')) filtros.loja.value = url.get('idLoja');
            if (filtros.busca && url.get('busca')) filtros.busca.value = url.get('busca');
            if (filtros.preco && url.get('precoMax')) filtros.preco.value = url.get('precoMax');


            if (avisoRegiao && url.get('cidade')) {
                avisoRegiao.hidden = false;
                avisoRegiao.textContent = url.get('localizacao')
                    ? `Endereço: ${url.get('cidade')} - ${url.get('estado') || ''}. Mostrando as flores do polo ${url.get('localizacao')}, o mais perto de você.`
                    : `Endereço: ${url.get('cidade')} - ${url.get('estado') || ''}. Mostrando todas as regiões.`;
            }


            atualizarTextoPreco();
            carregarVitrine();
        }


        [filtros.flor, filtros.cor, filtros.tamanho, filtros.regiao, filtros.loja, filtros.ordem].forEach(campo => {
            campo?.addEventListener('change', carregarVitrine);
        });


        filtros.preco?.addEventListener('input', () => {
            atualizarTextoPreco();
            carregarDepois();
        });


        filtros.busca?.addEventListener('input', carregarDepois);


        document.getElementById('btn-limpar-filtros')?.addEventListener('click', () => {
            ['flor', 'cor', 'tamanho', 'regiao', 'loja'].forEach(chave => { if (filtros[chave]) filtros[chave].value = ''; });
            if (filtros.busca) filtros.busca.value = '';
            if (filtros.preco) filtros.preco.value = String(precoMaximo);
            if (avisoRegiao) avisoRegiao.hidden = true;
            atualizarTextoPreco();
            carregarVitrine();
        });


        iniciarVitrine();
    }


    // ==========================================
    // G. PÁGINA DE AVALIAÇÕES (avaliacao.html)
    // ==========================================


    const listaAvaliacoes = document.getElementById('lista-avaliacoes');


    if (listaAvaliacoes) {
        // O formulário antigo vira uma explicação: agora só avalia quem comprou
        const formulario = document.querySelector('.formulario-avaliacao');


        if (formulario) {
            formulario.replaceChildren();


            const titulo = criar('h2', '', 'Avalie sua compra');
            const texto = criar('p', '', 'No BloomMarket, só quem comprou pode avaliar. Assim toda avaliação é de uma compra verificada.');
            const passos = criar('ol', 'passos-avaliar');
            ['Entre na sua conta.', 'Abra "Meus pedidos".', 'No pedido entregue, clique em "Avaliar esta compra".']
                .forEach(passo => passos.append(criar('li', '', passo)));


            const link = criar('a', 'botao-principal', 'Ir para Meus pedidos');
            link.href = 'meus-pedidos.html';


            formulario.append(titulo, texto, passos, link);
        }


        B.mostrarCarregando(listaAvaliacoes, 'Carregando avaliações...');


        api('/avaliacoes')
            .then(avaliacoes => {
                listaAvaliacoes.replaceChildren();


                if (!avaliacoes.length) {
                    listaAvaliacoes.append(criar('p', 'mensagem-sem-avaliacoes', 'Ainda não há avaliações.'));
                    return;
                }


                const media = avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length;
                const resumo = criar('p', 'resumo-avaliacoes');
                resumo.append(
                    criar('strong', 'estrelas-douradas', `★ ${media.toFixed(1).replace('.', ',')}`),
                    ` de 5, em ${avaliacoes.length} ${avaliacoes.length === 1 ? 'avaliação' : 'avaliações'} de compras verificadas`
                );
                listaAvaliacoes.append(resumo);


                avaliacoes.forEach(a => {
                    const cartao = criar('article', 'cartao-avaliacao');


                    const loja = criar('p', 'regiao-avaliacao');
                    const linkLoja = criar('a', 'link-loja', a.loja);
                    linkLoja.href = `loja.html?id=${a.idLoja}`;
                    loja.append('Loja: ', linkLoja, ` · ${a.produtos}`);


                    const nota = criar('p', 'estrelas-avaliacao', B.estrelas(a.nota));
                    nota.setAttribute('aria-label', `Nota ${a.nota} de 5`);


                    cartao.append(criar('h3', '', a.cliente), loja, nota);
                    if (a.comentario) cartao.append(criar('p', 'comentario-avaliacao', a.comentario));
                    cartao.append(criar('p', 'selo-verificada', `✔ Compra verificada · ${B.dataBR(a.data)}`));


                    listaAvaliacoes.append(cartao);
                });
            })
            .catch(erro => B.mostrarErro(listaAvaliacoes, erro));
    }


    // ==========================================
    // H. PÁGINA DE FAVORITOS (favoritos.html)
    // ==========================================


    const listaFavoritos = document.getElementById('lista-favoritos');


    if (listaFavoritos) {
        const vazio = document.getElementById('favoritos-vazio');
        const contadorFavoritos = document.getElementById('contador-favoritos');


        function atualizarContador() {
            const total = listaFavoritos.querySelectorAll('.cartao-produto').length;
            if (contadorFavoritos) contadorFavoritos.textContent = total === 1 ? '1 flor salva' : `${total} flores salvas`;
            if (vazio) vazio.hidden = total > 0;
        }


        async function carregarFavoritos() {
            const ids = B.favoritos();


            if (!ids.length) {
                listaFavoritos.replaceChildren();
                atualizarContador();
                return;
            }


            B.mostrarCarregando(listaFavoritos, 'Carregando favoritos...');


            try {
                const todas = await api('/variacoes?somenteDisponiveis=false');
                const salvas = ids.map(id => todas.find(v => String(v.idVar) === id)).filter(Boolean);
                listaFavoritos.replaceChildren(...salvas.map(v => B.cartaoVariacao(v)));
                atualizarContador();
            } catch (erro) {
                B.mostrarErro(listaFavoritos, erro);
            }
        }


        document.addEventListener('bloom:favoritos', evento => {
            if (!evento.detail.favorito) {
                listaFavoritos.querySelector(`.cartao-produto[data-id="${evento.detail.id}"]`)?.remove();
                atualizarContador();
            }
        });


        carregarFavoritos();
    }
});



