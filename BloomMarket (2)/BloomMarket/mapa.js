// ==================================================
// BLOOMMARKET — MAPA COM TODOS OS POLOS
// Mostra as 5 regiões das lojas ao mesmo tempo usando a biblioteca Leaflet.
// Se a rede bloquear o mapa, usa o Google Maps embutido como reserva
// (nesse caso, um polo por vez).
// ==================================================

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. DADOS DOS POLOS
    // ==========================================

    // As 5 regiões das lojas parceiras (o nome é igual ao do banco)
    const POLOS = [
        {
            id: 'holambra',
            nome: 'Holambra - SP',
            descricao: 'Maior polo de flores ornamentais do Brasil, famoso pelas rosas e tulipas.',
            busca: 'Holambra, SP',
            latitude: -22.6322,
            longitude: -47.0542,
            zoom: 11
        },
        {
            id: 'pinhais',
            nome: 'São José dos Pinhais - PR',
            descricao: 'Região de clima frio, ótima para orquídeas, lírios e peônias.',
            busca: 'São José dos Pinhais, PR',
            latitude: -25.5347,
            longitude: -49.2056,
            zoom: 11
        },
        {
            id: 'gravata',
            nome: 'Gravatá - PE',
            descricao: 'Polo de flores do Nordeste, na serra pernambucana, com girassóis e flores tropicais.',
            busca: 'Gravatá, PE',
            latitude: -8.2011,
            longitude: -35.565,
            zoom: 11
        },
        {
            id: 'brasilia',
            nome: 'Brasília - DF',
            descricao: 'Produção do cerrado que atende o Centro-Oeste, com margaridas e lavandas.',
            busca: 'Brasília, DF',
            latitude: -15.7939,
            longitude: -47.8828,
            zoom: 10
        },
        {
            id: 'benevides',
            nome: 'Benevides - PA',
            descricao: 'Polo da região Norte, perto de Belém, com flores tropicais e helicônias.',
            busca: 'Benevides, PA',
            latitude: -1.3614,
            longitude: -48.2447,
            zoom: 11
        }
    ];

    // De onde baixar a biblioteca Leaflet (se um site falhar, tenta o próximo)
    const FONTES_LEAFLET = [
        {
            css: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
            js: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        },
        {
            css: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
            js: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js'
        }
    ];

    // De onde baixar as imagens do mapa (se uma falhar, tenta a próxima)
    const CAMADAS = [
        {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
            opcoes: { attribution: 'Mapa &copy; Esri', maxZoom: 18 }
        },
        {
            url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            opcoes: { attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 19 }
        },
        {
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            opcoes: { attribution: '&copy; OpenStreetMap', maxZoom: 19 }
        }
    ];


    // ==========================================
    // 2. ELEMENTOS DA PÁGINA
    // ==========================================

    const areaMapa = document.getElementById('mapa-polos');
    const mapaReserva = document.getElementById('mapa-reserva');
    const legenda = document.getElementById('legenda-mapa');
    const botaoTodos = document.getElementById('btn-ver-todos');
    let cartoes = document.querySelectorAll('.cartao-polo[data-polo-mapa]');

    // Troca os cartões antigos (3 polos) pelos 5 polos, com as lojas do banco
    function montarCartoes(lojas) {
        const caixa = cartoes[0]?.parentElement;
        if (!caixa) return;

        caixa.replaceChildren();

        POLOS.forEach((polo, indice) => {
            const cartao = document.createElement('article');
            cartao.className = 'cartao-polo';
            cartao.dataset.poloMapa = polo.id;

            const numero = document.createElement('span');
            numero.className = 'numero-polo';
            numero.textContent = String(indice + 1).padStart(2, '0');

            const titulo = document.createElement('h3');
            titulo.textContent = polo.nome;

            const texto = document.createElement('p');
            texto.textContent = polo.descricao;

            cartao.append(numero, titulo, texto);

            // Lojas desta região (vêm do back-end)
            const daRegiao = lojas.filter(l => l.localizacao === polo.nome);
            if (daRegiao.length) {
                const linha = document.createElement('p');
                linha.className = 'lojas-polo';
                linha.append('Loja: ');

                daRegiao.forEach((loja, i) => {
                    const link = document.createElement('a');
                    link.className = 'link-loja';
                    link.href = `loja.html?id=${loja.idLoja}`;
                    link.textContent = loja.nome;
                    if (i > 0) linha.append(', ');
                    linha.append(link);
                });

                cartao.append(linha);
            }

            const acoes = document.createElement('div');
            acoes.className = 'acoes-polo';

            const botao = document.createElement('button');
            botao.type = 'button';
            botao.className = 'botao-ver-mapa';
            botao.setAttribute('aria-pressed', 'false');
            botao.textContent = 'Ver no mapa';
            botao.addEventListener('click', () => {
                mostrarPolo(polo.id);
                (modo === 'reserva' ? mapaReserva : areaMapa)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });

            const link = document.createElement('a');
            link.className = 'link-maps';
            link.href = linkGoogleMaps(polo);
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = 'Abrir no Google Maps';

            acoes.append(botao, link);
            cartao.append(acoes);
            caixa.append(cartao);
        });

        cartoes = caixa.querySelectorAll('.cartao-polo[data-polo-mapa]');
    }

    if (!areaMapa) return;

    let mapa = null;
    let modo = 'carregando'; // 'carregando', 'completo' ou 'reserva'
    const marcadores = {};

    function linkGoogleMaps(polo) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(polo.busca)}`;
    }

    function escreverLegenda(texto) {
        if (legenda) legenda.textContent = texto;
    }

    // Destaca o cartão do polo escolhido (ou nenhum, quando mostra todos)
    function destacar(idPolo) {
        cartoes.forEach(cartao => {
            const ativo = cartao.dataset.poloMapa === idPolo;
            cartao.classList.toggle('ativo', ativo);
            cartao.querySelector('.botao-ver-mapa')?.setAttribute('aria-pressed', String(ativo));
        });

        if (botaoTodos) {
            const todosAtivo = idPolo === 'todos';
            botaoTodos.classList.toggle('ativo', todosAtivo);
            botaoTodos.setAttribute('aria-pressed', String(todosAtivo));
        }
    }


    // ==========================================
    // 3. CARREGAR A BIBLIOTECA LEAFLET
    // ==========================================

    function carregarArquivo(tipo, endereco) {
        return new Promise((resolve, reject) => {
            const elemento = document.createElement(tipo === 'css' ? 'link' : 'script');

            if (tipo === 'css') {
                elemento.rel = 'stylesheet';
                elemento.href = endereco;
            } else {
                elemento.src = endereco;
            }

            const limite = setTimeout(() => reject(new Error('Demorou demais')), 8000);

            elemento.onload = () => {
                clearTimeout(limite);
                resolve();
            };

            elemento.onerror = () => {
                clearTimeout(limite);
                elemento.remove();
                reject(new Error('Não carregou'));
            };

            document.head.append(elemento);
        });
    }

    async function carregarLeaflet() {
        if (window.L) return true;

        for (const fonte of FONTES_LEAFLET) {
            try {
                await carregarArquivo('css', fonte.css);
                await carregarArquivo('js', fonte.js);
                if (window.L) return true;
            } catch (erro) {
                // tenta a próxima fonte
            }
        }

        return false;
    }


    // ==========================================
    // 4. MAPA COMPLETO (TODOS OS POLOS)
    // ==========================================

    // Coloca as imagens do mapa; se não carregarem, troca de servidor
    function colocarCamada(indice) {
        if (indice >= CAMADAS.length) {
            usarReserva();
            return;
        }

        const camada = L.tileLayer(CAMADAS[indice].url, CAMADAS[indice].opcoes);
        let carregou = false;
        let trocou = false;
        let erros = 0;

        function trocarCamada() {
            if (trocou || carregou || modo !== 'completo') return;
            trocou = true;
            mapa.removeLayer(camada);
            colocarCamada(indice + 1);
        }

        camada.on('tileload', () => {
            carregou = true;
        });

        camada.on('tileerror', () => {
            erros++;
            if (erros >= 4) trocarCamada();
        });

        camada.addTo(mapa);
        setTimeout(trocarCamada, 6000);
    }

    function criarPopup(polo) {
        const conteudo = document.createElement('div');
        conteudo.className = 'popup-polo';

        const titulo = document.createElement('strong');
        titulo.textContent = polo.nome;

        const texto = document.createElement('p');
        texto.textContent = polo.descricao;

        const link = document.createElement('a');
        link.href = linkGoogleMaps(polo);
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = 'Abrir no Google Maps';

        conteudo.append(titulo, texto, link);
        return conteudo;
    }

    function verTodos() {
        if (modo !== 'completo') return;

        const limites = L.latLngBounds(POLOS.map(polo => [polo.latitude, polo.longitude]));
        mapa.closePopup();
        mapa.flyToBounds(limites, { padding: [50, 50], duration: 0.8 });

        destacar('todos');
        escreverLegenda('Mostrando todas as regiões. Clique em um pino ou em um polo abaixo para aproximar.');
    }

    function iniciarMapaCompleto() {
        modo = 'completo';

        mapa = L.map(areaMapa, {
            scrollWheelZoom: false // não atrapalha quem está rolando a página
        });

        colocarCamada(0);

        // Pino próprio do site (não depende de imagens de fora)
        const pino = L.divIcon({
            className: 'pino-polo',
            html: '<span><b>✿</b></span>',
            iconSize: [38, 38],
            iconAnchor: [19, 38],
            popupAnchor: [0, -34]
        });

        POLOS.forEach(polo => {
            const marcador = L.marker([polo.latitude, polo.longitude], {
                icon: pino,
                title: polo.nome,
                alt: polo.nome
            });

            marcador.bindPopup(criarPopup(polo));
            marcador.on('click', () => {
                destacar(polo.id);
                escreverLegenda(`Mostrando: ${polo.nome}.`);
            });

            marcador.addTo(mapa);
            marcadores[polo.id] = marcador;
        });

        const limites = L.latLngBounds(POLOS.map(polo => [polo.latitude, polo.longitude]));
        mapa.fitBounds(limites, { padding: [50, 50] });

        destacar('todos');
        escreverLegenda('Mostrando todas as regiões. Clique em um pino ou em um polo abaixo para aproximar.');

        setTimeout(() => mapa.invalidateSize(), 300);
    }


    // ==========================================
    // 5. MAPA RESERVA (GOOGLE MAPS, UM POLO POR VEZ)
    // ==========================================

    function usarReserva() {
        if (modo === 'reserva') return;
        modo = 'reserva';

        if (mapa) {
            mapa.remove();
            mapa = null;
        }

        areaMapa.hidden = true;
        if (mapaReserva) mapaReserva.hidden = false;
        if (botaoTodos) botaoTodos.hidden = true;

        mostrarPolo(POLOS[0].id);
        escreverLegenda(
            'Não foi possível mostrar todos os polos juntos nesta rede. Mostrando um polo por vez.'
        );
    }


    // ==========================================
    // 6. MOSTRAR UM POLO
    // ==========================================

    function mostrarPolo(idPolo) {
        const polo = POLOS.find(p => p.id === idPolo);
        if (!polo) return;

        if (modo === 'completo' && mapa) {
            mapa.flyTo([polo.latitude, polo.longitude], polo.zoom, { duration: 0.8 });
            marcadores[polo.id]?.openPopup();
        } else if (mapaReserva) {
            mapaReserva.src =
                `https://maps.google.com/maps?q=${encodeURIComponent(polo.busca)}&z=${polo.zoom}&output=embed`;
            mapaReserva.title = `Mapa: ${polo.nome}`;
        }

        destacar(polo.id);
        escreverLegenda(`Mostrando: ${polo.nome}.`);
    }

    botaoTodos?.addEventListener('click', verTodos);


    // ==========================================
    // 7. INÍCIO
    // ==========================================

    escreverLegenda('Carregando o mapa...');

    // Monta os cartões na hora (sem lojas) e completa quando o back-end responder
    montarCartoes([]);
    if (window.Bloom) {
        window.Bloom.api('/lojas').then(montarCartoes).catch(() => {});
    }

    carregarLeaflet().then(conseguiu => {
        if (conseguiu) {
            iniciarMapaCompleto();
        } else {
            usarReserva();
        }
    });
});
