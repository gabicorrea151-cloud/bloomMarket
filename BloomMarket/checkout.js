// ==================================================
// BLOOMMARKET — CHECKOUT (FINALIZAR PEDIDO)
// Lê o carrinho, confere a conta do cliente e manda o pedido
// para o back-end (POST /api/pedidos). O back-end confere o
// estoque, calcula os valores e cria um pedido por loja.
// Pagamento simulado: Pix, cartão de crédito ou boleto.
// ==================================================

document.addEventListener('DOMContentLoaded', () => {
    const B = window.Bloom;
    const { criar, moeda, api, aviso, apenasNumeros } = B;

    // ==========================================
    // 1. CONFIGURAÇÕES
    // ==========================================

    const TAXA_ENTREGA = 12.90;
    const FRETE_GRATIS_A_PARTIR = 150;
    const PARCELA_MINIMA = 10;
    const MAXIMO_PARCELAS = 6;
    const MINUTOS_PIX = 10;
    const CARTAO_RECUSADO = '4000000000000002';

    // Números das formas de pagamento no banco (tb_formPag)
    const FORMAS = { pix: 1, cartao: 2, boleto: 3 };

    // ==========================================
    // 2. ELEMENTOS
    // ==========================================

    const $ = id => document.getElementById(id);

    const telaVazia = $('checkout-vazio');
    const conteudo = $('checkout-conteudo');
    const telaPix = $('checkout-pix');
    const telaConfirmada = $('checkout-confirmado');
    const form = $('form-checkout');
    const caixaErro = $('erro-checkout');
    const botaoConfirmar = $('btn-confirmar-pedido');

    const campoNumeroCartao = $('ck-cartao-numero');
    const campoNomeCartao = $('ck-cartao-nome');
    const campoValidade = $('ck-cartao-validade');
    const campoCVV = $('ck-cartao-cvv');
    const campoParcelas = $('ck-parcelas');

    function processando(texto) {
        $('ck-processando-texto').textContent = texto;
        $('ck-processando').hidden = false;
    }

    function pararProcessando() {
        $('ck-processando').hidden = true;
    }

    const esperar = ms => new Promise(resolver => setTimeout(resolver, ms));
    const arredondar = valor => Math.round(valor * 100) / 100;

    function dataLocal(dias = 0) {
        const d = new Date();
        d.setDate(d.getDate() + dias);
        return `d.getFullYear()-{String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    // Pega as formas de pagamento do banco (se mudar o número lá, o site acompanha)
    api('/formas-pagamento')
        .then(formas => {
            formas.forEach(f => {
                const nome = f.nome.toLowerCase();
                if (nome.includes('pix')) FORMAS.pix = f.idFormPag;
                else if (nome.includes('crédito') || nome.includes('credito')) FORMAS.cartao = f.idFormPag;
                else if (nome.includes('boleto')) FORMAS.boleto = f.idFormPag;
            });
        })
        .catch(() => {});

    // ==========================================
    // 3. CARRINHO E VALORES
    // ==========================================

    const carrinho = B.carrinho.ler();

    if (!carrinho.length) {
        telaVazia.hidden = false;
        conteudo.hidden = true;
        return;
    }

    // Separa por loja (cada loja faz a sua entrega)
    const grupos = Object.values(carrinho.reduce((mapa, item) => {
        const chave = item.idLoja;
        if (!mapa[chave]) mapa[chave] = { idLoja: item.idLoja, loja: item.loja, itens: [], subtotal: 0 };
        mapa[chave].itens.push(item);
        mapa[chave].subtotal = arredondar(mapa[chave].subtotal + item.preco * item.quantidade);
        return mapa;
    }, {}));

    const subtotalGeral = arredondar(grupos.reduce((soma, g) => soma + g.subtotal, 0));
    let cupom = null; // o cupom validado pelo back-end

    // Mesma conta que o back-end faz (o valor final vem dele)
    function calcular() {
        const porLoja = grupos.map(g => {
            let desconto = 0;
            if (cupom?.tipo === 'porcentagem') desconto = arredondar(g.subtotal * Number(cupom.valor) / 100);
            if (cupom?.tipo === 'valor') desconto = arredondar(Math.min(g.subtotal, Number(cupom.valor) * g.subtotal / subtotalGeral));

            const gratis = g.subtotal >= FRETE_GRATIS_A_PARTIR || cupom?.tipo === 'frete';
            const frete = gratis ? 0 : TAXA_ENTREGA;
            return { ...g, desconto, frete, total: arredondar(g.subtotal - desconto + frete) };
        });

        const somar = campo => arredondar(porLoja.reduce((soma, g) => soma + g[campo], 0));
        return { porLoja, subtotal: somar('subtotal'), desconto: somar('desconto'), frete: somar('frete'), total: somar('total') };
    }

    function mostrarResumo() {
        const valores = calcular();
        const lista = $('resumo-itens-checkout');
        lista.replaceChildren();

        valores.porLoja.forEach(g => {
            const bloco = criar('div', 'rp-loja');
            const qtd = g.itens.reduce((s, i) => s + i.quantidade, 0);

            const topo = criar('div', 'rp-loja-topo');
            topo.append(criar('span', 'rp-loja-nome', g.loja), criar('span', 'rp-loja-qtd', `${qtd} ${qtd === 1 ? 'item' : 'itens'}`));
            bloco.append(topo);

            const itens = criar('ul', 'rp-itens');
            g.itens.forEach(item => {
                const linha = criar('li', 'rp-item');
                linha.append(
                    criar('span', 'rp-qtd', `${item.quantidade}x`),
                    criar('span', 'rp-nome', `item.nome({item.detalhe})`),
                    criar('span', 'rp-preco', moeda(item.preco * item.quantidade))
                );
                itens.append(linha);
            });
            bloco.append(itens);

            const entrega = criar('div', 'rp-entrega');
            entrega.append(
                criar('span', '', 'Entrega desta loja'),
                criar('span', g.frete === 0 ? 'rp-gratis' : 'rp-valor-entrega', g.frete === 0 ? 'Grátis' : moeda(g.frete))
            );
            bloco.append(entrega);

            if (g.frete > 0) {
                const caixa = criar('div', 'rp-frete-gratis');
                const trilho = criar('div', 'rp-trilho');
                const barra = criar('div', 'rp-progresso');
                barra.style.width = `${Math.min(100, (g.subtotal / FRETE_GRATIS_A_PARTIR) * 100)}%`;
                trilho.append(barra);
                caixa.append(trilho, criar('p', '', `Faltam ${moeda(FRETE_GRATIS_A_PARTIR - g.subtotal)} nesta loja para a entrega ficar grátis.`));
                bloco.append(caixa);
            }

            lista.append(bloco);
        });

        const totalItens = carrinho.reduce((s, i) => s + i.quantidade, 0);
        ('rp-contador').textContent=`{totalItens} ${totalItens === 1 ? 'item' : 'itens'}`;
        $('ck-subtotal').textContent = moeda(valores.subtotal);
        $('ck-frete').textContent = valores.frete === 0 ? 'Grátis' : moeda(valores.frete);
        $('ck-total').textContent = moeda(valores.total);
        $('ck-linha-desconto').hidden = valores.desconto === 0;
        $('ck-desconto').textContent = `- ${moeda(valores.desconto)}`;
        $('ck-aviso-lojas').textContent = grupos.length > 1
            ? `Seu pedido tem produtos de ${grupos.length} lojas, então chega em ${grupos.length} entregas separadas.`
            : `Entrega grátis em compras a partir de ${moeda(FRETE_GRATIS_A_PARTIR)} na mesma loja.`;

        atualizarParcelas(valores.total);
    }

    function atualizarParcelas(total) {
        const escolhida = Number(campoParcelas.value) || 1;
        campoParcelas.replaceChildren();

        for (let vezes = 1; vezes <= MAXIMO_PARCELAS; vezes++) {
            if (vezes > 1 && total / vezes < PARCELA_MINIMA) break;
            campoParcelas.append(new Option(
                vezes === 1 ? `1x de moeda(total)(àvista)`:`{vezes}x de ${moeda(total / vezes)} sem juros`,
                String(vezes)
            ));
        }

        campoParcelas.value = [...campoParcelas.options].some(o => Number(o.value) === escolhida) ? String(escolhida) : '1';
    }

    // ==========================================
    // 4. CUPOM (conferido no back-end)
    // ==========================================

    const campoCupom = $('ck-cupom');
    const msgCupom = $('msg-cupom');
    const removerCupom = $('btn-remover-cupom');

    function mensagemCupom(texto, erro = false) {
        msgCupom.textContent = texto;
        msgCupom.classList.toggle('erro', erro);
    }

    $('form-cupom').addEventListener('submit', async evento => {
        evento.preventDefault();
        const codigo = campoCupom.value.trim().toUpperCase();
        const quem = B.cliente();

        if (!codigo) return mensagemCupom('Digite um cupom.', true);
        if (!quem) return mensagemCupom('Entre na sua conta para usar um cupom.', true);

        mensagemCupom('Conferindo...');

        try {
            cupom = await api(`/cupons/encodeURIComponent(codigo)/validar{B.parametros({ idCliente: quem.idCli, subtotal: subtotalGeral })}`);
            campoCupom.value = cupom.codigo;
            campoCupom.disabled = true;
            removerCupom.hidden = false;
            mensagemCupom(`Cupom ${cupom.codigo} aplicado: ${cupom.descricao}.`);
            mostrarResumo();
        } catch (erro) {
            cupom = null;
            mensagemCupom(erro.message, true);
        }
    });

    removerCupom.addEventListener('click', () => {
        cupom = null;
        campoCupom.disabled = false;
        campoCupom.value = '';
        removerCupom.hidden = true;
        mensagemCupom('');
        mostrarResumo();
    });

    mostrarResumo();

    // ==========================================
    // 5. CONTA DO CLIENTE
    // ==========================================

    const contaLogada = $('ck-conta-logado');
    const formLogin = $('ck-form-login');

    function preencherEndereco(c) {
        const valores = {
            'ck-cep': c.cep, 'ck-numero': c.numero, 'ck-rua': c.rua, 'ck-complemento': c.complemento,
            'ck-bairro': c.bairro, 'ck-cidade': c.cidade, 'ck-estado': c.estado
        };
        Object.entries(valores).forEach(([id, valor]) => {
            if (valor && !$(id).value) $(id).value = valor;
        });
        if (campoNomeCartao && !campoNomeCartao.value) campoNomeCartao.value = c.nome.toUpperCase();
        atualizarPrevia();
    }

    function atualizarConta() {
        const quem = B.cliente();
        contaLogada.hidden = !quem;
        formLogin.hidden = Boolean(quem);
        $('ck-salvar-wrap').hidden = !quem;

        if (quem) {
            $('ck-conta-nome').textContent = quem.nome.split(' ')[0];
            preencherEndereco(quem);
        }
    }

    formLogin.addEventListener('submit', async evento => {
        evento.preventDefault();
        const email = $('ck-login-email').value.trim();
        const senha = $('ck-login-senha').value;
        const erro = $('ck-erro-login');

        if (!email || !senha) {
            erro.textContent = 'Preencha o e-mail e a senha.';
            erro.hidden = false;
            return;
        }

        try {
            const dados = await api('/clientes/login', { metodo: 'POST', corpo: { email, senha } });
            B.salvarCliente(dados);
            erro.hidden = true;
            formLogin.reset();
            atualizarConta();
        } catch (falha) {
            erro.textContent = falha.message;
            erro.hidden = false;
        }
    });

    $('ck-sair').addEventListener('click', () => {
        B.sair();
        ['ck-cep', 'ck-numero', 'ck-rua', 'ck-complemento', 'ck-bairro', 'ck-cidade', 'ck-estado'].forEach(id => { $(id).value = ''; });
        atualizarConta();
    });

    // ==========================================
    // 6. CAMPOS DO FORMULÁRIO
    // ==========================================

    const campoCEP = $('ck-cep');
    const statusCEP = $('status-cep');

    campoCEP.addEventListener('input', async () => {
        campoCEP.value = B.mascaraCEP(campoCEP.value);
        if (apenasNumeros(campoCEP.value).length !== 8) return;

        statusCEP.textContent = 'Buscando endereço...';
        const endereco = await B.buscarCEP(campoCEP.value);

        if (!endereco) {
            statusCEP.textContent = 'Não encontramos esse CEP. Preencha o endereço manualmente.';
            return;
        }

        $('ck-rua').value = endereco.rua || $('ck-rua').value;
        $('ck-bairro').value = endereco.bairro || $('ck-bairro').value;
        $('ck-cidade').value = endereco.cidade;
        $('ck-estado').value = endereco.estado;
        statusCEP.textContent = 'Endereço encontrado. Confira e preencha o número.';
        $('ck-numero').focus();
    });

    $('ck-estado').addEventListener('input', evento => {
        evento.target.value = evento.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);
    });

    const campoData = $('ck-data');
    campoData.min = dataLocal();
    campoData.max = dataLocal(30);
    campoData.value = dataLocal(1);

    const campoMensagem = $('ck-mensagem');
    campoMensagem.addEventListener('input', () => {
        ('contador-mensagem').textContent=`{campoMensagem.value.length}/200`;
    });

    // ---------- Forma de pagamento ----------

    const opcoes = document.querySelectorAll('input[name="pagamento"]');
    const metodo = () => document.querySelector('input[name="pagamento"]:checked')?.value || 'pix';

    function atualizarPagamento() {
        opcoes.forEach(o => o.closest('.opcao-pagamento').classList.toggle('selecionada', o.checked));
        ['pix', 'cartao', 'boleto'].forEach(nome => { (`painel-{nome}`).hidden = nome !== metodo(); });

        botaoConfirmar.textContent = {
            pix: 'Gerar Pix e finalizar',
            cartao: 'Pagar e finalizar pedido',
            boleto: 'Gerar boleto e finalizar'
        }[metodo()];
    }

    opcoes.forEach(o => o.addEventListener('change', atualizarPagamento));
    atualizarPagamento();

    // ---------- Cartão ----------

    function bandeira(numero) {
        const n = apenasNumeros(numero);
        if (/^(636368|438935|504175|451416|636297|5067|4576|4011)/.test(n)) return 'Elo';
        if (/^(606282|3841)/.test(n)) return 'Hipercard';
        if (/^3[47]/.test(n)) return 'Amex';
        if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
        if (/^4/.test(n)) return 'Visa';
        return '';
    }

    function luhn(numero) {
        const n = apenasNumeros(numero);
        if (n.length < 13 || n.length > 19) return false;
        let soma = 0;
        let dobrar = false;
        for (let i = n.length - 1; i >= 0; i--) {
            let d = Number(n[i]);
            if (dobrar) { d *= 2; if (d > 9) d -= 9; }
            soma += d;
            dobrar = !dobrar;
        }
        return soma % 10 === 0;
    }

    function validadeOk(texto) {
        const [mes, ano] = texto.split('/').map(Number);
        if (!mes || mes > 12 || ano === undefined || Number.isNaN(ano)) return false;
        const hoje = new Date();
        const anoCompleto = 2000 + ano;
        if (anoCompleto < hoje.getFullYear() || anoCompleto > hoje.getFullYear() + 20) return false;
        return !(anoCompleto === hoje.getFullYear() && mes < hoje.getMonth() + 1);
    }

    function atualizarPrevia() {
        const numero = apenasNumeros(campoNumeroCartao.value);
        const marca = bandeira(numero);

        $('preview-numero').textContent = (numero + '•'.repeat(Math.max(0, 16 - numero.length)))
            .slice(0, Math.max(16, numero.length)).replace(/(.{4})(?=.)/g, '$1 ');
        $('preview-nome').textContent = campoNomeCartao.value.toUpperCase() || 'NOME DO TITULAR';
        $('preview-validade').textContent = campoValidade.value || 'MM/AA';
        $('preview-bandeira').textContent = marca ? marca.toUpperCase() : 'CARTÃO';
        $('cartao-preview').dataset.bandeira = marca.toLowerCase();

        const etiqueta = $('ck-bandeira');
        etiqueta.textContent = marca;
        etiqueta.hidden = !marca;
        campoCVV.maxLength = marca === 'Amex' ? 4 : 3;
    }

    campoNumeroCartao.addEventListener('input', () => {
        const n = apenasNumeros(campoNumeroCartao.value).slice(0, 19);
        campoNumeroCartao.value = /^3[47]/.test(n)
            ? [n.slice(0, 4), n.slice(4, 10), n.slice(10, 15)].filter(Boolean).join(' ')
            : n.replace(/(\d{4})(?=\d)/g, '$1 ');
        atualizarPrevia();
    });

    campoValidade.addEventListener('input', () => {
        const n = apenasNumeros(campoValidade.value).slice(0, 4);
        campoValidade.value = n.length > 2 ? `n.slice(0,2)/{n.slice(2)}` : n;
        atualizarPrevia();
    });

    campoNomeCartao.addEventListener('input', atualizarPrevia);
    campoCVV.addEventListener('input', () => { campoCVV.value = apenasNumeros(campoCVV.value).slice(0, 4); });

    // ---------- Erros ----------

    function mostrarErro(mensagem, idCampo) {
        caixaErro.textContent = mensagem;
        caixaErro.hidden = false;
        const campo = idCampo ? $(idCampo) : null;

        if (campo) {
            campo.setAttribute('aria-invalid', 'true');
            campo.focus();
            campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            caixaErro.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    form.addEventListener('input', evento => {
        evento.target.removeAttribute?.('aria-invalid');
        caixaErro.hidden = true;
    });

    // ==========================================
    // 7. CONFERIR E ENVIAR
    // ==========================================

    function lerEntrega() {
        const v = id => $(id).value.trim();
        return {
            cep: v('ck-cep'), rua: v('ck-rua'), numero: v('ck-numero'), complemento: v('ck-complemento'),
            bairro: v('ck-bairro'), cidade: v('ck-cidade'), estado: v('ck-estado').toUpperCase(),
            dataEntrega: v('ck-data'), periodo: v('ck-periodo'),
            destinatario: v('ck-destinatario'), mensagem: v('ck-mensagem')
        };
    }

    function validar(entrega) {
        if (!B.cliente()) return ['Entre na sua conta para finalizar a compra.', 'ck-login-email'];
        if (apenasNumeros(entrega.cep).length !== 8) return ['O CEP precisa ter 8 números.', 'ck-cep'];
        if (!entrega.numero) return ['Digite o número do endereço.', 'ck-numero'];
        if (!entrega.rua) return ['Digite a rua.', 'ck-rua'];
        if (!entrega.bairro) return ['Digite o bairro.', 'ck-bairro'];
        if (!entrega.cidade) return ['Digite a cidade.', 'ck-cidade'];
        if (!/^[A-Z]{2}$/.test(entrega.estado)) return ['Digite a sigla do estado, como SP.', 'ck-estado'];
        if (!entrega.dataEntrega || entrega.dataEntrega < dataLocal()) return ['Escolha uma data de hoje em diante.', 'ck-data'];
        if (entrega.dataEntrega > dataLocal(30)) return ['Escolha uma data nos próximos 30 dias.', 'ck-data'];
        if (!B.PERIODOS[entrega.periodo]) return ['Escolha o período da entrega.', 'ck-periodo'];

        if (metodo() === 'cartao') {
            if (!luhn(campoNumeroCartao.value)) return ['Número do cartão inválido. No modo de teste, use 4242 4242 4242 4242.', 'ck-cartao-numero'];
            if (campoNomeCartao.value.trim().length < 3) return ['Digite o nome impresso no cartão.', 'ck-cartao-nome'];
            if (!validadeOk(campoValidade.value)) return ['Validade inválida ou cartão vencido. Use MM/AA.', 'ck-cartao-validade'];
            const tamanho = bandeira(campoNumeroCartao.value) === 'Amex' ? 4 : 3;
            if (apenasNumeros(campoCVV.value).length !== tamanho) return [`O CVV tem ${tamanho} números.`, 'ck-cartao-cvv'];
        }

        return null;
    }

    form.addEventListener('submit', async evento => {
        evento.preventDefault();

        const entrega = lerEntrega();
        const problema = validar(entrega);
        if (problema) return mostrarErro(problema[0], problema[1]);

        if (metodo() === 'pix') {
            abrirPix(entrega);
            return;
        }

        if (metodo() === 'cartao') {
            const numero = apenasNumeros(campoNumeroCartao.value);
            processando('Processando pagamento...');
            await esperar(1500);

            if (numero === CARTAO_RECUSADO) {
                pararProcessando();
                return mostrarErro('Pagamento recusado pelo banco emissor. Confira os dados ou use outro cartão.', 'ck-cartao-numero');
            }

            const parcelas = Number(campoParcelas.value) || 1;
            const detalhe = `${bandeira(numero) || 'Cartão'} final ${numero.slice(-4)}, ` +
                (parcelas > 1 ? `${parcelas}x sem juros` : 'à vista');

            await enviarPedido(entrega, 'cartao', detalhe);
            return;
        }

        processando('Gerando boleto...');
        await esperar(800);
        await enviarPedido(entrega, 'boleto', 'Boleto');
    });

    async function enviarPedido(entrega, forma, detalhe) {
        processando('Enviando pedido para a loja...');
        const quem = B.cliente();

        try {
            const compra = await api('/pedidos', {
                metodo: 'POST',
                corpo: {
                    idCliente: quem.idCli,
                    idFormaPagamento: FORMAS[forma],
                    detalhePagamento: detalhe,
                    cupom: cupom ? cupom.codigo : null,
                    entrega,
                    itens: carrinho.map(item => ({ idVariacao: Number(item.id), quantidade: item.quantidade }))
                }
            });

            // Guarda o endereço na conta, se marcado
            if ($('ck-salvar-endereco').checked) {
                api(`/clientes/${quem.idCli}`, {
                    metodo: 'PUT',
                    corpo: {
                        nome: quem.nome, telefone: quem.telefone,
                        cep: entrega.cep, rua: entrega.rua, numero: entrega.numero, complemento: entrega.complemento,
                        bairro: entrega.bairro, cidade: entrega.cidade, estado: entrega.estado
                    }
                }).then(B.salvarCliente).catch(() => {});
            }

            B.carrinho.limpar();
            pararProcessando();
            mostrarConfirmacao(compra, forma, entrega);
        } catch (erro) {
            pararProcessando();
            telaPix.hidden = true;
            conteudo.hidden = false;
            mostrarErro(erro.message);
        }
    }

    // ==========================================
    // 8. PIX
    // ==========================================

    let timerPix = null;
    let entregaPix = null;

    function codigoPix(total) {
        const aleatorio = () => Math.random().toString(16).slice(2, 10);
        const valor = total.toFixed(2);
        return '00020126580014BR.GOV.BCB.PIX0136' +
            `aleatorio()-{aleatorio().slice(0, 4)}-aleatorio().slice(0,4)-{aleatorio()}` +
            `52040000530398654String(valor.length).padStart(2,'0'){valor}` +
            '5802BR5911BLOOMMARKET6009SAO PAULO62070503***6304' + aleatorio().slice(0, 4).toUpperCase();
    }

    // QR Code só de visual (não funciona no banco)
    function desenharQR(texto) {
        const tamanho = 29;
        let semente = 0;
        for (let i = 0; i < texto.length; i++) semente = (semente * 31 + texto.charCodeAt(i)) >>> 0;
        const sorteio = () => { semente = (semente * 1664525 + 1013904223) >>> 0; return semente / 4294967296; };
        const canto = (x, y) => (x < 8 && y < 8) || (x >= tamanho - 8 && y < 8) || (x < 8 && y >= tamanho - 8);

        let quadrados = '';
        for (let y = 0; y < tamanho; y++) {
            for (let x = 0; x < tamanho; x++) {
                if (!canto(x, y) && sorteio() < 0.5) quadrados += `<rect x="x"y="{y}" width="1" height="1"/>`;
            }
        }

        const marcador = (x, y) =>
            `<rect x="x"y="{y}" width="7" height="7"/><rect x="x+1"y="{y + 1}" width="5" height="5" fill="#fff"/>` +
            `<rect x="x+2"y="{y + 2}" width="3" height="3"/>`;

        return `<svg viewBox="-2 -2 ${tamanho + 4} ${tamanho + 4}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">` +
            `<rect x="-2" y="-2" width="tamanho+4"height="{tamanho + 4}" fill="#fff"/>` +
            `<g fill="#111">quadrados{marcador(0, 0)}marcador(tamanho-7,0){marcador(0, tamanho - 7)}</g></svg>`;
    }

    function novoPix() {
        const total = calcular().total;
        const codigo = codigoPix(total);
        $('pix-total').textContent = moeda(total);
        $('pix-codigo').value = codigo;
        $('pix-qr').innerHTML = desenharQR(codigo);
        $('btn-novo-pix').hidden = true;
        $('erro-pix').hidden = true;
        $('btn-ja-paguei').disabled = false;

        clearInterval(timerPix);
        const fim = Date.now() + MINUTOS_PIX * 60000;

        const contar = () => {
            const resta = Math.max(0, fim - Date.now());
            ('pix-timer').textContent=`{String(Math.floor(resta / 60000)).padStart(2, '0')}:${String(Math.floor((resta % 60000) / 1000)).padStart(2, '0')}`;

            if (resta === 0) {
                clearInterval(timerPix);
                $('btn-ja-paguei').disabled = true;
                $('erro-pix').textContent = 'O código Pix expirou. Clique em "Gerar novo código".';
                $('erro-pix').hidden = false;
                $('btn-novo-pix').hidden = false;
            }
        };

        contar();
        timerPix = setInterval(contar, 1000);
    }

    function abrirPix(entrega) {
        entregaPix = entrega;
        conteudo.hidden = true;
        telaPix.hidden = false;
        novoPix();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    $('btn-novo-pix').addEventListener('click', novoPix);

    $('btn-voltar-pix').addEventListener('click', () => {
        clearInterval(timerPix);
        telaPix.hidden = true;
        conteudo.hidden = false;
    });

    ('btn-copiar-pix').addEventListener('click',()=>copiar(('pix-codigo').value, $('btn-copiar-pix')));

    $('btn-ja-paguei').addEventListener('click', async () => {
        processando('Confirmando pagamento com o banco...');
        await esperar(1200);
        clearInterval(timerPix);
        await enviarPedido(entregaPix, 'pix', 'Pix (pagamento aprovado)');
    });

    async function copiar(texto, botao) {
        try {
            await navigator.clipboard.writeText(texto);
        } catch (erro) {
            const temp = criar('textarea');
            temp.value = texto;
            document.body.append(temp);
            temp.select();
            document.execCommand('copy');
            temp.remove();
        }
        const original = botao.textContent;
        botao.textContent = 'Copiado!';
        setTimeout(() => { botao.textContent = original; }, 2000);
    }

    // ==========================================
    // 9. PEDIDO CONFIRMADO (+ BOLETO)
    // ==========================================

    function linhaBoleto(total) {
        const numeros = Array.from({ length: 44 }, () => Math.floor(Math.random() * 10)).join('');
        const valor = String(Math.round(total * 100)).padStart(10, '0');
        const n = (numeros.slice(0, 37) + valor).slice(0, 47);
        return `n.slice(0,5).{n.slice(5, 10)} n.slice(10,15).{n.slice(15, 21)} n.slice(21,26).{n.slice(26, 32)} ${n.slice(32, 33)} ${n.slice(33)}`;
    }

    function mostrarConfirmacao(compra, forma, entrega) {
        const quem = B.cliente();
        const codigos = compra.pedidos.map(p => `#${p.codigo}`);
        const lojas = compra.pedidos.map(p => p.loja);

        $('confirmado-texto').textContent = lojas.length === 1
            ? `Obrigado, ${quem.nome.split(' ')[0]}! Seu pedido foi enviado para a loja ${lojas[0]}.`
            : `Obrigado, ${quem.nome.split(' ')[0]}! Seu pedido foi enviado para ${lojas.length} lojas, e cada uma faz a sua entrega.`;

        if (forma === 'boleto') {
            const vencimento = new Date();
            let uteis = 0;
            while (uteis < 3) {
                vencimento.setDate(vencimento.getDate() + 1);
                if (vencimento.getDay() !== 0 && vencimento.getDay() !== 6) uteis++;
            }

            const linha = linhaBoleto(Number(compra.total));
            $('boleto-linha').textContent = linha;
            $('boleto-valor').textContent = moeda(compra.total);
            $('boleto-vencimento').textContent = vencimento.toLocaleDateString('pt-BR');
            $('confirmado-boleto').hidden = false;
            $('btn-copiar-boleto').addEventListener('click', () => copiar(apenasNumeros(linha), $('btn-copiar-boleto')));
        }

        const detalhes = $('confirmado-detalhes');
        detalhes.replaceChildren();

        const descontos = compra.pedidos.reduce((s, p) => s + Number(p.desconto), 0);
        const fretes = compra.pedidos.reduce((s, p) => s + Number(p.taxaEntrega), 0);

        [
            [codigos.length > 1 ? 'Números' : 'Número', codigos.join(', ')],
            ['Entrega', `${B.dataBR(entrega.dataEntrega)}, ${B.PERIODOS[entrega.periodo]}`],
            ['Endereço', `${entrega.rua}, entrega.numero{entrega.complemento ? ' - ' + entrega.complemento : ''}, ${entrega.bairro}, ${entrega.cidade} - ${entrega.estado}`],
            ['Pagamento', compra.pedidos[0]?.detalhePagamento || compra.pedidos[0]?.formaPagamento],
            ...(descontos > 0 ? [['Desconto', `- ${moeda(descontos)}`]] : []),
            ['Entrega', fretes === 0 ? 'Grátis' : moeda(fretes)],
            ['Total', moeda(compra.total)]
        ].forEach(([rotulo, valor]) => {
            const linha = criar('div');
            linha.append(criar('dt', '', rotulo), criar('dd', '', valor));
            detalhes.append(linha);
        });

        $('link-acompanhar').href = 'meus-pedidos.html';

        conteudo.hidden = true;
        telaPix.hidden = true;
        telaConfirmada.hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        aviso('Pedido confirmado! 🌷');
    }

    atualizarConta();
    document.addEventListener('bloom:conta', atualizarConta);
});


