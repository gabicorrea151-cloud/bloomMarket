-- ==================================================
-- BLOOMMARKET — CRIAÇÃO DO BANCO E CARGA DE DADOS (versão 2)
-- No SSMS: Ctrl + O > escolha este arquivo > aperte F5
-- ATENÇÃO: apaga as tabelas e cria tudo de novo
--
-- Senha de TODAS as contas de teste: 123456
--   Clientes: ana@email.com e bruno@email.com
--   Lojas:    holambra@bloommarket.com, pinhais@bloommarket.com,
--             gravata@bloommarket.com, brasilia@bloommarket.com,
--             benevides@bloommarket.com
-- ==================================================

IF DB_ID('BloomMarket') IS NULL
    CREATE DATABASE BloomMarket;
GO

USE BloomMarket;
GO

-- Apaga na ordem certa (primeiro quem depende dos outros)
DROP TABLE IF EXISTS tb_avaliacao;
DROP TABLE IF EXISTS tb_itens_pedido;
DROP TABLE IF EXISTS tb_pedidos;
DROP TABLE IF EXISTS tb_cupons;
DROP TABLE IF EXISTS tb_variacao;
DROP TABLE IF EXISTS tb_funcionarios;
DROP TABLE IF EXISTS tb_formPag;
DROP TABLE IF EXISTS tb_produtos;
DROP TABLE IF EXISTS tb_lojas;
DROP TABLE IF EXISTS tb_clientes;
GO

-- ==================================================
-- TABELAS
-- ==================================================

CREATE TABLE tb_clientes (
    id_cli INT IDENTITY PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    cpf VARCHAR(11) NOT NULL UNIQUE,
    telefone VARCHAR(15) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    cep VARCHAR(9) NOT NULL,
    rua VARCHAR(150) NULL,
    numero VARCHAR(10) NOT NULL,
    complemento VARCHAR(100) NOT NULL DEFAULT '',
    bairro VARCHAR(100) NULL,
    cidade VARCHAR(100) NULL,
    estado CHAR(2) NULL,
    data_cadastro DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE)
);

-- Lojas dos fornecedores
CREATE TABLE tb_lojas (
    id_loja INT IDENTITY PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    responsavel VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    documento VARCHAR(14) NOT NULL UNIQUE,   -- CPF (11) ou CNPJ (14), só números
    telefone VARCHAR(15) NOT NULL,
    localizacao VARCHAR(100) NOT NULL,       -- região, ex.: 'Holambra - SP'
    cidade VARCHAR(100) NOT NULL,
    descricao VARCHAR(500) NULL,
    senha VARCHAR(255) NOT NULL,
    bloqueada BIT NOT NULL DEFAULT 0,
    data_cadastro DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE)
);

CREATE TABLE tb_funcionarios (
    id_fun INT PRIMARY KEY,
    id_loja INT NULL,
    nome VARCHAR(100),
    especialidade VARCHAR(100),
    localizacao VARCHAR(100),
    descricao VARCHAR(500),
    FOREIGN KEY (id_loja) REFERENCES tb_lojas(id_loja)
);

CREATE TABLE tb_produtos (
    id_prod INT PRIMARY KEY,
    categoria VARCHAR(100),
    nome VARCHAR(100)
);

CREATE TABLE tb_variacao (
    id_var INT IDENTITY PRIMARY KEY,
    id_prod INT NOT NULL,
    id_loja INT NOT NULL,
    cor VARCHAR(100),
    tamanho VARCHAR(30),
    localizacao VARCHAR(100),
    preco DECIMAL(10,2),
    disponivel BIT NOT NULL DEFAULT 1,
    estoque INT,
    descricao VARCHAR(500) NULL,
    imagem VARCHAR(MAX) NULL,                -- caminho da foto ou foto enviada pela loja
    FOREIGN KEY (id_prod) REFERENCES tb_produtos(id_prod),
    FOREIGN KEY (id_loja) REFERENCES tb_lojas(id_loja)
);

CREATE TABLE tb_formPag (
    id_formPag INT PRIMARY KEY,
    nome VARCHAR(50)
);

CREATE TABLE tb_cupons (
    codigo VARCHAR(20) PRIMARY KEY,
    tipo VARCHAR(15) NOT NULL,               -- 'porcentagem', 'valor' ou 'frete'
    valor DECIMAL(10,2) NOT NULL DEFAULT 0,
    minimo DECIMAL(10,2) NOT NULL DEFAULT 0, -- pedido mínimo em produtos
    validade DATE NULL,
    limite_usos INT NOT NULL DEFAULT 0,      -- 0 = sem limite
    usos INT NOT NULL DEFAULT 0,
    primeira_compra BIT NOT NULL DEFAULT 0,
    ativo BIT NOT NULL DEFAULT 1
);

-- Um pedido por loja (cada loja faz a sua entrega)
CREATE TABLE tb_pedidos (
    id_pedido INT IDENTITY PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    data_pedido DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    id_cli INT NOT NULL,
    id_loja INT NOT NULL,
    id_formPag INT NOT NULL,
    detalhe_pagamento VARCHAR(100) NULL,     -- ex.: 'Visa final 4242, 3x sem juros'
    status VARCHAR(20) NOT NULL DEFAULT 'novo', -- novo, preparo, entrega, entregue, cancelado
    cancelado_por VARCHAR(10) NULL,          -- 'cliente' ou 'loja'
    data_entrega DATE NOT NULL,
    periodo VARCHAR(10) NOT NULL,            -- manha, tarde ou noite
    cep VARCHAR(9) NOT NULL,
    rua VARCHAR(150) NOT NULL,
    numero VARCHAR(10) NOT NULL,
    complemento VARCHAR(100) NULL,
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado CHAR(2) NOT NULL,
    destinatario VARCHAR(100) NULL,
    mensagem VARCHAR(200) NULL,
    cupom VARCHAR(20) NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    desconto DECIMAL(10,2) NOT NULL DEFAULT 0,
    taxa_entrega DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_cli) REFERENCES tb_clientes(id_cli),
    FOREIGN KEY (id_loja) REFERENCES tb_lojas(id_loja),
    FOREIGN KEY (id_formPag) REFERENCES tb_formPag(id_formPag)
);

-- Os produtos de cada pedido
CREATE TABLE tb_itens_pedido (
    id_item INT IDENTITY PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_var INT NOT NULL,
    quantidade INT NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,   -- preço no dia da compra
    FOREIGN KEY (id_pedido) REFERENCES tb_pedidos(id_pedido),
    FOREIGN KEY (id_var) REFERENCES tb_variacao(id_var)
);

-- Uma avaliação por pedido entregue
CREATE TABLE tb_avaliacao (
    id_ava INT IDENTITY PRIMARY KEY,
    id_cli INT NOT NULL,
    id_pedido INT NOT NULL UNIQUE,
    nota INT NOT NULL CHECK (nota BETWEEN 1 AND 5),
    comentario VARCHAR(200) NULL,
    data_avaliacao DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    FOREIGN KEY (id_cli) REFERENCES tb_clientes(id_cli),
    FOREIGN KEY (id_pedido) REFERENCES tb_pedidos(id_pedido)
);
GO

-- ==================================================
-- DADOS
-- ==================================================

SET IDENTITY_INSERT tb_lojas ON;
INSERT INTO tb_lojas (id_loja, nome, responsavel, email, documento, telefone, localizacao, cidade, descricao, senha) VALUES
(1, 'Flores de Holambra', 'Francisco Martins', 'holambra@bloommarket.com', '11222333000181', '(19) 99876-5432', 'Holambra - SP', 'Holambra', 'Rosas, tulipas e girassóis colhidos na capital nacional das flores.', '$2a$10$bIBuF/oDVbuE4q9bbDwmc.mxSd4x9ooA3u22/56bqDZAt465IJF7K'),
(2, 'Orquidário dos Pinhais', 'Rodolfo Gonçalves', 'pinhais@bloommarket.com', '12345678000195', '(41) 99777-1234', 'São José dos Pinhais - PR', 'São José dos Pinhais', 'Orquídeas, lírios e dálias cultivados no clima ameno do Paraná.', '$2a$10$bIBuF/oDVbuE4q9bbDwmc.mxSd4x9ooA3u22/56bqDZAt465IJF7K'),
(3, 'Ateliê Gravatá Flores', 'Otávio Neri', 'gravata@bloommarket.com', '45454545000106', '(81) 99666-4321', 'Gravatá - PE', 'Gravatá', 'Arranjos românticos e personalizados com peônias e lavandas.', '$2a$10$bIBuF/oDVbuE4q9bbDwmc.mxSd4x9ooA3u22/56bqDZAt465IJF7K'),
(4, 'Jardim do Planalto', 'Daniela Fagundes', 'brasilia@bloommarket.com', '67676767000106', '(61) 99555-9876', 'Brasília - DF', 'Brasília', 'Margaridas e papoulas em arranjos delicados para todas as ocasiões.', '$2a$10$bIBuF/oDVbuE4q9bbDwmc.mxSd4x9ooA3u22/56bqDZAt465IJF7K'),
(5, 'Jardim Amazônia', 'Jéssica Nascimento', 'benevides@bloommarket.com', '89898989000106', '(91) 99444-6543', 'Benevides - PA', 'Benevides', 'Jasmins e gardênias perfumados, montados com folhagens da região.', '$2a$10$bIBuF/oDVbuE4q9bbDwmc.mxSd4x9ooA3u22/56bqDZAt465IJF7K');
SET IDENTITY_INSERT tb_lojas OFF;

INSERT INTO tb_funcionarios (id_fun, id_loja, nome, especialidade, localizacao, descricao) VALUES
(101, 1, 'Francisco Martins', 'Tulipa', 'Holambra - SP', 'Francisco Martins é produtor de tulipas na região de Holambra, conhecida como a capital nacional das flores. Com anos de experiência no cultivo, ele se dedica a oferecer flores de alta qualidade, cultivadas com cuidado desde o plantio até a colheita.'),
(102, 2, 'Rodolfo Gonçalves', 'Orquídea', 'São José dos Pinhais - PR', 'Está no mercado há 12 anos. Começou com paisagismo e, depois, migrou para o setor de floricultura. Ao longo dos anos, adquiriu experiência no cuidado, cultivo e montagem de arranjos, além de desenvolver conhecimento sobre diferentes tipos de flores e suas características. Atualmente, atua na floricultura auxiliando na escolha das flores e na criação de arranjos de acordo com a preferência dos clientes.'),
(103, 3, 'Otávio Neri', 'Peônia', 'Gravatá - PE', 'Atua no ramo de floricultura há 8 anos e foca em arranjos românticos e personalizados. Possui experiência na combinação de diferentes flores e cores, buscando criar arranjos que representem os sentimentos e a personalidade de cada cliente. Também trabalha com pedidos especiais para datas comemorativas e momentos importantes, sempre procurando deixar cada arranjo único e especial.'),
(104, 4, 'Daniela Fagundes', 'Margaridas', 'Brasília - DF', 'Daniela Fagundes atua no ramo de floricultura há 7 anos. Começou trabalhando com a organização e conservação das flores e, com o passar do tempo, passou a se especializar na montagem de arranjos. É conhecida pela criatividade na combinação de cores e flores, buscando criar arranjos delicados e personalizados para diferentes ocasiões. Também auxilia os clientes na escolha das flores de acordo com o estilo e a finalidade do presente.'),
(105, 5, 'Jéssica Nascimento', 'Jasmin', 'Benevides - PA', 'Atua no ramo de floricultura há 6 anos. Começou ajudando nos cuidados e na organização das flores e, com o tempo, passou a trabalhar diretamente com a montagem de arranjos. Possui experiência na combinação de flores e folhagens, criando arranjos delicados e perfumados para diferentes ocasiões. É conhecida pelo cuidado com os detalhes e pela criatividade ao montar cada pedido.');

INSERT INTO tb_produtos VALUES
(1, 'Arranjo', 'Rosa'),
(2, 'Arranjo', 'Tulipa'),
(3, 'Arranjo', 'Girassol'),
(4, 'Arranjo', 'Margarida'),
(5, 'Arranjo', 'Lírio'),
(6, 'Arranjo', 'Orquídea'),
(7, 'Arranjo', 'Peônia'),
(8, 'Arranjo', 'Jasmin'),
(9, 'Arranjo', 'Lavanda'),
(10, 'Arranjo', 'Papoula'),
(11, 'Arranjo', 'Dália'),
(12, 'Arranjo', 'Gardênia');

INSERT INTO tb_formPag VALUES
(1, 'Pix'),
(2, 'Cartão de Crédito'),
(3, 'Boleto');

SET IDENTITY_INSERT tb_variacao ON;
INSERT INTO tb_variacao (id_var, id_prod, id_loja, cor, tamanho, localizacao, preco, estoque, imagem) VALUES
-- ROSA - Holambra - SP
(1, 1, 1, 'Amarelo', 'Pequeno', 'Holambra - SP', 55.00, 5, 'imagens/arranjo-amarelo.png'),
(2, 1, 1, 'Branco', 'Pequeno', 'Holambra - SP', 55.00, 5, 'imagens/arranjo-branco.png'),
(3, 1, 1, 'Rosa', 'Pequeno', 'Holambra - SP', 50.00, 10, 'imagens/arranjo-rosa.png'),
(4, 1, 1, 'Vermelho', 'Pequeno', 'Holambra - SP', 55.00, 5, 'imagens/arranjo-vermelho.png'),
(5, 1, 1, 'Laranja', 'Pequeno', 'Holambra - SP', 55.00, 5, 'imagens/arranjo-laranja.png'),
(6, 1, 1, 'Lilás', 'Pequeno', 'Holambra - SP', 50.00, 10, 'imagens/arranjo-lilas.png'),
(7, 1, 1, 'Amarelo', 'Grande', 'Holambra - SP', 95.00, 5, 'imagens/arranjo-amarelo.png'),
(8, 1, 1, 'Branco', 'Grande', 'Holambra - SP', 95.00, 5, 'imagens/arranjo-branco.png'),
(9, 1, 1, 'Rosa', 'Grande', 'Holambra - SP', 90.00, 10, 'imagens/arranjo-rosa.png'),
(10, 1, 1, 'Vermelho', 'Grande', 'Holambra - SP', 95.00, 5, 'imagens/arranjo-vermelho.png'),
(11, 1, 1, 'Laranja', 'Grande', 'Holambra - SP', 95.00, 5, 'imagens/arranjo-laranja.png'),
(12, 1, 1, 'Lilás', 'Grande', 'Holambra - SP', 90.00, 10, 'imagens/arranjo-lilas.png'),
-- TULIPA - Holambra - SP
(13, 2, 1, 'Amarelo', 'Pequeno', 'Holambra - SP', 55.00, 5, 'imagens/arranjo-amarelo-tulipa.png'),
(14, 2, 1, 'Branco', 'Pequeno', 'Holambra - SP', 55.00, 5, 'imagens/arranjo-branco-tulipa.png'),
(15, 2, 1, 'Rosa', 'Pequeno', 'Holambra - SP', 50.00, 10, 'imagens/arranjo-rosa-tulipa.png'),
(16, 2, 1, 'Vermelho', 'Pequeno', 'Holambra - SP', 55.00, 5, 'imagens/arranjo-vermelho-tulipa.png'),
(17, 2, 1, 'Laranja', 'Pequeno', 'Holambra - SP', 55.00, 5, 'imagens/arranjo-laranja-tulipa.png'),
(18, 2, 1, 'Roxo', 'Pequeno', 'Holambra - SP', 50.00, 10, 'imagens/arranjo-roxo-tulipa.png'),
(19, 2, 1, 'Amarelo', 'Grande', 'Holambra - SP', 95.00, 5, 'imagens/arranjo-amarelo-tulipa.png'),
(20, 2, 1, 'Branco', 'Grande', 'Holambra - SP', 95.00, 5, 'imagens/arranjo-branco-tulipa.png'),
(21, 2, 1, 'Rosa', 'Grande', 'Holambra - SP', 90.00, 10, 'imagens/arranjo-rosa-tulipa.png'),
(22, 2, 1, 'Vermelho', 'Grande', 'Holambra - SP', 95.00, 5, 'imagens/arranjo-vermelho-tulipa.png'),
(23, 2, 1, 'Laranja', 'Grande', 'Holambra - SP', 95.00, 5, 'imagens/arranjo-laranja-tulipa.png'),
(24, 2, 1, 'Roxo', 'Grande', 'Holambra - SP', 90.00, 10, 'imagens/arranjo-roxo-tulipa.png'),
-- GIRASSOL - Holambra - SP
(25, 3, 1, 'Amarelo', 'Pequeno', 'Holambra - SP', 55.00, 5, 'imagens/arranjo-amarelo-girassól.png'),
(26, 3, 1, 'Laranja', 'Pequeno', 'Holambra - SP', 55.00, 5, 'imagens/arranjo-laranja-girassól.png'),
(27, 3, 1, 'Amarelo', 'Grande', 'Holambra - SP', 95.00, 5, 'imagens/arranjo-amarelo-girassól.png'),
(28, 3, 1, 'Laranja', 'Grande', 'Holambra - SP', 95.00, 5, 'imagens/arranjo-laranja-girassól.png'),
-- MARGARIDA - Brasília - DF
(29, 4, 4, 'Branco', 'Pequeno', 'Brasília - DF', 55.00, 5, 'imagens/arranjo-branco-margarida.png'),
(30, 4, 4, 'Amarelo', 'Pequeno', 'Brasília - DF', 55.00, 5, 'imagens/arranjo-amarelo-margarida.png'),
(31, 4, 4, 'Rosa', 'Pequeno', 'Brasília - DF', 50.00, 10, 'imagens/arranjo-rosa-margarida.png'),
(32, 4, 4, 'Vermelho', 'Pequeno', 'Brasília - DF', 55.00, 5, 'imagens/arranjo-vermelho-margarida.png'),
(33, 4, 4, 'Lilás', 'Pequeno', 'Brasília - DF', 55.00, 5, 'imagens/arranjo-lilas-margarida.png'),
(34, 4, 4, 'Laranja', 'Pequeno', 'Brasília - DF', 50.00, 10, 'imagens/arranjo-laranja-margarida.png'),
(35, 4, 4, 'Branco', 'Grande', 'Brasília - DF', 95.00, 5, 'imagens/arranjo-branco-margarida.png'),
(36, 4, 4, 'Amarelo', 'Grande', 'Brasília - DF', 95.00, 5, 'imagens/arranjo-amarelo-margarida.png'),
(37, 4, 4, 'Rosa', 'Grande', 'Brasília - DF', 90.00, 10, 'imagens/arranjo-rosa-margarida.png'),
(38, 4, 4, 'Vermelho', 'Grande', 'Brasília - DF', 95.00, 5, 'imagens/arranjo-vermelho-margarida.png'),
(39, 4, 4, 'Lilás', 'Grande', 'Brasília - DF', 95.00, 5, 'imagens/arranjo-lilas-margarida.png'),
(40, 4, 4, 'Laranja', 'Grande', 'Brasília - DF', 90.00, 10, 'imagens/arranjo-laranja-margarida.png'),
-- LÍRIO - São José dos Pinhais - PR
(41, 5, 2, 'Branco', 'Pequeno', 'São José dos Pinhais - PR', 55.00, 5, 'imagens/arranjo-branco-lirios.png'),
(42, 5, 2, 'Amarelo', 'Pequeno', 'São José dos Pinhais - PR', 55.00, 5, 'imagens/arranjo-amarelo-lirios.png'),
(43, 5, 2, 'Rosa', 'Pequeno', 'São José dos Pinhais - PR', 50.00, 10, 'imagens/arranjo-rosa-lirios.png'),
(44, 5, 2, 'Laranja', 'Pequeno', 'São José dos Pinhais - PR', 55.00, 5, 'imagens/arranjo-laranja-lirios.png'),
(45, 5, 2, 'Vermelho', 'Pequeno', 'São José dos Pinhais - PR', 55.00, 5, 'imagens/arranjo-vermelho-lirios.png'),
(46, 5, 2, 'Roxo', 'Pequeno', 'São José dos Pinhais - PR', 50.00, 10, 'imagens/arranjo-roxo-lirios.png'),
(47, 5, 2, 'Branco', 'Grande', 'São José dos Pinhais - PR', 95.00, 5, 'imagens/arranjo-branco-lirios.png'),
(48, 5, 2, 'Amarelo', 'Grande', 'São José dos Pinhais - PR', 95.00, 5, 'imagens/arranjo-amarelo-lirios.png'),
(49, 5, 2, 'Rosa', 'Grande', 'São José dos Pinhais - PR', 90.00, 10, 'imagens/arranjo-rosa-lirios.png'),
(50, 5, 2, 'Laranja', 'Grande', 'São José dos Pinhais - PR', 95.00, 5, 'imagens/arranjo-laranja-lirios.png'),
(51, 5, 2, 'Vermelho', 'Grande', 'São José dos Pinhais - PR', 95.00, 5, 'imagens/arranjo-vermelho-lirios.png'),
(52, 5, 2, 'Roxo', 'Grande', 'São José dos Pinhais - PR', 90.00, 10, 'imagens/arranjo-roxo-lirios.png'),
-- ORQUÍDEA - São José dos Pinhais - PR
(53, 6, 2, 'Branco', 'Pequeno', 'São José dos Pinhais - PR', 55.00, 5, 'imagens/arranjo-branco-orquidea.png'),
(54, 6, 2, 'Amarelo', 'Pequeno', 'São José dos Pinhais - PR', 55.00, 5, 'imagens/arranjo-amarelo-orquidea.png'),
(55, 6, 2, 'Rosa', 'Pequeno', 'São José dos Pinhais - PR', 50.00, 10, 'imagens/arranjo-rosa-orquidea.png'),
(56, 6, 2, 'Roxo', 'Pequeno', 'São José dos Pinhais - PR', 55.00, 5, 'imagens/arranjo-roxo-orquidea.png'),
(57, 6, 2, 'Vermelho', 'Pequeno', 'São José dos Pinhais - PR', 55.00, 5, 'imagens/arranjo-vermelho-orquidea.png'),
(58, 6, 2, 'Laranja', 'Pequeno', 'São José dos Pinhais - PR', 50.00, 10, 'imagens/arranjo-laranja-orquidea.png'),
(59, 6, 2, 'Branco', 'Grande', 'São José dos Pinhais - PR', 95.00, 5, 'imagens/arranjo-branco-orquidea.png'),
(60, 6, 2, 'Amarelo', 'Grande', 'São José dos Pinhais - PR', 95.00, 5, 'imagens/arranjo-amarelo-orquidea.png'),
(61, 6, 2, 'Rosa', 'Grande', 'São José dos Pinhais - PR', 90.00, 10, 'imagens/arranjo-rosa-orquidea.png'),
(62, 6, 2, 'Roxo', 'Grande', 'São José dos Pinhais - PR', 95.00, 5, 'imagens/arranjo-roxo-orquidea.png'),
(63, 6, 2, 'Vermelho', 'Grande', 'São José dos Pinhais - PR', 95.00, 5, 'imagens/arranjo-vermelho-orquidea.png'),
(64, 6, 2, 'Laranja', 'Grande', 'São José dos Pinhais - PR', 90.00, 10, 'imagens/arranjo-laranja-orquidea.png'),
-- PEÔNIA - Gravatá - PE
(65, 7, 3, 'Branco', 'Pequeno', 'Gravatá - PE', 55.00, 5, 'imagens/arranjo-branco-peonia.png'),
(66, 7, 3, 'Rosa', 'Pequeno', 'Gravatá - PE', 55.00, 5, 'imagens/arranjo-rosa-peonia.png'),
(67, 7, 3, 'Vermelho', 'Pequeno', 'Gravatá - PE', 50.00, 10, 'imagens/arranjo-vermelho-peonia.png'),
(68, 7, 3, 'Coral', 'Pequeno', 'Gravatá - PE', 55.00, 5, 'imagens/arranjo-coral-peonia.png'),
(69, 7, 3, 'Amarelo', 'Pequeno', 'Gravatá - PE', 55.00, 5, 'imagens/arranjo-amarelo-peonia.png'),
(70, 7, 3, 'Vinho', 'Pequeno', 'Gravatá - PE', 50.00, 10, 'imagens/arranjo-vinho-peonia.png'),
(71, 7, 3, 'Branco', 'Grande', 'Gravatá - PE', 95.00, 5, 'imagens/arranjo-branco-peonia.png'),
(72, 7, 3, 'Rosa', 'Grande', 'Gravatá - PE', 95.00, 5, 'imagens/arranjo-rosa-peonia.png'),
(73, 7, 3, 'Vermelho', 'Grande', 'Gravatá - PE', 90.00, 10, 'imagens/arranjo-vermelho-peonia.png'),
(74, 7, 3, 'Coral', 'Grande', 'Gravatá - PE', 95.00, 5, 'imagens/arranjo-coral-peonia.png'),
(75, 7, 3, 'Amarelo', 'Grande', 'Gravatá - PE', 95.00, 5, 'imagens/arranjo-amarelo-peonia.png'),
(76, 7, 3, 'Vinho', 'Grande', 'Gravatá - PE', 90.00, 10, 'imagens/arranjo-vinho-peonia.png'),
-- JASMIN - Benevides - PA
(77, 8, 5, 'Branco', 'Pequeno', 'Benevides - PA', 55.00, 5, 'imagens/arranjo-branco-jasmim.png'),
(78, 8, 5, 'Amarelo', 'Pequeno', 'Benevides - PA', 55.00, 5, 'imagens/arranjo-amarelo-jasmim.png'),
(79, 8, 5, 'Rosa-claro', 'Pequeno', 'Benevides - PA', 50.00, 10, 'imagens/arranjo-rosa-claro-jasmim.png'),
(80, 8, 5, 'Creme', 'Pequeno', 'Benevides - PA', 55.00, 5, 'imagens/arranjo-creme-jasmim.png'),
(81, 8, 5, 'Amarelo-claro', 'Pequeno', 'Benevides - PA', 50.00, 10, 'imagens/arranjo-amarelo-claro-jasmim.png'),
(82, 8, 5, 'Branco', 'Grande', 'Benevides - PA', 95.00, 5, 'imagens/arranjo-branco-jasmim.png'),
(83, 8, 5, 'Amarelo', 'Grande', 'Benevides - PA', 95.00, 5, 'imagens/arranjo-amarelo-jasmim.png'),
(84, 8, 5, 'Rosa-claro', 'Grande', 'Benevides - PA', 90.00, 10, 'imagens/arranjo-rosa-claro-jasmim.png'),
(85, 8, 5, 'Creme', 'Grande', 'Benevides - PA', 95.00, 5, 'imagens/arranjo-creme-jasmim.png'),
(86, 8, 5, 'Amarelo-claro', 'Grande', 'Benevides - PA', 90.00, 10, 'imagens/arranjo-amarelo-claro-jasmim.png'),
-- LAVANDA - Gravatá - PE
(87, 9, 3, 'Roxo', 'Pequeno', 'Gravatá - PE', 55.00, 5, 'imagens/arranjo-roxo-lavanda.png'),
(88, 9, 3, 'Lilás', 'Pequeno', 'Gravatá - PE', 55.00, 5, 'imagens/arranjo-lilas-lavanda.png'),
(89, 9, 3, 'Rosa', 'Pequeno', 'Gravatá - PE', 50.00, 10, 'imagens/arranjo-rosa-lavanda.png'),
(90, 9, 3, 'Branco', 'Pequeno', 'Gravatá - PE', 55.00, 5, 'imagens/arranjo-branco-lavanda.png'),
(91, 9, 3, 'Azul-arroxeado', 'Pequeno', 'Gravatá - PE', 55.00, 5, 'imagens/arranjo-azul-arroxeado-lavanda.png'),
(92, 9, 3, 'Lilás-claro', 'Pequeno', 'Gravatá - PE', 50.00, 10, 'imagens/arranjo-lilas-claro-lavanda.png'),
(93, 9, 3, 'Roxo', 'Grande', 'Gravatá - PE', 95.00, 5, 'imagens/arranjo-roxo-lavanda.png'),
(94, 9, 3, 'Lilás', 'Grande', 'Gravatá - PE', 95.00, 5, 'imagens/arranjo-lilas-lavanda.png'),
(95, 9, 3, 'Rosa', 'Grande', 'Gravatá - PE', 90.00, 10, 'imagens/arranjo-rosa-lavanda.png'),
(96, 9, 3, 'Branco', 'Grande', 'Gravatá - PE', 95.00, 5, 'imagens/arranjo-branco-lavanda.png'),
(97, 9, 3, 'Azul-arroxeado', 'Grande', 'Gravatá - PE', 95.00, 5, 'imagens/arranjo-azul-arroxeado-lavanda.png'),
(98, 9, 3, 'Lilás-claro', 'Grande', 'Gravatá - PE', 90.00, 10, 'imagens/arranjo-lilas-claro-lavanda.png'),
-- PAPOULA - Brasília - DF
(99, 10, 4, 'Vermelho', 'Pequeno', 'Brasília - DF', 55.00, 5, 'imagens/arranjo-vermelho-papoula.png'),
(100, 10, 4, 'Laranja', 'Pequeno', 'Brasília - DF', 55.00, 5, 'imagens/arranjo-laranja-papoula.png'),
(101, 10, 4, 'Rosa', 'Pequeno', 'Brasília - DF', 50.00, 10, 'imagens/arranjo-rosa-papoula.png'),
(102, 10, 4, 'Branco', 'Pequeno', 'Brasília - DF', 55.00, 5, 'imagens/arranjo-branco-papoula.png'),
(103, 10, 4, 'Amarelo', 'Pequeno', 'Brasília - DF', 55.00, 5, 'imagens/arranjo-amarelo-papoula.png'),
(104, 10, 4, 'Roxo', 'Pequeno', 'Brasília - DF', 50.00, 10, 'imagens/arranjo-roxo-papoula.png'),
(105, 10, 4, 'Vermelho', 'Grande', 'Brasília - DF', 95.00, 5, 'imagens/arranjo-vermelho-papoula.png'),
(106, 10, 4, 'Laranja', 'Grande', 'Brasília - DF', 95.00, 5, 'imagens/arranjo-laranja-papoula.png'),
(107, 10, 4, 'Rosa', 'Grande', 'Brasília - DF', 90.00, 10, 'imagens/arranjo-rosa-papoula.png'),
(108, 10, 4, 'Branco', 'Grande', 'Brasília - DF', 95.00, 5, 'imagens/arranjo-branco-papoula.png'),
(109, 10, 4, 'Amarelo', 'Grande', 'Brasília - DF', 95.00, 5, 'imagens/arranjo-amarelo-papoula.png'),
(110, 10, 4, 'Roxo', 'Grande', 'Brasília - DF', 90.00, 10, 'imagens/arranjo-roxo-papoula.png'),
-- DÁLIA - São José dos Pinhais - PR
(111, 11, 2, 'Branco', 'Pequeno', 'São José dos Pinhais - PR', 55.00, 5, 'imagens/arranjo-branco-dalia.png'),
(112, 11, 2, 'Amarelo', 'Pequeno', 'São José dos Pinhais - PR', 55.00, 5, 'imagens/arranjo-amarelo-dalia.png'),
(113, 11, 2, 'Rosa', 'Pequeno', 'São José dos Pinhais - PR', 50.00, 10, 'imagens/arranjo-rosa-dalia.png'),
(114, 11, 2, 'Vermelho', 'Pequeno', 'São José dos Pinhais - PR', 55.00, 5, 'imagens/arranjo-vermelho-dalia.png'),
(115, 11, 2, 'Laranja', 'Pequeno', 'São José dos Pinhais - PR', 55.00, 5, 'imagens/arranjo-laranja-dalia.png'),
(116, 11, 2, 'Roxo', 'Pequeno', 'São José dos Pinhais - PR', 50.00, 10, 'imagens/arranjo-roxo-dalia.png'),
(117, 11, 2, 'Branco', 'Grande', 'São José dos Pinhais - PR', 95.00, 5, 'imagens/arranjo-branco-dalia.png'),
(118, 11, 2, 'Amarelo', 'Grande', 'São José dos Pinhais - PR', 95.00, 5, 'imagens/arranjo-amarelo-dalia.png'),
(119, 11, 2, 'Rosa', 'Grande', 'São José dos Pinhais - PR', 90.00, 10, 'imagens/arranjo-rosa-dalia.png'),
(120, 11, 2, 'Vermelho', 'Grande', 'São José dos Pinhais - PR', 95.00, 5, 'imagens/arranjo-vermelho-dalia.png'),
(121, 11, 2, 'Laranja', 'Grande', 'São José dos Pinhais - PR', 95.00, 5, 'imagens/arranjo-laranja-dalia.png'),
(122, 11, 2, 'Roxo', 'Grande', 'São José dos Pinhais - PR', 90.00, 10, 'imagens/arranjo-roxo-dalia.png'),
-- GARDÊNIA - Benevides - PA
(123, 12, 5, 'Branco', 'Pequeno', 'Benevides - PA', 55.00, 5, 'imagens/arranjo-branco-gardenia.png'),
(124, 12, 5, 'Creme', 'Pequeno', 'Benevides - PA', 55.00, 5, 'imagens/arranjo-creme-gardenia.png'),
(125, 12, 5, 'Marfim', 'Pequeno', 'Benevides - PA', 50.00, 10, 'imagens/arranjo-marfim-gardenia.png'),
(126, 12, 5, 'Amarelo-claro', 'Pequeno', 'Benevides - PA', 55.00, 5, 'imagens/arranjo-amarelo-gardenia-claro.png'),
(127, 12, 5, 'Rosa-claro', 'Pequeno', 'Benevides - PA', 55.00, 5, 'imagens/arranjo-rosa-claro-gardenia.png'),
(128, 12, 5, 'Branco', 'Grande', 'Benevides - PA', 95.00, 5, 'imagens/arranjo-branco-gardenia.png'),
(129, 12, 5, 'Creme', 'Grande', 'Benevides - PA', 95.00, 5, 'imagens/arranjo-creme-gardenia.png'),
(130, 12, 5, 'Marfim', 'Grande', 'Benevides - PA', 90.00, 10, 'imagens/arranjo-marfim-gardenia.png'),
(131, 12, 5, 'Amarelo-claro', 'Grande', 'Benevides - PA', 95.00, 5, 'imagens/arranjo-amarelo-gardenia-claro.png'),
(132, 12, 5, 'Rosa-claro', 'Grande', 'Benevides - PA', 95.00, 5, 'imagens/arranjo-rosa-claro-gardenia.png');
SET IDENTITY_INSERT tb_variacao OFF;


INSERT INTO tb_cupons (codigo, tipo, valor, minimo, primeira_compra) VALUES
('BLOOM10', 'porcentagem', 10, 0, 0),
('PRIMEIRACOMPRA', 'porcentagem', 15, 0, 1),
('FRETEGRATIS', 'frete', 0, 80, 0);


-- Clientes de teste (senha 123456)
SET IDENTITY_INSERT tb_clientes ON;
INSERT INTO tb_clientes (id_cli, nome, email, cpf, telefone, senha, cep, rua, numero, complemento, bairro, cidade, estado) VALUES
(1, 'Ana Souza', 'ana@email.com', '52998224725', '(11) 98888-1111', '$2a$10$bIBuF/oDVbuE4q9bbDwmc.mxSd4x9ooA3u22/56bqDZAt465IJF7K', '01304-001', 'Rua Augusta', '1500', 'Apto 42', 'Consolação', 'São Paulo', 'SP'),
(2, 'Bruno Lima', 'bruno@email.com', '11144477735', '(35) 98888-2222', '$2a$10$bIBuF/oDVbuE4q9bbDwmc.mxSd4x9ooA3u22/56bqDZAt465IJF7K', '37550-000', 'Rua Comendador José Garcia', '200', '', 'Centro', 'Pouso Alegre', 'MG');
SET IDENTITY_INSERT tb_clientes OFF;

-- Pedidos de exemplo (para a apresentação já ter dados)
SET IDENTITY_INSERT tb_pedidos ON;
INSERT INTO tb_pedidos (id_pedido, codigo, data_pedido, id_cli, id_loja, id_formPag, detalhe_pagamento, status, data_entrega, periodo,
    cep, rua, numero, complemento, bairro, cidade, estado, destinatario, mensagem, subtotal, desconto, taxa_entrega, total) VALUES
(1, 'DEMO01', DATEADD(DAY, -6, SYSDATETIME()), 1, 1, 1, 'Pix', 'entregue', CAST(DATEADD(DAY, -5, GETDATE()) AS DATE), 'tarde',
    '01304-001', 'Rua Augusta', '1500', 'Apto 42', 'Consolação', 'São Paulo', 'SP', 'Mãe', 'Feliz aniversário! Com carinho.', 95.00, 0, 12.90, 107.90),
(2, 'DEMO02', DATEADD(DAY, -4, SYSDATETIME()), 1, 2, 2, 'Visa final 4242, 2x sem juros', 'entregue', CAST(DATEADD(DAY, -3, GETDATE()) AS DATE), 'manha',
    '01304-001', 'Rua Augusta', '1500', 'Apto 42', 'Consolação', 'São Paulo', 'SP', NULL, NULL, 150.00, 0, 0.00, 150.00),
(3, 'DEMO03', DATEADD(DAY, -1, SYSDATETIME()), 1, 1, 3, 'Boleto', 'preparo', CAST(DATEADD(DAY, 1, GETDATE()) AS DATE), 'noite',
    '01304-001', 'Rua Augusta', '1500', 'Apto 42', 'Consolação', 'São Paulo', 'SP', 'Carla', 'Parabéns pela formatura!', 190.00, 0, 0.00, 190.00),
(4, 'DEMO04', SYSDATETIME(), 1, 3, 1, 'Pix', 'novo', CAST(DATEADD(DAY, 2, GETDATE()) AS DATE), 'tarde',
    '01304-001', 'Rua Augusta', '1500', 'Apto 42', 'Consolação', 'São Paulo', 'SP', NULL, NULL, 95.00, 0, 12.90, 107.90),
(5, 'DEMO05', DATEADD(DAY, -3, SYSDATETIME()), 2, 4, 2, 'Mastercard final 5100, à vista', 'entregue', CAST(DATEADD(DAY, -2, GETDATE()) AS DATE), 'manha',
    '37550-000', 'Rua Comendador José Garcia', '200', NULL, 'Centro', 'Pouso Alegre', 'MG', NULL, NULL, 95.00, 0, 12.90, 107.90);
SET IDENTITY_INSERT tb_pedidos OFF;

INSERT INTO tb_itens_pedido (id_pedido, id_var, quantidade, preco_unitario) VALUES
(1, 10, 1, 95.00),   -- Rosa Vermelho Grande
(2, 59, 1, 95.00),   -- Orquídea Branco Grande
(2, 53, 1, 55.00),   -- Orquídea Branco Pequeno
(3, 19, 2, 95.00),   -- Tulipa Amarelo Grande
(4, 72, 1, 95.00),   -- Peônia Rosa Grande
(5, 35, 1, 95.00);   -- Margarida Branco Grande

-- Avaliações (o pedido DEMO01 fica sem avaliação para testar ao vivo)
INSERT INTO tb_avaliacao (id_cli, id_pedido, nota, comentario, data_avaliacao) VALUES
(1, 2, 5, 'As orquídeas chegaram lindas e muito bem embaladas!', CAST(DATEADD(DAY, -2, GETDATE()) AS DATE)),
(2, 5, 4, 'Arranjo bonito, só atrasou uns 20 minutos.', CAST(DATEADD(DAY, -1, GETDATE()) AS DATE));
GO

-- ==================================================
-- CONFERÊNCIA (aparece na aba Resultados)
-- ==================================================
SELECT l.nome AS loja, l.localizacao, COUNT(v.id_var) AS variacoes
FROM tb_lojas l
LEFT JOIN tb_variacao v ON v.id_loja = l.id_loja
GROUP BY l.nome, l.localizacao
ORDER BY l.nome;
