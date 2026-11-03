// ==================================================
// BLOOMMARKET — MAPA COM TODOS OS POLOS
// Mostra os 3 polos ao mesmo tempo usando a biblioteca Leaflet.
// Se a rede bloquear o mapa, usa o Google Maps embutido como reserva
// (nesse caso, um polo por vez).
// ==================================================


document.addEventListener('DOMContentLoaded', () => {


    // ==========================================
    // 1. DADOS DOS POLOS
    // ==========================================


    const POLOS = [
        {
            id: 'holambra',
            nome: 'Holambra - SP',
            descricao: 'Maior polo de flores ornamentais do Brasil.',
            busca: 'Holambra, SP',
            latitude: -22.6322,
            longitude: -47.0542,
            zoom: 11
        },
        {
            id: 'mantiqueira',
            nome: 'Mantiqueira - MG',
            descricao: 'Região de clima ameno, com produção de flores.',
            busca: 'Serra da Mantiqueira, MG',
            latitude: -22.55,
            longitude: -45.55,
            zoom: 9
        },
        {
            id: 'serra-gaucha',
            nome: 'Serra Gaúcha - RS',
            descricao: 'Região de clima frio, com cultivo de flores e plantas.',
            busca: 'Serra Gaúcha, RS',
            latitude: -29.1654,
            longitude: -51.5173,
            zoom: 9
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
    const cartoes = document.querySelectorAll('.cartao-polo[data-polo-mapa]');


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
        escreverLegenda('Mostrando todos os polos. Clique em um pino ou em um polo abaixo para aproximar.');
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
        escreverLegenda('Mostrando todos os polos. Clique em um pino ou em um polo abaixo para aproximar.');


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


    cartoes.forEach(cartao => {
        cartao.querySelector('.botao-ver-mapa')?.addEventListener('click', () => {
            mostrarPolo(cartao.dataset.poloMapa);
            (modo === 'reserva' ? mapaReserva : areaMapa)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });


    botaoTodos?.addEventListener('click', verTodos);




    // ==========================================
    // 7. INÍCIO
    // ==========================================


    escreverLegenda('Carregando o mapa...');


    carregarLeaflet().then(conseguiu => {
        if (conseguiu) {
            iniciarMapaCompleto();
        } else {
            usarReserva();
        }
    });
});



