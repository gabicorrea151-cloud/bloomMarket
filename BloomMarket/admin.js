// ==================================================
// BLOOMMARKET — PAINEL DO ADMINISTRADOR
// Quem cuida da plataforma: vê números gerais, todas as lojas,
// pedidos, clientes e avaliações, bloqueia lojas, cria cupons
// e carrega dados de demonstração para a apresentação.
// Tudo é simulado com localStorage (fica salvo só neste navegador).
// ==================================================


document.addEventListener('DOMContentLoaded', () => {


    // ==========================================
    // 1. CONFIGURAÇÕES
    // ==========================================


    // Acesso de demonstração (num site real, isso ficaria no servidor)
    const ADMIN = {
        email: 'admin@bloommarket.com',
        senha: 'admin123'
    };


    const CHAVES = {
        fornecedores: 'fornecedoresBloomMarket',
        sessaoFornecedor: 'sessaoFornecedorBloomMarket',
        produtos: 'produtosFornecedoresBloomMarket',
        pedidos: 'pedidosBloomMarket',
        clientes: 'clientesBloomMarket',
        sessaoCliente: 'sessaoClienteBloomMarket',
        avaliacoes: 'avaliacoesBloomMarket',
        avaliacoesLojas: 'avaliacoesLojasBloomMarket',
        favoritos: 'favoritosBloomMarket',
        carrinho: 'carrinhoBloomMarket',
        cupons: 'cuponsBloomMarket',
        sessaoAdmin: 'sessaoAdminBloomMarket'
    };


    // Cupons que já vêm no site (os mesmos do checkout.js)
    const CUPONS_PADRAO = [
        { codigo: 'BLOOM10', tipo: 'porcentagem', valor: 10, minimo: 0, validade: '', limiteUsos: 0, usos: 0, primeiraCompra: false, ativo: true },
        { codigo: 'PRIMEIRACOMPRA', tipo: 'porcentagem', valor: 15, minimo: 0, validade: '', limiteUsos: 0, usos: 0, primeiraCompra: true, ativo: true },
        { codigo: 'FRETEGRATIS', tipo: 'frete', valor: 0, minimo: 80, validade: '', limiteUsos: 0, usos: 0, primeiraCompra: false, ativo: true }
    ];


    // Porcentagem que o BloomMarket cobra das lojas em cada venda
    const COMISSAO = 0.10;


    const POLOS = {
        holambra: 'Holambra - SP',
        mantiqueira: 'Mantiqueira - MG',
        'serra-gaucha': 'Serra Gaúcha - RS'
    };


    const STATUS = {
        novo: 'Novo',
        preparo: 'Em preparo',
        entrega: 'Saiu para entrega',
        entregue: 'Entregue',
        cancelado: 'Cancelado'
    };


    const PAGAMENTOS = {
        pix: 'Pix',
        cartao: 'Cartão de crédito',
        dinheiro: 'Dinheiro na entrega'
    };




    // ==========================================
    // 2. FUNÇÕES DE APOIO
    // ==========================================


    function lerLista(chave) {
        try {
            const valor = JSON.parse(localStorage.getItem(chave) || '[]');
            return Array.isArray(valor) ? valor : [];
        } catch (erro) {
            return [];
        }
    }


    function salvar(chave, valor) {
        try {
            localStorage.setItem(chave, JSON.stringify(valor));
            return true;
        } catch (erro) {
            mostrarAviso('Não foi possível salvar neste navegador.', true);
            return false;
        }
    }


    function moeda(valor) {
        return Number(valor || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }


    function arredondar(valor) {
        return Math.round(valor * 100) / 100;
    }


    function criar(tag, classe, texto) {
        const elemento = document.createElement(tag);
        if (classe) elemento.className = classe;
        if (texto !== undefined) elemento.textContent = texto;
        return elemento;
    }


    function dataCurta(iso) {
        const data = new Date(iso);
        return isNaN(data) ? '' : data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }


    // Data local no formato aaaa-mm-dd (hoje ou X dias atrás/à frente)
    function dataLocalISO(dias = 0) {
        const data = new Date();
        data.setDate(data.getDate() + dias);
        return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
    }


    function pedidoValido(pedido) {
        return pedido.status !== 'cancelado';
    }


    function descricaoPagamento(pedido) {
        const detalhe = pedido.pagamentoDetalhe || {};


        if (pedido.pagamento === 'cartao' && detalhe.final) {
            const parte = `${detalhe.bandeira || 'Cartão'} final ${detalhe.final}`;
            return detalhe.parcelas > 1 ? `${parte}, ${detalhe.parcelas}x` : `${parte}, à vista`;
        }


        return PAGAMENTOS[pedido.pagamento] || 'Não informado';
    }


    // Aviso rápido (toast)
    const toast = document.getElementById('toast');
    let timerToast;


    function mostrarAviso(mensagem, erro = false) {
        if (!toast) {
            alert(mensagem);
            return;
        }


        toast.textContent = mensagem;
        toast.classList.toggle('erro', erro);
        toast.classList.add('visivel');


        clearTimeout(timerToast);
        timerToast = setTimeout(() => toast.classList.remove('visivel'), 3200);
    }


    function botaoPequeno(texto, acao, classeExtra) {
        const botao = criar('button', 'botao-pequeno' + (classeExtra ? ` ${classeExtra}` : ''), texto);
        botao.type = 'button';
        botao.addEventListener('click', acao);
        return botao;
    }




    // ==========================================
    // 3. LOGIN DO ADMINISTRADOR
    // ==========================================


    const telaAcesso = document.getElementById('admin-acesso');
    const painel = document.getElementById('admin-painel');
    const menuAdmin = document.getElementById('menu-admin');
    const btnSair = document.getElementById('btn-sair-admin');
    const btnVoltarLoja = document.getElementById('btn-voltar-loja-admin');
    const formLogin = document.getElementById('form-login-admin');


    function adminLogado() {
        try {
            return JSON.parse(localStorage.getItem(CHAVES.sessaoAdmin)) === true;
        } catch (erro) {
            return false;
        }
    }


    function mostrarAcesso() {
        if (telaAcesso) telaAcesso.hidden = false;
        if (painel) painel.hidden = true;
        if (menuAdmin) menuAdmin.hidden = true;
        if (btnSair) btnSair.hidden = true;
        if (btnVoltarLoja) btnVoltarLoja.hidden = false;
    }


    function mostrarPainel() {
        if (telaAcesso) telaAcesso.hidden = true;
        if (painel) painel.hidden = false;
        if (menuAdmin) menuAdmin.hidden = false;
        if (btnSair) btnSair.hidden = false;
        if (btnVoltarLoja) btnVoltarLoja.hidden = true;


        trocarSecao('visao');
        atualizarTudo();
    }


    formLogin?.addEventListener('submit', evento => {
        evento.preventDefault();


        const email = document.getElementById('adm-email').value.trim().toLowerCase();
        const senha = document.getElementById('adm-senha').value;
        const erro = document.getElementById('erro-login-admin');


        if (email !== ADMIN.email || senha !== ADMIN.senha) {
            erro.textContent = 'E-mail ou senha incorretos.';
            erro.hidden = false;
            return;
        }


        erro.hidden = true;
        salvar(CHAVES.sessaoAdmin, true);
        formLogin.reset();
        mostrarPainel();
        mostrarAviso('Bem-vindo(a) ao painel do BloomMarket.');
    });


    btnSair?.addEventListener('click', () => {
        try {
            localStorage.removeItem(CHAVES.sessaoAdmin);
        } catch (erro) {
            console.error(erro);
        }


        mostrarAcesso();
        mostrarAviso('Você saiu do painel administrativo.');
    });


    // Olhinho na senha
    const campoSenha = document.getElementById('adm-senha');


    if (campoSenha) {
        const iconeOlho =
            '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" ' +
            'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';


        const iconeOlhoFechado =
            '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" ' +
            'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-7-11-7a18.45 18.45 0 0 1 5.06-5.94"/>' +
            '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19"/>' +
            '<path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';


        campoSenha.classList.add('campo-com-olho');


        const botaoOlho = criar('button', 'botao-olho');
        botaoOlho.type = 'button';


        const atualizarOlho = mostrando => {
            botaoOlho.innerHTML = mostrando ? iconeOlhoFechado : iconeOlho;
            botaoOlho.setAttribute('aria-label', mostrando ? 'Ocultar senha' : 'Mostrar senha');
            botaoOlho.setAttribute('aria-pressed', String(mostrando));
        };


        atualizarOlho(false);


        botaoOlho.addEventListener('click', () => {
            const vaiMostrar = campoSenha.type === 'password';
            campoSenha.type = vaiMostrar ? 'text' : 'password';
            atualizarOlho(vaiMostrar);
            campoSenha.focus();
        });


        formLogin?.addEventListener('reset', () => {
            campoSenha.type = 'password';
            atualizarOlho(false);
        });


        const envoltorio = criar('div', 'envoltorio-senha');
        campoSenha.parentElement.insertBefore(envoltorio, campoSenha);
        envoltorio.append(campoSenha, botaoOlho);
    }




    // ==========================================
    // 4. NAVEGAÇÃO ENTRE AS SEÇÕES
    // ==========================================


    function trocarSecao(nome) {
        document.querySelectorAll('[data-menu-admin]').forEach(botao => {
            const ativo = botao.dataset.menuAdmin === nome;
            botao.classList.toggle('ativo', ativo);


            if (ativo) {
                botao.setAttribute('aria-current', 'page');
            } else {
                botao.removeAttribute('aria-current');
            }
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


    function atualizarTudo() {
        mostrarVisaoGeral();
        mostrarLojas();
        mostrarPedidos();
        mostrarClientes();
        mostrarAvaliacoes();
        mostrarCupons();
    }




    // ==========================================
    // 5. VISÃO GERAL (NÚMEROS E GRÁFICOS)
    // ==========================================


    function poloDoPedido(pedido, fornecedores) {
        const fornecedor = fornecedores.find(f => f.id === pedido.fornecedorId);
        return fornecedor ? fornecedor.polo : 'bloommarket';
    }


    function mostrarVisaoGeral() {
        const pedidos = lerLista(CHAVES.pedidos);
        const fornecedores = lerLista(CHAVES.fornecedores);
        const clientes = lerLista(CHAVES.clientes);
        const validos = pedidos.filter(pedidoValido);


        const faturamento = arredondar(validos.reduce((soma, p) => soma + Number(p.total || 0), 0));
        const lojasAtivas = fornecedores.filter(f => !f.bloqueado).length;
        const ticket = validos.length ? faturamento / validos.length : 0;


        const valores = {
            'adm-faturamento': moeda(faturamento),
            'adm-comissao': moeda(faturamento * COMISSAO),
            'adm-pedidos': validos.length,
            'adm-ticket': moeda(ticket),
            'adm-lojas': lojasAtivas,
            'adm-clientes': clientes.length,
            'adm-abertos': pedidos.filter(p => ['novo', 'preparo', 'entrega'].includes(p.status)).length,
            'adm-cancelados': pedidos.filter(p => p.status === 'cancelado').length
        };


        Object.entries(valores).forEach(([id, texto]) => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.textContent = texto;
        });


        // ---------- Vendas nos últimos 7 dias (colunas) ----------
        const graficoDias = document.getElementById('grafico-dias');


        if (graficoDias) {
            graficoDias.replaceChildren();


            const dias = [];
            for (let i = 6; i >= 0; i--) dias.push(dataLocalISO(-i));


            const totalPorDia = dias.map(dia => validos
                .filter(p => {
                    const data = new Date(p.data);
                    const local = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
                    return local === dia;
                })
                .reduce((soma, p) => soma + Number(p.total || 0), 0));


            const maior = Math.max(...totalPorDia, 1);


            dias.forEach((dia, indice) => {
                const coluna = criar('div', 'coluna');
                const valor = totalPorDia[indice];


                const texto = criar('span', 'coluna-valor', valor > 0 ? moeda(valor).replace(',00', '') : '');
                const barra = criar('span', 'coluna-barra');
                barra.style.height = `${Math.max(2, (valor / maior) * 100)}%`;
                barra.title = `${moeda(valor)} em ${dia.split('-').reverse().join('/')}`;


                const [, mes, diaNumero] = dia.split('-');
                const rotulo = criar('span', 'coluna-rotulo', indice === 6 ? 'Hoje' : `${diaNumero}/${mes}`);


                coluna.append(texto, barra, rotulo);
                graficoDias.append(coluna);
            });
        }


        // ---------- Vendas por polo (barras) ----------
        const graficoPolos = document.getElementById('grafico-polos');


        if (graficoPolos) {
            graficoPolos.replaceChildren();


            const nomes = { ...POLOS, bloommarket: 'Catálogo BloomMarket' };
            const totais = {};


            validos.forEach(pedido => {
                const polo = poloDoPedido(pedido, fornecedores);
                totais[polo] = (totais[polo] || 0) + Number(pedido.total || 0);
            });


            const maior = Math.max(...Object.values(totais), 1);


            Object.keys(nomes).forEach(polo => {
                const valor = totais[polo] || 0;
                if (polo === 'bloommarket' && valor === 0) return;


                const linha = criar('div', 'barra-linha');
                const trilho = criar('div', 'barra-trilho');
                const preenchida = criar('div', 'barra-preenchida');
                preenchida.style.width = `${(valor / maior) * 100}%`;
                trilho.append(preenchida);


                linha.append(criar('span', 'barra-nome', nomes[polo]), trilho, criar('strong', 'barra-valor', moeda(valor)));
                graficoPolos.append(linha);
            });
        }


        // ---------- Lojas que mais vendem ----------
        const listaTop = document.getElementById('top-lojas');


        if (listaTop) {
            listaTop.replaceChildren();


            const ranking = fornecedores
                .map(f => ({
                    loja: f.loja,
                    polo: POLOS[f.polo] || '',
                    total: validos.filter(p => p.fornecedorId === f.id).reduce((s, p) => s + Number(p.total || 0), 0)
                }))
                .filter(item => item.total > 0)
                .sort((a, b) => b.total - a.total)
                .slice(0, 5);


            if (ranking.length === 0) {
                listaTop.append(criar('li', 'lista-vazia', 'Nenhuma venda de loja parceira ainda.'));
            }


            ranking.forEach((item, posicao) => {
                const linha = criar('li');
                linha.append(
                    criar('span', 'posicao-ranking', `${posicao + 1}º`),
                    criar('span', 'nome-ranking', `${item.loja} (${item.polo})`),
                    criar('strong', '', moeda(item.total))
                );
                listaTop.append(linha);
            });
        }
    }




    // ==========================================
    // 6. LOJAS
    // ==========================================


    const buscaLojas = document.getElementById('busca-lojas');


    function alternarBloqueio(idFornecedor) {
        const fornecedores = lerLista(CHAVES.fornecedores);
        const fornecedor = fornecedores.find(f => f.id === idFornecedor);
        if (!fornecedor) return;


        const vaiBloquear = !fornecedor.bloqueado;


        if (vaiBloquear && !confirm(
            `Bloquear a loja "${fornecedor.loja}"?\n\nOs produtos dela saem da vitrine e ela não consegue mais entrar no painel.`
        )) return;


        fornecedor.bloqueado = vaiBloquear;


        // Tira os produtos da vitrine (e devolve como estavam ao desbloquear)
        const produtos = lerLista(CHAVES.produtos);


        produtos.forEach(produto => {
            if (produto.fornecedorId !== fornecedor.id) return;


            if (vaiBloquear) {
                produto.ativoAntesDoBloqueio = Boolean(produto.ativo);
                produto.ativo = false;
            } else if ('ativoAntesDoBloqueio' in produto) {
                produto.ativo = produto.ativoAntesDoBloqueio;
                delete produto.ativoAntesDoBloqueio;
            }
        });


        if (!salvar(CHAVES.fornecedores, fornecedores)) return;
        if (!salvar(CHAVES.produtos, produtos)) return;


        mostrarAviso(vaiBloquear ? `Loja "${fornecedor.loja}" bloqueada.` : `Loja "${fornecedor.loja}" liberada.`);
        atualizarTudo();
    }


    function mostrarLojas() {
        const lista = document.getElementById('lista-lojas-admin');
        if (!lista) return;


        lista.replaceChildren();


        const termo = (buscaLojas?.value || '').trim().toLowerCase();
        const pedidos = lerLista(CHAVES.pedidos);
        const produtos = lerLista(CHAVES.produtos);


        const fornecedores = lerLista(CHAVES.fornecedores)
            .filter(f => `${f.loja} ${f.cidade} ${f.email}`.toLowerCase().includes(termo))
            .sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));


        if (fornecedores.length === 0) {
            lista.append(criar('p', 'lista-vazia', termo
                ? 'Nenhuma loja encontrada com essa busca.'
                : 'Nenhuma loja cadastrada ainda. Use a aba "Dados" para carregar lojas de demonstração.'));
            return;
        }


        fornecedores.forEach(fornecedor => {
            const pedidosLoja = pedidos.filter(p => p.fornecedorId === fornecedor.id);
            const faturamento = pedidosLoja.filter(pedidoValido).reduce((s, p) => s + Number(p.total || 0), 0);
            const produtosLoja = produtos.filter(p => p.fornecedorId === fornecedor.id);


            const item = criar('article', 'item-admin');
            const info = criar('div', 'info-item-admin');


            const titulo = criar('div', 'titulo-item-admin');
            titulo.append(
                criar('h3', '', fornecedor.loja),
                criar('span', `etiqueta ${fornecedor.bloqueado ? 'pausado' : 'ativo'}`, fornecedor.bloqueado ? 'Bloqueada' : 'Ativa')
            );


            const numeros = criar('div', 'numeros-item');
            numeros.append(
                criar('span', '', `${POLOS[fornecedor.polo] || ''}, ${fornecedor.cidade}`),
                criar('span', '', `Responsável: ${fornecedor.responsavel}`),
                criar('span', '', fornecedor.email),
                criar('span', '', fornecedor.telefone),
                criar('span', '', `${produtosLoja.length} produto(s)`),
                criar('span', '', `${pedidosLoja.length} pedido(s)`),
                criar('strong', '', `Vendas: ${moeda(faturamento)}`)
            );


            info.append(titulo, numeros);


            const acoes = criar('div', 'acoes-item');
            acoes.append(botaoPequeno(
                fornecedor.bloqueado ? 'Desbloquear' : 'Bloquear',
                () => alternarBloqueio(fornecedor.id),
                fornecedor.bloqueado ? '' : 'perigo'
            ));


            item.append(info, acoes);
            lista.append(item);
        });
    }


    buscaLojas?.addEventListener('input', mostrarLojas);




    // ==========================================
    // 7. PEDIDOS (TODAS AS LOJAS)
    // ==========================================


    const filtroStatus = document.getElementById('filtro-status-admin');
    const filtroLoja = document.getElementById('filtro-loja-admin');
    const buscaPedidos = document.getElementById('busca-pedidos-admin');


    function atualizarOpcoesLoja() {
        if (!filtroLoja) return;


        const escolhida = filtroLoja.value;
        filtroLoja.replaceChildren();


        const todas = criar('option', '', 'Todas as lojas');
        todas.value = 'todas';
        filtroLoja.append(todas);


        lerLista(CHAVES.fornecedores).forEach(f => {
            const opcao = criar('option', '', f.loja);
            opcao.value = f.id;
            filtroLoja.append(opcao);
        });


        const catalogo = criar('option', '', 'Catálogo BloomMarket');
        catalogo.value = 'bloommarket';
        filtroLoja.append(catalogo);


        filtroLoja.value = [...filtroLoja.options].some(o => o.value === escolhida) ? escolhida : 'todas';
    }


    function mostrarPedidos() {
        const lista = document.getElementById('lista-pedidos-admin');
        if (!lista) return;


        atualizarOpcoesLoja();
        lista.replaceChildren();


        const status = filtroStatus?.value || 'todos';
        const loja = filtroLoja?.value || 'todas';
        const termo = (buscaPedidos?.value || '').trim().toLowerCase().replace('#', '');


        const pedidos = lerLista(CHAVES.pedidos)
            .filter(p => status === 'todos' || p.status === status)
            .filter(p => loja === 'todas' || (loja === 'bloommarket' ? !p.fornecedorId : p.fornecedorId === loja))
            .filter(p => !termo || `${p.codigo} ${p.cliente}`.toLowerCase().includes(termo))
            .sort((a, b) => String(b.data).localeCompare(String(a.data)));


        const contador = document.getElementById('contador-pedidos-admin');
        if (contador) contador.textContent = `${pedidos.length} pedido(s)`;


        if (pedidos.length === 0) {
            lista.append(criar('p', 'lista-vazia', 'Nenhum pedido encontrado com esses filtros.'));
            return;
        }


        pedidos.forEach(pedido => {
            const item = criar('article', 'item-admin');
            const info = criar('div', 'info-item-admin');


            const titulo = criar('div', 'titulo-item-admin');
            titulo.append(
                criar('h3', '', `Pedido #${pedido.codigo}`),
                criar('span', `etiqueta status-${pedido.status}`, STATUS[pedido.status] || pedido.status)
            );


            const quantidade = (pedido.itens || []).reduce((s, i) => s + Number(i.quantidade || 0), 0);


            const numeros = criar('div', 'numeros-item');
            numeros.append(
                criar('span', '', dataCurta(pedido.data)),
                criar('span', '', `Loja: ${pedido.loja}`),
                criar('span', '', `Cliente: ${pedido.cliente || 'não informado'}`),
                criar('span', '', `${quantidade} item(ns)`),
                criar('span', '', descricaoPagamento(pedido)),
                criar('strong', '', moeda(pedido.total))
            );


            const itens = criar('p', 'itens-resumidos',
                (pedido.itens || []).map(i => `${i.quantidade}x ${i.nome}`).join(', '));


            info.append(titulo, numeros, itens);
            item.append(info);
            lista.append(item);
        });
    }


    [filtroStatus, filtroLoja].forEach(campo => campo?.addEventListener('change', mostrarPedidos));
    buscaPedidos?.addEventListener('input', mostrarPedidos);




    // ==========================================
    // 8. CLIENTES
    // ==========================================


    function mostrarClientes() {
        const lista = document.getElementById('lista-clientes-admin');
        if (!lista) return;


        lista.replaceChildren();


        const pedidos = lerLista(CHAVES.pedidos);
        const clientes = lerLista(CHAVES.clientes)
            .sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));


        if (clientes.length === 0) {
            lista.append(criar('p', 'lista-vazia', 'Nenhum cliente cadastrado ainda.'));
            return;
        }


        clientes.forEach(cliente => {
            const pedidosCliente = pedidos.filter(p =>
                p.clienteId === cliente.id || p.contato?.email === cliente.email
            );
            const gasto = pedidosCliente.filter(pedidoValido).reduce((s, p) => s + Number(p.total || 0), 0);
            const endereco = cliente.endereco || {};


            const item = criar('article', 'item-admin');
            const info = criar('div', 'info-item-admin');


            info.append(criar('h3', '', cliente.nome));


            const numeros = criar('div', 'numeros-item');
            numeros.append(
                criar('span', '', cliente.email),
                criar('span', '', cliente.telefone || 'sem telefone'),
                criar('span', '', endereco.cidade ? `${endereco.cidade} - ${endereco.estado}` : `CEP ${endereco.cep || '-'}`),
                criar('span', '', `Cliente desde ${dataCurta(cliente.criadoEm).split(' ')[0]}`),
                criar('span', '', `${pedidosCliente.length} pedido(s)`),
                criar('strong', '', `Gastou ${moeda(gasto)}`)
            );


            info.append(numeros);
            item.append(info);
            lista.append(item);
        });
    }




    // ==========================================
    // 9. AVALIAÇÕES (MODERAÇÃO)
    // Duas listas: avaliações do site e avaliações das lojas
    // ==========================================


    function mostrarAvaliacoes() {
        const lista = document.getElementById('lista-avaliacoes-admin');
        if (!lista) return;


        lista.replaceChildren();


        // ---------- Avaliações das lojas (compra verificada) ----------
        const avaliacoesLojas = lerLista(CHAVES.avaliacoesLojas)
            .sort((a, b) => String(b.data).localeCompare(String(a.data)));


        const mediaLojas = avaliacoesLojas.length
            ? avaliacoesLojas.reduce((s, a) => s + Number(a.nota || 0), 0) / avaliacoesLojas.length
            : 0;


        const tituloLojas = criar('div', 'titulo-grupo-admin');
        tituloLojas.append(
            criar('h2', '', 'Avaliações das lojas'),
            criar('span', 'meta', avaliacoesLojas.length
                ? `Nota média: ${mediaLojas.toFixed(1).replace('.', ',')} de 5 (${avaliacoesLojas.length})`
                : 'Nenhuma ainda')
        );
        lista.append(tituloLojas);


        if (avaliacoesLojas.length === 0) {
            lista.append(criar('p', 'lista-vazia', 'Quando um cliente avaliar um pedido entregue, a avaliação aparece aqui.'));
        }


        avaliacoesLojas.forEach(avaliacao => {
            const item = criar('article', 'item-admin');
            const info = criar('div', 'info-item-admin');


            const titulo = criar('div', 'titulo-item-admin');
            titulo.append(
                criar('h3', '', avaliacao.nome),
                criar('span', 'estrelas-admin', '★'.repeat(avaliacao.nota) + '☆'.repeat(5 - avaliacao.nota)),
                criar('span', 'etiqueta ativo', 'Compra verificada')
            );


            const data = new Date(avaliacao.data);
            info.append(titulo, criar('p', 'meta', `Loja: ${avaliacao.loja}${isNaN(data) ? '' : `, em ${data.toLocaleDateString('pt-BR')}`}`));
            if (avaliacao.comentario) info.append(criar('p', 'comentario-admin', `“${avaliacao.comentario}”`));


            const acoes = criar('div', 'acoes-item');
            acoes.append(botaoPequeno('Excluir', () => {
                if (!confirm(`Excluir a avaliação de ${avaliacao.nome} sobre ${avaliacao.loja}?`)) return;


                const restantes = lerLista(CHAVES.avaliacoesLojas).filter(a => a.id !== avaliacao.id);


                if (salvar(CHAVES.avaliacoesLojas, restantes)) {
                    mostrarAviso('Avaliação da loja excluída.');
                    mostrarAvaliacoes();
                }
            }, 'perigo'));


            item.append(info, acoes);
            lista.append(item);
        });


        // ---------- Avaliações do site ----------
        const avaliacoes = lerLista(CHAVES.avaliacoes);


        const tituloSite = criar('div', 'titulo-grupo-admin');
        tituloSite.append(
            criar('h2', '', 'Avaliações do site'),
            criar('span', 'meta', 'Página "Avaliação"')
        );
        lista.append(tituloSite);


        const media = avaliacoes.length
            ? avaliacoes.reduce((s, a) => s + Number(a.nota || 0), 0) / avaliacoes.length
            : 0;


        const campoMedia = document.getElementById('media-avaliacoes');
        if (campoMedia) {
            campoMedia.textContent = avaliacoes.length
                ? `Nota média do site: ${media.toFixed(1).replace('.', ',')} de 5 (${avaliacoes.length} avaliações)`
                : 'Nenhuma avaliação do site ainda.';
        }


        if (avaliacoes.length === 0) {
            lista.append(criar('p', 'lista-vazia', 'Nenhuma avaliação do site ainda.'));
        }


        avaliacoes.forEach((avaliacao, indice) => {
            const item = criar('article', 'item-admin');
            const info = criar('div', 'info-item-admin');


            const titulo = criar('div', 'titulo-item-admin');
            titulo.append(
                criar('h3', '', avaliacao.nome),
                criar('span', 'estrelas-admin', '★'.repeat(avaliacao.nota) + '☆'.repeat(5 - avaliacao.nota))
            );


            info.append(titulo, criar('p', 'meta', `Região: ${avaliacao.regiao}`));
            if (avaliacao.comentario) info.append(criar('p', 'comentario-admin', `“${avaliacao.comentario}”`));


            const acoes = criar('div', 'acoes-item');
            acoes.append(botaoPequeno('Excluir', () => {
                if (!confirm(`Excluir a avaliação de ${avaliacao.nome}?`)) return;


                const atual = lerLista(CHAVES.avaliacoes);
                atual.splice(indice, 1);


                if (salvar(CHAVES.avaliacoes, atual)) {
                    mostrarAviso('Avaliação excluída.');
                    mostrarAvaliacoes();
                }
            }, 'perigo'));


            item.append(info, acoes);
            lista.append(item);
        });
    }




    // ==========================================
    // 10. CUPONS DE DESCONTO
    // ==========================================


    function lerCupons() {
        try {
            const salvo = localStorage.getItem(CHAVES.cupons);
            if (salvo === null) return CUPONS_PADRAO.map(cupom => ({ ...cupom }));


            const lista = JSON.parse(salvo);
            return Array.isArray(lista) ? lista : [];
        } catch (erro) {
            return CUPONS_PADRAO.map(cupom => ({ ...cupom }));
        }
    }


    function descricaoCupom(cupom) {
        if (cupom.tipo === 'porcentagem') return `${cupom.valor}% de desconto nos produtos`;
        if (cupom.tipo === 'valor') return `${moeda(cupom.valor)} de desconto`;
        return 'Entrega grátis';
    }


    function situacaoCupom(cupom) {
        if (!cupom.ativo) return ['Pausado', 'pausado'];
        if (cupom.validade && cupom.validade < dataLocalISO()) return ['Expirado', 'pausado'];


        if (Number(cupom.limiteUsos) > 0 && Number(cupom.usos || 0) >= Number(cupom.limiteUsos)) {
            return ['Esgotado', 'sem-estoque'];
        }


        return ['Ativo', 'ativo'];
    }


    const formCupom = document.getElementById('form-cupom-admin');
    const campoTipoCupom = document.getElementById('cp-tipo');


    // O campo "valor" muda conforme o tipo de cupom
    function atualizarCampoValorCupom() {
        if (!campoTipoCupom) return;


        const tipo = campoTipoCupom.value;
        const grupoValor = document.getElementById('grupo-cp-valor');
        const rotuloValor = document.getElementById('rotulo-cp-valor');


        if (grupoValor) grupoValor.hidden = tipo === 'frete';
        if (rotuloValor) rotuloValor.textContent = tipo === 'porcentagem' ? 'Desconto (%)' : 'Desconto (R$)';
    }


    campoTipoCupom?.addEventListener('change', atualizarCampoValorCupom);
    atualizarCampoValorCupom();


    formCupom?.addEventListener('submit', evento => {
        evento.preventDefault();


        const erro = document.getElementById('erro-cupom-admin');
        const mostrarErroCupom = mensagem => {
            erro.textContent = mensagem;
            erro.hidden = !mensagem;
        };


        const codigo = document.getElementById('cp-codigo').value.toUpperCase().replace(/\s/g, '');
        const tipo = campoTipoCupom.value;
        const valor = Number(String(document.getElementById('cp-valor').value).replace(',', '.'));
        const minimo = Number(String(document.getElementById('cp-minimo').value || '0').replace(',', '.'));
        const validade = document.getElementById('cp-validade').value;
        const limiteUsos = Number(document.getElementById('cp-limite').value || '0');
        const primeiraCompra = document.getElementById('cp-primeira').checked;


        if (!/^[A-Z0-9]{3,20}$/.test(codigo)) {
            return mostrarErroCupom('O código precisa ter de 3 a 20 letras ou números, sem espaço (ex.: DIADASMAES).');
        }


        const cupons = lerCupons();


        if (cupons.some(c => String(c.codigo).toUpperCase() === codigo)) {
            return mostrarErroCupom('Já existe um cupom com esse código.');
        }


        if (tipo === 'porcentagem' && (!Number.isFinite(valor) || valor < 1 || valor > 90)) {
            return mostrarErroCupom('A porcentagem precisa ser de 1 a 90.');
        }


        if (tipo === 'valor' && (!Number.isFinite(valor) || valor <= 0)) {
            return mostrarErroCupom('Digite o valor do desconto em reais.');
        }


        if (!Number.isFinite(minimo) || minimo < 0) {
            return mostrarErroCupom('O pedido mínimo precisa ser um valor válido (ou 0).');
        }


        if (validade && validade < dataLocalISO()) {
            return mostrarErroCupom('A validade precisa ser de hoje em diante.');
        }


        if (!Number.isInteger(limiteUsos) || limiteUsos < 0) {
            return mostrarErroCupom('O limite de usos precisa ser um número inteiro (0 = sem limite).');
        }


        cupons.unshift({
            codigo,
            tipo,
            valor: tipo === 'frete' ? 0 : arredondar(valor),
            minimo: arredondar(minimo),
            validade,
            limiteUsos,
            usos: 0,
            primeiraCompra,
            ativo: true,
            criadoEm: new Date().toISOString()
        });


        if (!salvar(CHAVES.cupons, cupons)) return;


        formCupom.reset();
        atualizarCampoValorCupom();
        mostrarErroCupom('');
        mostrarAviso(`Cupom ${codigo} criado! Ele já funciona no checkout.`);
        mostrarCupons();
    });


    function alterarCupom(codigo, mudanca) {
        const cupons = lerCupons();
        const cupom = cupons.find(c => c.codigo === codigo);
        if (!cupom) return;


        mudanca(cupom, cupons);
        if (salvar(CHAVES.cupons, cupons)) mostrarCupons();
    }


    function mostrarCupons() {
        const lista = document.getElementById('lista-cupons-admin');
        if (!lista) return;


        lista.replaceChildren();


        const cupons = lerCupons();


        if (cupons.length === 0) {
            lista.append(criar('p', 'lista-vazia', 'Nenhum cupom cadastrado.'));
            return;
        }


        cupons.forEach(cupom => {
            const [textoSituacao, classeSituacao] = situacaoCupom(cupom);


            const item = criar('article', 'item-admin');
            const info = criar('div', 'info-item-admin');


            const titulo = criar('div', 'titulo-item-admin');
            titulo.append(
                criar('h3', 'codigo-cupom', cupom.codigo),
                criar('span', `etiqueta ${classeSituacao}`, textoSituacao)
            );


            const validade = cupom.validade
                ? `Válido até ${cupom.validade.split('-').reverse().join('/')}`
                : 'Sem data de validade';


            const usos = Number(cupom.limiteUsos) > 0
                ? `${cupom.usos || 0} de ${cupom.limiteUsos} usos`
                : `${cupom.usos || 0} uso(s)`;


            const numeros = criar('div', 'numeros-item');
            numeros.append(
                criar('strong', '', descricaoCupom(cupom)),
                criar('span', '', Number(cupom.minimo) > 0 ? `Pedido mínimo: ${moeda(cupom.minimo)}` : 'Sem pedido mínimo'),
                criar('span', '', validade),
                criar('span', '', usos)
            );


            if (cupom.primeiraCompra) numeros.append(criar('span', '', 'Só na primeira compra'));


            info.append(titulo, numeros);


            const acoes = criar('div', 'acoes-item');
            acoes.append(
                botaoPequeno(cupom.ativo ? 'Pausar' : 'Ativar', () => {
                    alterarCupom(cupom.codigo, c => { c.ativo = !c.ativo; });
                    mostrarAviso(cupom.ativo ? `Cupom ${cupom.codigo} pausado.` : `Cupom ${cupom.codigo} ativado.`);
                }),
                botaoPequeno('Excluir', () => {
                    if (!confirm(`Excluir o cupom ${cupom.codigo}?`)) return;


                    alterarCupom(cupom.codigo, (c, todos) => {
                        todos.splice(todos.indexOf(c), 1);
                    });


                    mostrarAviso(`Cupom ${cupom.codigo} excluído.`);
                }, 'perigo')
            );


            item.append(info, acoes);
            lista.append(item);
        });
    }




    // ==========================================
    // 11. DADOS DE DEMONSTRAÇÃO
    // ==========================================


    // Foto simples feita com emoji (não precisa de arquivo de imagem)
    function imagemDemo(emoji, cor) {
        return 'data:image/svg+xml,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">' +
            `<rect width="300" height="200" fill="${cor}"/>` +
            `<text x="150" y="132" font-size="96" text-anchor="middle">${emoji}</text>` +
            '</svg>'
        );
    }


    function gerarDadosDemo() {
        const agora = Date.now();
        const umDia = 24 * 60 * 60 * 1000;


        const lojas = [
            {
                id: 'demo-forn-1', loja: 'Flores de Holambra', responsavel: 'Marina Costa',
                email: 'holambra@demo.com', documento: '12.345.678/0001-90', telefone: '(19) 99876-5432',
                polo: 'holambra', cidade: 'Holambra'
            },
            {
                id: 'demo-forn-2', loja: 'Jardim da Mantiqueira', responsavel: 'Paulo Mendes',
                email: 'mantiqueira@demo.com', documento: '123.456.789-09', telefone: '(35) 99777-1234',
                polo: 'mantiqueira', cidade: 'Gonçalves'
            },
            {
                id: 'demo-forn-3', loja: 'Serra em Flor', responsavel: 'Lúcia Bertoldi',
                email: 'serra@demo.com', documento: '98.765.432/0001-10', telefone: '(54) 99666-4321',
                polo: 'serra-gaucha', cidade: 'Gramado'
            }
        ].map((loja, i) => ({
            ...loja,
            senha: '123456',
            criadoEm: new Date(agora - (30 - i) * umDia).toISOString()
        }));


        const catalogo = [
            ['demo-forn-1', 'Buquê de rosas colombianas', 'buques', 119.90, 12, '🌹', '#fde2e4', 'Doze rosas vermelhas com folhagem e laço de cetim.'],
            ['demo-forn-1', 'Orquídea phalaenopsis dupla', 'orquideas', 149.00, 6, '🌸', '#f3e8ff', 'Duas hastes floridas em vaso de cerâmica.'],
            ['demo-forn-1', 'Arranjo de tulipas holandesas', 'arranjos', 98.00, 2, '🌷', '#ffe5ec', 'Tulipas coloridas em caixa de madeira.'],
            ['demo-forn-2', 'Buquê do campo mineiro', 'buques', 79.90, 15, '💐', '#fff3cd', 'Flores do campo colhidas na serra.'],
            ['demo-forn-2', 'Mini orquídea em cachepô', 'orquideas', 59.90, 8, '🌸', '#ede7f6', 'Ótima para presentear e decorar mesas.'],
            ['demo-forn-2', 'Arranjo de girassóis', 'arranjos', 72.00, 10, '🌻', '#fff8e1', 'Girassóis com folhagens verdes.'],
            ['demo-forn-3', 'Buquê de hortênsias', 'buques', 89.00, 9, '💐', '#e3f2fd', 'Hortênsias azuis da Serra Gaúcha.'],
            ['demo-forn-3', 'Orquídea cymbidium', 'orquideas', 169.00, 3, '🌸', '#fce4ec', 'Orquídea de clima frio, flores duradouras.'],
            ['demo-forn-3', 'Cesta de flores da serra', 'arranjos', 84.50, 7, '🌼', '#f1f8e9', 'Cesta de vime com flores sortidas.']
        ];


        const produtos = catalogo.map(([fornecedorId, nome, categoria, preco, estoque, emoji, cor, descricao], i) => {
            const loja = lojas.find(l => l.id === fornecedorId);


            return {
                id: `demo-prod-${i + 1}`,
                fornecedorId,
                loja: loja.loja,
                polo: loja.polo,
                nome,
                categoria,
                preco,
                estoque,
                descricao,
                ativo: true,
                imagem: imagemDemo(emoji, cor),
                criadoEm: new Date(agora - (20 - i) * umDia).toISOString()
            };
        });


        const clientes = [
            {
                id: 'demo-cli-1', nome: 'Ana Souza', email: 'ana@demo.com', telefone: '(11) 98888-1111',
                endereco: { cep: '01304-001', rua: 'Rua Augusta', numero: '1500', complemento: 'Apto 42', bairro: 'Consolação', cidade: 'São Paulo', estado: 'SP' }
            },
            {
                id: 'demo-cli-2', nome: 'Bruno Lima', email: 'bruno@demo.com', telefone: '(35) 98888-2222',
                endereco: { cep: '37550-000', rua: 'Rua Comendador José Garcia', numero: '200', complemento: '', bairro: 'Centro', cidade: 'Pouso Alegre', estado: 'MG' }
            }
        ].map((cliente, i) => ({
            ...cliente,
            senha: '123456',
            criadoEm: new Date(agora - (25 - i) * umDia).toISOString()
        }));


        const periodos = ['manha', 'tarde', 'noite'];


        // [cliente, [[produto, quantidade], ...], dias atrás, status, pagamento, detalhe]
        const roteiro = [
            [0, [[0, 1]], 6, 'entregue', 'cartao', { bandeira: 'Visa', final: '4242', parcelas: 2 }],
            [1, [[3, 2]], 5, 'entregue', 'pix', {}],
            [0, [[6, 1], [8, 1]], 4, 'entregue', 'cartao', { bandeira: 'Mastercard', final: '5100', parcelas: 3 }],
            [1, [[5, 1]], 3, 'cancelado', 'dinheiro', { troco: 100 }],
            [0, [[1, 1]], 2, 'entrega', 'pix', {}],
            [1, [[4, 2]], 2, 'preparo', 'cartao', { bandeira: 'Elo', final: '1234', parcelas: 1 }],
            [0, [[2, 1], [0, 1]], 1, 'preparo', 'cartao', { bandeira: 'Visa', final: '4242', parcelas: 4 }],
            [1, [[7, 1]], 0, 'novo', 'pix', {}],
            [0, [[3, 1]], 0, 'novo', 'dinheiro', { troco: 0 }]
        ];


        const pedidos = roteiro.map(([indiceCliente, itensRoteiro, diasAtras, status, pagamento, detalhe], i) => {
            const cliente = clientes[indiceCliente];
            const itens = itensRoteiro.map(([indiceProduto, quantidade]) => ({
                produtoId: produtos[indiceProduto].id,
                nome: produtos[indiceProduto].nome,
                preco: produtos[indiceProduto].preco,
                quantidade
            }));


            const fornecedorId = produtos[itensRoteiro[0][0]].fornecedorId;
            const loja = lojas.find(l => l.id === fornecedorId);
            const subtotal = arredondar(itens.reduce((s, item) => s + item.preco * item.quantidade, 0));
            const frete = subtotal >= 150 ? 0 : 12.90;


            return {
                id: `demo-ped-${i + 1}`,
                codigo: `DEMO${String(i + 1).padStart(2, '0')}`,
                fornecedorId,
                loja: loja.loja,
                clienteId: cliente.id,
                cliente: cliente.nome,
                contato: { telefone: cliente.telefone, email: cliente.email },
                entrega: {
                    ...cliente.endereco,
                    data: dataLocalISO(-diasAtras + 1),
                    periodo: periodos[i % 3],
                    destinatario: i % 2 === 0 ? 'Mãe' : '',
                    mensagem: i % 2 === 0 ? 'Com todo o meu carinho!' : ''
                },
                pagamento,
                pagamentoDetalhe: detalhe,
                itens,
                subtotal,
                desconto: 0,
                cupom: '',
                taxaEntrega: frete,
                total: arredondar(subtotal + frete),
                status,
                data: new Date(agora - diasAtras * umDia - (i * 37 + 60) * 60 * 1000).toISOString()
            };
        });


        const avaliacoes = [
            { nome: 'Ana Souza', regiao: 'Holambra (SP)', nota: 5, comentario: 'As rosas chegaram lindas e no horário combinado!' },
            { nome: 'Bruno Lima', regiao: 'Mantiqueira (MG)', nota: 4, comentario: 'Buquê muito bonito, só demorou um pouco na entrega.' },
            { nome: 'Carla Dias', regiao: 'Serra Gaúcha (RS)', nota: 5, comentario: 'As hortênsias são maravilhosas. Vou comprar de novo.' },
            { nome: 'Diego Rocha', regiao: 'Holambra (SP)', nota: 3, comentario: 'Gostei, mas a orquídea veio com uma flor a menos.' }
        ];


        // Avaliações das lojas (o pedido DEMO03 fica sem avaliação para testar ao vivo)
        const avaliacoesLojas = [
            {
                id: 'demo-aval-1', pedidoId: 'demo-ped-1', lojaId: 'demo-forn-1', loja: 'Flores de Holambra',
                clienteId: 'demo-cli-1', nome: 'Ana S.', nota: 5,
                comentario: 'Rosas lindas, bem embaladas e chegaram no horário!',
                data: new Date(agora - 5 * umDia).toISOString(), verificada: true
            },
            {
                id: 'demo-aval-2', pedidoId: 'demo-ped-2', lojaId: 'demo-forn-2', loja: 'Jardim da Mantiqueira',
                clienteId: 'demo-cli-2', nome: 'Bruno L.', nota: 4,
                comentario: 'Buquê muito bonito. Só atrasou uns 20 minutos.',
                data: new Date(agora - 4 * umDia).toISOString(), verificada: true
            }
        ];


        return { lojas, produtos, clientes, pedidos, avaliacoes, avaliacoesLojas };
    }


    function ehDemo(item) {
        return typeof item?.id === 'string' && item.id.startsWith('demo-');
    }


    document.getElementById('btn-carregar-demo')?.addEventListener('click', () => {
        const demo = gerarDadosDemo();


        // Remove os dados de demonstração antigos (para não duplicar) e junta os novos
        const juntar = (chave, novos) => salvar(chave, [...novos, ...lerLista(chave).filter(item => !ehDemo(item))]);


        const comentariosDemo = demo.avaliacoes.map(a => a.comentario);
        const avaliacoesAtuais = lerLista(CHAVES.avaliacoes).filter(a => !comentariosDemo.includes(a.comentario));


        const deuCerto =
            juntar(CHAVES.fornecedores, demo.lojas) &&
            juntar(CHAVES.produtos, demo.produtos) &&
            juntar(CHAVES.clientes, demo.clientes) &&
            juntar(CHAVES.pedidos, demo.pedidos) &&
            juntar(CHAVES.avaliacoesLojas, demo.avaliacoesLojas) &&
            salvar(CHAVES.avaliacoes, [...demo.avaliacoes, ...avaliacoesAtuais]);


        if (!deuCerto) return;


        mostrarAviso('Dados de demonstração carregados!');
        atualizarTudo();
    });


    document.getElementById('btn-remover-demo')?.addEventListener('click', () => {
        if (!confirm('Remover só os dados de demonstração? O que vocês cadastraram continua salvo.')) return;


        [CHAVES.fornecedores, CHAVES.produtos, CHAVES.clientes, CHAVES.pedidos, CHAVES.avaliacoesLojas].forEach(chave => {
            salvar(chave, lerLista(chave).filter(item => !ehDemo(item)));
        });


        const comentariosDemo = gerarDadosDemo().avaliacoes.map(a => a.comentario);
        salvar(CHAVES.avaliacoes, lerLista(CHAVES.avaliacoes).filter(a => !comentariosDemo.includes(a.comentario)));


        mostrarAviso('Dados de demonstração removidos.');
        atualizarTudo();
    });


    document.getElementById('btn-apagar-tudo')?.addEventListener('click', () => {
        const confirmacao = prompt('Isso apaga TODAS as lojas, produtos, clientes, pedidos, avaliações e cupons deste navegador.\n\nPara confirmar, digite APAGAR:');
        if (confirmacao === null) return;


        if (confirmacao.trim().toUpperCase() !== 'APAGAR') {
            mostrarAviso('Nada foi apagado.', true);
            return;
        }


        Object.entries(CHAVES).forEach(([nome, chave]) => {
            if (nome === 'sessaoAdmin') return;


            try {
                localStorage.removeItem(chave);
            } catch (erro) {
                console.error(erro);
            }
        });


        mostrarAviso('Todos os dados foram apagados.');
        atualizarTudo();
    });




    // ==========================================
    // 12. INÍCIO
    // ==========================================


    // Se algo mudar em outra aba (uma compra, por exemplo), o painel atualiza
    window.addEventListener('storage', evento => {
        if (evento.key === CHAVES.sessaoAdmin) {
            if (adminLogado()) {
                mostrarPainel();
            } else {
                mostrarAcesso();
            }
            return;
        }


        if (adminLogado() && Object.values(CHAVES).includes(evento.key)) atualizarTudo();
    });


    if (adminLogado()) {
        mostrarPainel();
    } else {
        mostrarAcesso();
    }
});

