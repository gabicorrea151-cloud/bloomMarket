// ==================================================
// BLOOMMARKET — PAINEL DO FORNECEDOR
// A loja entra, cadastra produtos (flor, cor, tamanho),
// acompanha os pedidos e muda o status. Tudo no back-end.
// Precisa do script.js carregado antes (objeto Bloom).
// ==================================================

document.addEventListener('DOMContentLoaded', () => {
    const B = window.Bloom;
    const { criar, moeda, api, aviso, apenasNumeros } = B;
    const $ = id => document.getElementById(id);

    const CHAVE_LOJA = 'lojaBloomMarket';

    // ==========================================
    // 1. SESSÃO DA LOJA
    // ==========================================

    function lojaAtual() {
        try {
            return JSON.parse(localStorage.getItem(CHAVE_LOJA));
        } catch (erro) {
            return null;
        }
    }

    function salvarLoja(dados) {
        localStorage.setItem(CHAVE_LOJA, JSON.stringify(dados));
    }

    function sairDaLoja() {
        localStorage.removeItem(CHAVE_LOJA);
    }

    // ==========================================
    // 2. APOIO
    // ==========================================

    function erroNoForm(id, mensagem) {
        const caixa = $(id);
        if (!caixa) return;
        caixa.textContent = mensagem || '';
        caixa.hidden = !mensagem;
    }

    async function enviando(form, acao) {
        const botao = form.querySelector('button[type="submit"]');
        const texto = botao?.textContent;
        if (botao) { botao.disabled = true; botao.textContent = 'Aguarde...'; }
        try {
            await acao();
        } finally {
            if (botao) { botao.disabled = false; botao.textContent = texto; }
        }
    }

    function botaoPequeno(texto, acao, extra) {
        const botao = criar('button', 'botao-pequeno' + (extra ? ` ${extra}` : ''), texto);
        botao.type = 'button';
        botao.addEventListener('click', acao);
        return botao;
    }

    function blocoDetalhe(titulo, linhas) {
        const bloco = criar('div', 'detalhe-pedido');
        bloco.append(criar('span', 'rotulo-detalhe', titulo));
        linhas.filter(Boolean).forEach(linha => {
            bloco.append(typeof linha === 'string' ? criar('p', '', linha) : linha);
        });
        return bloco;
    }

    function mascaraDocumento(texto) {
        const n = apenasNumeros(texto).slice(0, 14);
        if (n.length <= 11) return B.mascaraCPF(n);
        return n
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2');
    }

    [['cf-telefone', B.mascaraTelefone], ['loja-telefone', B.mascaraTelefone],
        ['cf-documento', mascaraDocumento], ['rs-documento', mascaraDocumento]]
        .forEach(([id, mascara]) => {
            $(id)?.addEventListener('input', () => { $(id).value = mascara($(id).value); });
        });

    // ==========================================
    // 3. TELA DE ACESSO (entrar, cadastrar, recuperar)
    // ==========================================

    const formLogin = $('form-login-fornecedor');
    const formCadastro = $('form-cadastro-fornecedor');
    const formRecuperar = $('form-recuperar-senha');
    const abas = $('abas-acesso');

    function mostrarAba(nome) {
        abas.hidden = nome === 'recuperar';
        formLogin.hidden = nome !== 'entrar';
        formCadastro.hidden = nome !== 'cadastrar';
        formRecuperar.hidden = nome !== 'recuperar';

        document.querySelectorAll('[data-aba-acesso]').forEach(aba => {
            const ativa = aba.dataset.abaAcesso === nome;
            aba.classList.toggle('ativa', ativa);
            aba.setAttribute('aria-selected', String(ativa));
        });
    }

    document.querySelectorAll('[data-aba-acesso]').forEach(aba => {
        aba.addEventListener('click', () => mostrarAba(aba.dataset.abaAcesso));
    });

    $('link-esqueci-senha').addEventListener('click', () => {
        $('rs-email').value = $('lf-email').value;
        mostrarAba('recuperar');
    });

    $('link-voltar-login').addEventListener('click', () => mostrarAba('entrar'));

    if (new URLSearchParams(window.location.search).get('cadastro')) mostrarAba('cadastrar');

    formLogin.addEventListener('submit', evento => {
        evento.preventDefault();
        const email = $('lf-email').value.trim();
        const senha = $('lf-senha').value;
        if (!email || !senha) return erroNoForm('erro-login-forn', 'Preencha o e-mail e a senha.');

        enviando(formLogin, async () => {
            try {
                const loja = await api('/lojas/login', { metodo: 'POST', corpo: { email, senha } });
                salvarLoja(loja);
                formLogin.reset();
                erroNoForm('erro-login-forn', '');
                abrirPainel();
                aviso(`Bem-vindo(a), ${loja.responsavel.split(' ')[0]}!`);
            } catch (erro) {
                erroNoForm('erro-login-forn', erro.message);
            }
        });
    });

    formCadastro.addEventListener('submit', evento => {
        evento.preventDefault();
        const v = id => $(id).value.trim();
        const erro = mensagem => erroNoForm('erro-cadastro-forn', mensagem);

        const dados = {
            nome: v('cf-loja'),
            responsavel: v('cf-responsavel'),
            email: v('cf-email'),
            documento: v('cf-documento'),
            telefone: v('cf-telefone'),
            localizacao: v('cf-polo'),
            cidade: v('cf-cidade'),
            descricao: v('cf-descricao'),
            senha: $('cf-senha').value
        };

        if (dados.nome.length < 3) return erro('Digite o nome da loja.');
        if (dados.responsavel.length < 3) return erro('Digite o nome do responsável.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) return erro('Digite um e-mail válido.');
        if (![11, 14].includes(apenasNumeros(dados.documento).length)) return erro('Digite um CPF (11 números) ou CNPJ (14 números).');
        if (apenasNumeros(dados.telefone).length < 10) return erro('Digite o telefone com DDD.');
        if (!dados.localizacao) return erro('Escolha a região da loja.');
        if (!dados.cidade) return erro('Digite a cidade.');
        if (dados.senha.length < 6) return erro('A senha precisa ter pelo menos 6 caracteres.');
        if (dados.senha !== $('cf-confirmar').value) return erro('As duas senhas não são iguais.');

        enviando(formCadastro, async () => {
            try {
                const loja = await api('/lojas', { metodo: 'POST', corpo: dados });
                salvarLoja(loja);
                formCadastro.reset();
                erro('');
                abrirPainel();
                aviso('Loja criada! Agora cadastre seu primeiro produto.');
                trocarSecao('novo');
            } catch (falha) {
                erro(falha.message);
            }
        });
    });

    formRecuperar.addEventListener('submit', evento => {
        evento.preventDefault();
        const email = $('rs-email').value.trim();
        const documento = $('rs-documento').value;
        const novaSenha = $('rs-nova').value;
        const erro = mensagem => erroNoForm('erro-recuperar', mensagem);

        if (!email || !documento || !novaSenha) return erro('Preencha todos os campos.');
        if (novaSenha.length < 6) return erro('A nova senha precisa ter pelo menos 6 caracteres.');
        if (novaSenha !== $('rs-confirmar').value) return erro('As duas senhas não são iguais.');

        enviando(formRecuperar, async () => {
            try {
                await api('/lojas/recuperar-senha', { metodo: 'POST', corpo: { email, documento, novaSenha } });
                formRecuperar.reset();
                erro('');
                mostrarAba('entrar');
                $('lf-email').value = email;
                aviso('Senha alterada! Agora é só entrar.');
            } catch (falha) {
                erro(falha.message);
            }
        });
    });

    // ==========================================
    // 4. ABRIR E FECHAR O PAINEL
    // ==========================================

    let produtos = [];
    let flores = [];
    let fotoAtual = '';
    let timerPedidos = null;

    function mostrarAcesso() {
        $('tela-acesso').hidden = false;
        $('painel').hidden = true;
        $('menu-fornecedor').hidden = true;
        $('btn-sair-fornecedor').hidden = true;
        $('btn-voltar-loja').hidden = false;
        clearInterval(timerPedidos);
    }

    async function abrirPainel() {
        const loja = lojaAtual();
        if (!loja) return mostrarAcesso();

        $('tela-acesso').hidden = true;
        $('painel').hidden = false;
        $('menu-fornecedor').hidden = false;
        $('btn-sair-fornecedor').hidden = false;
        $('btn-voltar-loja').hidden = true;

        escreverTopo(loja);
        trocarSecao('produtos');

        // Confere a loja no banco (pode ter sido bloqueada)
        try {
            const atual = await api(`/lojas/${loja.idLoja}`);
            salvarLoja(atual);
            escreverTopo(atual);
        } catch (erro) {
            if ([403, 404].includes(erro.status)) {
                sairDaLoja();
                mostrarAcesso();
                erroNoForm('erro-login-forn', erro.message);
                return;
            }
        }

        carregarFlores();
        atualizarTudo();

        clearInterval(timerPedidos);
        timerPedidos = setInterval(() => {
            if (document.visibilityState === 'visible') {
                carregarResumo();
                carregarPedidos();
            }
        }, 30000);
    }

    function escreverTopo(loja) {
        $('painel-titulo').textContent = `Olá, ${loja.nome}!`;
        $('painel-polo').textContent = `${loja.localizacao}`;
        $('link-minha-vitrine').href = `loja.html?id=${loja.idLoja}`;
    }

    // Sair do painel: volta para a página inicial do site
    $('btn-sair-fornecedor').addEventListener('click', () => {
        sairDaLoja();
        try {
            sessionStorage.setItem('avisoBloomMarket', 'Você saiu do painel da loja.');
        } catch (erro) {
            // sem aviso, tudo bem
        }
        window.location.href = 'index.html';
    });

    function atualizarTudo() {
        carregarResumo();
        carregarProdutos();
        carregarPedidos();
        preencherFormLoja();
    }

    // Trata o caso de a loja ser bloqueada no meio do uso
    function erroDaLoja(erro) {
        if (erro.status === 403) {
            sairDaLoja();
            mostrarAcesso();
            erroNoForm('erro-login-forn', erro.message);
        } else {
            aviso(erro.message, true);
        }
    }

    // ==========================================
    // 5. MENU DO PAINEL
    // ==========================================

    function trocarSecao(nome) {
        document.querySelectorAll('[data-menu-painel]').forEach(botao => {
            const ativo = botao.dataset.menuPainel === nome;
            botao.classList.toggle('ativo', ativo);
            if (ativo) botao.setAttribute('aria-current', 'page');
            else botao.removeAttribute('aria-current');
        });

        document.querySelectorAll('.painel-secao').forEach(secao => {
            secao.hidden = secao.dataset.secao !== nome;
        });
    }

    document.querySelectorAll('[data-menu-painel]').forEach(botao => {
        botao.addEventListener('click', () => {
            if (botao.dataset.menuPainel === 'novo') limparFormProduto();
            trocarSecao(botao.dataset.menuPainel);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    $('btn-ir-novo-produto').addEventListener('click', () => {
        limparFormProduto();
        trocarSecao('novo');
    });

    // ==========================================
    // 6. RESUMO (os 4 números do topo)
    // ==========================================

    async function carregarResumo() {
        const loja = lojaAtual();
        if (!loja) return;

        try {
            const r = await api(`/lojas/${loja.idLoja}/resumo`);
            $('resumo-produtos').textContent = r.produtosNaVitrine;
            $('resumo-pedidos-novos').textContent = r.pedidosNovos;
            $('resumo-faturamento').textContent = moeda(r.faturamento);
            $('resumo-itens').textContent = r.itensVendidos;

            const badge = $('badge-pedidos');
            badge.textContent = r.pedidosNovos;
            badge.hidden = r.pedidosNovos === 0;
        } catch (erro) {
            erroDaLoja(erro);
        }
    }

    // ==========================================
    // 7. MEUS PRODUTOS
    // ==========================================

    const listaProdutos = $('lista-produtos-forn');

    async function carregarProdutos() {
        const loja = lojaAtual();
        if (!loja) return;

        B.mostrarCarregando(listaProdutos, 'Carregando produtos...');

        try {
            produtos = await api(`/lojas/${loja.idLoja}/variacoes`);
            mostrarProdutos();
        } catch (erro) {
            B.mostrarErro(listaProdutos, erro);
        }
    }

    function mostrarProdutos() {
        const termo = $('busca-produtos').value.trim().toLowerCase();
        const lista = produtos.filter(p =>
            `${p.produto} ${p.cor} ${p.tamanho}`.toLowerCase().includes(termo));

        listaProdutos.replaceChildren();

        if (!lista.length) {
            const vazio = criar('div', 'lista-vazia');
            vazio.append(criar('p', '', termo ? 'Nenhum produto encontrado com essa busca.' : 'Você ainda não cadastrou produtos.'));
            if (!termo) vazio.append(botaoPequeno('+ Cadastrar o primeiro produto', () => { limparFormProduto(); trocarSecao('novo'); }));
            listaProdutos.append(vazio);
            return;
        }

        lista.forEach(p => {
            const item = criar('article', 'item-produto-forn');

            const foto = criar('img');
            foto.src = B.imagemDe(p);
            foto.alt = `${B.nomeDe(p)} ${p.cor}`;

            const info = criar('div', 'info-produto');
            let etiqueta;
            if (!p.disponivel) etiqueta = criar('span', 'etiqueta pausado', 'Pausado');
            else if (Number(p.estoque) === 0) etiqueta = criar('span', 'etiqueta sem-estoque', 'Sem estoque');
            else etiqueta = criar('span', 'etiqueta ativo', 'Na vitrine');

            info.append(
                criar('h3', '', B.nomeDe(p)),
                criar('p', 'meta', `${p.cor} · ${p.tamanho} · ${p.estoque} em estoque`),
                criar('p', 'preco', moeda(p.preco)),
                etiqueta
            );

            const acoes = criar('div', 'acoes-item');
            acoes.append(
                botaoPequeno('Editar', () => editarProduto(p)),
                botaoPequeno(p.disponivel ? 'Pausar' : 'Ativar', () => alternarProduto(p)),
                botaoPequeno('Excluir', () => excluirProduto(p), 'perigo')
            );

            item.append(foto, info, acoes);
            listaProdutos.append(item);
        });
    }

    $('busca-produtos').addEventListener('input', mostrarProdutos);

    function corpoProduto(p, mudancas = {}) {
        return {
            idLoja: lojaAtual().idLoja,
            idProd: p.idProd,
            cor: p.cor,
            tamanho: p.tamanho,
            preco: p.preco,
            estoque: p.estoque,
            disponivel: p.disponivel,
            descricao: p.descricao,
            imagem: p.imagem,
            ...mudancas
        };
    }

    async function alternarProduto(p) {
        try {
            await api(`/variacoes/${p.idVar}`, { metodo: 'PUT', corpo: corpoProduto(p, { disponivel: !p.disponivel }) });
            aviso(p.disponivel ? 'Produto pausado: saiu da vitrine.' : 'Produto ativado: voltou para a vitrine.');
            carregarProdutos();
            carregarResumo();
        } catch (erro) {
            erroDaLoja(erro);
        }
    }

    async function excluirProduto(p) {
        if (!confirm(`Excluir "${B.nomeDe(p)} ${p.cor} ${p.tamanho}"?`)) return;

        try {
            await api(`/variacoes/${p.idVar}?idLoja=${lojaAtual().idLoja}`, { metodo: 'DELETE' });
            aviso('Produto excluído.');
            carregarProdutos();
            carregarResumo();
        } catch (erro) {
            // Produto já vendido não pode ser apagado (o back-end avisa)
            aviso(erro.message, true);
        }
    }

    // ==========================================
    // 8. NOVO PRODUTO / EDITAR
    // ==========================================

    const formProduto = $('form-produto');
    const preview = $('produto-preview');

    async function carregarFlores() {
        try {
            flores = await api('/produtos');
            const select = $('produto-flor');
            const escolhida = select.value;
            select.replaceChildren(new Option('Selecione a flor', ''));
            flores.forEach(f => select.append(new Option(f.nome, f.idProd)));
            select.value = escolhida;
        } catch (erro) {
            aviso(erro.message, true);
        }
    }

    function mostrarFoto(endereco) {
        fotoAtual = endereco || '';
        preview.hidden = !fotoAtual;
        $('btn-remover-foto').hidden = !fotoAtual;
        if (fotoAtual) preview.src = fotoAtual;
        else preview.removeAttribute('src');
    }

    function limparFormProduto() {
        formProduto.reset();
        $('produto-id').value = '';
        $('titulo-form-produto').textContent = 'Novo produto';
        $('btn-salvar-produto').textContent = 'Cadastrar produto';
        $('btn-cancelar-edicao').hidden = true;
        $('produto-ativo').checked = true;
        mostrarFoto('');
        erroNoForm('erro-produto', '');
    }

    function editarProduto(p) {
        limparFormProduto();
        $('produto-id').value = p.idVar;
        $('produto-flor').value = String(p.idProd);
        $('produto-cor').value = p.cor;
        $('produto-tamanho').value = p.tamanho;
        $('produto-preco').value = p.preco;
        $('produto-estoque').value = p.estoque;
        $('produto-descricao').value = p.descricao || '';
        $('produto-ativo').checked = Boolean(p.disponivel);
        mostrarFoto(p.imagem || '');

        $('titulo-form-produto').textContent = `Editar ${B.nomeDe(p)}`;
        $('btn-salvar-produto').textContent = 'Salvar alterações';
        $('btn-cancelar-edicao').hidden = false;
        trocarSecao('novo');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    $('btn-cancelar-edicao').addEventListener('click', () => {
        limparFormProduto();
        trocarSecao('produtos');
    });

    $('btn-remover-foto').addEventListener('click', () => {
        $('produto-foto').value = '';
        mostrarFoto('');
    });

    // Diminui a foto antes de mandar (o banco aceita até ~2 MB)
    $('produto-foto').addEventListener('change', () => {
        const arquivo = $('produto-foto').files[0];
        if (!arquivo) return;

        if (!arquivo.type.startsWith('image/')) {
            erroNoForm('erro-produto', 'Escolha um arquivo de imagem.');
            return;
        }

        const leitor = new FileReader();
        leitor.onload = () => {
            const imagem = new Image();
            imagem.onload = () => {
                const lado = 800;
                const escala = Math.min(1, lado / Math.max(imagem.width, imagem.height));
                const tela = document.createElement('canvas');
                tela.width = Math.round(imagem.width * escala);
                tela.height = Math.round(imagem.height * escala);
                tela.getContext('2d').drawImage(imagem, 0, 0, tela.width, tela.height);
                mostrarFoto(tela.toDataURL('image/jpeg', 0.8));
            };
            imagem.onerror = () => erroNoForm('erro-produto', 'Não foi possível ler essa imagem.');
            imagem.src = leitor.result;
        };
        leitor.readAsDataURL(arquivo);
    });

    formProduto.addEventListener('submit', evento => {
        evento.preventDefault();
        const erro = mensagem => erroNoForm('erro-produto', mensagem);
        const id = $('produto-id').value;
        const preco = Number($('produto-preco').value);
        const estoque = Number($('produto-estoque').value);

        const corpo = {
            idLoja: lojaAtual().idLoja,
            idProd: Number($('produto-flor').value),
            cor: $('produto-cor').value.trim(),
            tamanho: $('produto-tamanho').value,
            preco,
            estoque,
            disponivel: $('produto-ativo').checked,
            descricao: $('produto-descricao').value.trim(),
            imagem: fotoAtual || null
        };

        if (!corpo.idProd) return erro('Escolha a flor.');
        if (!corpo.cor) return erro('Digite a cor.');
        if (!corpo.tamanho) return erro('Escolha o tamanho.');
        if (!(preco >= 1)) return erro('O preço precisa ser de pelo menos R$ 1,00.');
        if (!Number.isInteger(estoque) || estoque < 0) return erro('O estoque precisa ser um número inteiro (0 ou mais).');

        enviando(formProduto, async () => {
            try {
                if (id) {
                    await api(`/variacoes/${id}`, { metodo: 'PUT', corpo });
                    aviso('Produto atualizado!');
                } else {
                    await api('/variacoes', { metodo: 'POST', corpo });
                    aviso('Produto cadastrado! Ele já aparece na vitrine.');
                }

                limparFormProduto();
                trocarSecao('produtos');
                carregarProdutos();
                carregarResumo();
            } catch (falha) {
                if (falha.status === 403) erroDaLoja(falha);
                else erro(falha.message);
            }
        });
    });

    // ==========================================
    // 9. PEDIDOS
    // ==========================================

    const listaPedidos = $('lista-pedidos-forn');
    const filtroStatus = $('filtro-status-pedido');

    async function carregarPedidos() {
        const loja = lojaAtual();
        if (!loja) return;

        if (!listaPedidos.children.length) B.mostrarCarregando(listaPedidos, 'Carregando pedidos...');

        try {
            const pedidos = await api(`/lojas/${loja.idLoja}/pedidos${B.parametros({ status: filtroStatus.value })}`);
            mostrarPedidos(pedidos);
        } catch (erro) {
            erroDaLoja(erro);
        }
    }

    function hojeISO() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function mostrarPedidos(pedidos) {
        listaPedidos.replaceChildren();

        if (!pedidos.length) {
            listaPedidos.append(criar('p', 'lista-vazia', filtroStatus.value
                ? 'Nenhum pedido com esse status.'
                : 'Você ainda não recebeu pedidos. Quando um cliente comprar, o pedido aparece aqui.'));
            return;
        }

        pedidos.forEach(p => {
            const cartao = criar('article', 'pedido-card');

            // Topo
            const topo = criar('div', 'pedido-topo');
            const cabecalho = criar('div');
            cabecalho.append(
                criar('h3', '', `Pedido #${p.codigo}`),
                criar('p', 'meta', `Feito em ${B.dataHoraBR(p.dataPedido)}`)
            );

            const etiquetas = criar('div', 'etiquetas-pedido');
            const aberto = !['entregue', 'cancelado'].includes(p.status);
            if (aberto && p.dataEntrega === hojeISO()) {
                etiquetas.append(criar('span', 'etiqueta entrega-hoje', 'Entrega hoje'));
            }
            etiquetas.append(criar('span', `etiqueta status-${p.status}`, B.STATUS[p.status] || p.status));
            if (p.avaliado) etiquetas.append(criar('span', 'etiqueta ativo', '★ Avaliado'));

            topo.append(cabecalho, etiquetas);

            // Detalhes
            const detalhes = criar('div', 'pedido-detalhes');

            detalhes.append(blocoDetalhe('Entrega', [
                `${B.dataBR(p.dataEntrega)}, ${B.PERIODOS[p.periodo] || p.periodo}`,
                `${p.rua}, ${p.numero}${p.complemento ? ' - ' + p.complemento : ''}`,
                `${p.bairro}, ${p.cidade} - ${p.estado}`,
                `CEP ${p.cep}`
            ]));

            const telefone = apenasNumeros(p.telefoneCliente);
            const linkZap = criar('a', 'link-loja', p.telefoneCliente);
            linkZap.href = `https://wa.me/55${telefone}`;
            linkZap.target = '_blank';
            linkZap.rel = 'noopener';
            const linhaTelefone = criar('p');
            linhaTelefone.append('WhatsApp: ', linkZap);

            detalhes.append(blocoDetalhe('Cliente', [p.cliente, linhaTelefone, p.emailCliente]));

            if (p.destinatario || p.mensagem) {
                const presente = blocoDetalhe('Presente', [p.destinatario ? `Para: ${p.destinatario}` : '']);
                if (p.mensagem) presente.append(criar('blockquote', 'mensagem-cartao', `“${p.mensagem}”`));
                detalhes.append(presente);
            }

            detalhes.append(blocoDetalhe('Pagamento', [p.detalhePagamento || p.formaPagamento]));

            // Itens
            const itens = criar('ul', 'pedido-itens');
            p.itens.forEach(item => {
                const linha = criar('li');
                linha.append(
                    criar('span', '', `${item.quantidade}x Arranjo de ${item.produto} (${item.cor}, ${item.tamanho})`),
                    criar('span', '', moeda(item.subtotal))
                );
                itens.append(linha);
            });

            if (Number(p.desconto) > 0) {
                const linha = criar('li', 'linha-frete');
                linha.append(criar('span', '', `Desconto${p.cupom ? ` (cupom ${p.cupom})` : ''}`), criar('span', '', `- ${moeda(p.desconto)}`));
                itens.append(linha);
            }

            const frete = criar('li', 'linha-frete');
            frete.append(criar('span', '', 'Taxa de entrega'), criar('span', '', Number(p.taxaEntrega) > 0 ? moeda(p.taxaEntrega) : 'Grátis'));
            itens.append(frete);

            // Rodapé: total e status
            const rodape = criar('div', 'pedido-rodape');
            const rotulo = criar('label', '', 'Status ');
            const seletor = criar('select');

            Object.entries(B.STATUS).forEach(([valor, texto]) => {
                const opcao = new Option(texto, valor);
                opcao.selected = valor === p.status;
                seletor.append(opcao);
            });

            seletor.addEventListener('change', () => mudarStatus(p, seletor));
            rotulo.append(seletor);

            rodape.append(criar('strong', '', `Total: ${moeda(p.total)}`), rotulo);
            cartao.append(topo, detalhes, itens, rodape);
            listaPedidos.append(cartao);
        });
    }

    async function mudarStatus(p, seletor) {
        const novo = seletor.value;

        if (novo === 'cancelado' && !confirm(`Cancelar o pedido #${p.codigo}? Os produtos voltam para o estoque.`)) {
            seletor.value = p.status;
            return;
        }

        seletor.disabled = true;

        try {
            await api(`/pedidos/${p.idPedido}/status`, { metodo: 'PUT', corpo: { idLoja: lojaAtual().idLoja, status: novo } });
            aviso(`Pedido #${p.codigo}: ${B.STATUS[novo]}.`);
            carregarPedidos();
            carregarResumo();
            carregarProdutos();
        } catch (erro) {
            seletor.value = p.status;
            seletor.disabled = false;
            erroDaLoja(erro);
        }
    }

    filtroStatus.addEventListener('change', () => {
        listaPedidos.replaceChildren();
        carregarPedidos();
    });

    $('btn-atualizar-pedidos').addEventListener('click', () => {
        carregarPedidos();
        carregarResumo();
        aviso('Pedidos atualizados.');
    });

    // ==========================================
    // 10. MINHA LOJA (dados e senha)
    // ==========================================

    function preencherFormLoja() {
        const loja = lojaAtual();
        if (!loja) return;
        $('loja-nome').value = loja.nome;
        $('loja-responsavel').value = loja.responsavel;
        $('loja-email').value = loja.email;
        $('loja-telefone').value = loja.telefone;
        $('loja-cidade').value = loja.cidade;
        $('loja-polo').value = loja.localizacao;
        $('loja-descricao').value = loja.descricao || '';
    }

    $('form-loja').addEventListener('submit', evento => {
        evento.preventDefault();
        const v = id => $(id).value.trim();
        const erro = mensagem => erroNoForm('erro-loja', mensagem);

        const dados = {
            nome: v('loja-nome'),
            responsavel: v('loja-responsavel'),
            telefone: v('loja-telefone'),
            localizacao: v('loja-polo'),
            cidade: v('loja-cidade'),
            descricao: v('loja-descricao')
        };

        if (dados.nome.length < 3) return erro('Digite o nome da loja.');
        if (dados.responsavel.length < 3) return erro('Digite o nome do responsável.');
        if (apenasNumeros(dados.telefone).length < 10) return erro('Digite o telefone com DDD.');
        if (!dados.cidade) return erro('Digite a cidade.');

        enviando($('form-loja'), async () => {
            try {
                const atual = await api(`/lojas/${lojaAtual().idLoja}`, { metodo: 'PUT', corpo: dados });
                salvarLoja(atual);
                escreverTopo(atual);
                erro('');
                aviso('Dados da loja salvos!');
                carregarProdutos();
            } catch (falha) {
                if (falha.status === 403) erroDaLoja(falha);
                else erro(falha.message);
            }
        });
    });

    $('form-senha').addEventListener('submit', evento => {
        evento.preventDefault();
        const senhaAtual = $('senha-atual').value;
        const novaSenha = $('senha-nova').value;
        const erro = mensagem => erroNoForm('erro-senha', mensagem);

        if (!senhaAtual || !novaSenha) return erro('Preencha a senha atual e a nova.');
        if (novaSenha.length < 6) return erro('A nova senha precisa ter pelo menos 6 caracteres.');
        if (novaSenha !== $('senha-confirmar').value) return erro('As duas senhas novas não são iguais.');

        enviando($('form-senha'), async () => {
            try {
                await api(`/lojas/${lojaAtual().idLoja}/senha`, { metodo: 'PUT', corpo: { senhaAtual, novaSenha } });
                $('form-senha').reset();
                erro('');
                aviso('Senha alterada!');
            } catch (falha) {
                erro(falha.message);
            }
        });
    });

    // ==========================================
    // 11. INÍCIO
    // ==========================================

    if (lojaAtual()) abrirPainel();
    else mostrarAcesso();
});
