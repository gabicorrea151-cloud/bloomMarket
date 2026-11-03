
package feira.tecno.service;

import feira.tecno.domain.Produto;
import feira.tecno.domain.Variacao;
import feira.tecno.domain.dto.FormVariacaoDTO;
import feira.tecno.domain.dto.ProdutoRespostaDTO;
import feira.tecno.repository.ProdutoRepository;
import feira.tecno.repository.VariacaoRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@Service
public class ProdutoService {

    private final ProdutoRepository produtoRepository;
    private final VariacaoRepository variacaoRepository;

    public ProdutoService(
            ProdutoRepository produtoRepository,
            VariacaoRepository variacaoRepository) {
        this.produtoRepository = produtoRepository;
        this.variacaoRepository = variacaoRepository;
    }

    @Transactional(readOnly = true)
    public List<ProdutoRespostaDTO> listarProdutos() {
        return variacaoRepository.findAll()
            .stream()
            .map(this::paraResposta)
            .toList();
    }

    @Transactional
    public ProdutoRespostaDTO cadastrarProduto(
            FormVariacaoDTO dados) {
        validar(dados);

        Produto produto = produtoRepository
            .findById(dados.idProd())
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Tipo de flor não encontrado."
            ));

        Variacao variacao = new Variacao();
        variacao.setProduto(produto);
        preencherVariacao(variacao, dados);

        return paraResposta(variacaoRepository.save(variacao));
    }

    @Transactional
    public ProdutoRespostaDTO atualizarProduto(
            Integer id, FormVariacaoDTO dados) {
        validar(dados);

        Variacao variacao = variacaoRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Variação não encontrada."
            ));

        Produto produto = produtoRepository
            .findById(dados.idProd())
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Tipo de flor não encontrado."
            ));

        variacao.setProduto(produto);
        preencherVariacao(variacao, dados);

        return paraResposta(variacaoRepository.save(variacao));
    }

    @Transactional
    public void deletarProduto(Integer id) {
        Variacao variacao = variacaoRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Variação não encontrada."
            ));

        variacaoRepository.delete(variacao);
    }

    private void preencherVariacao(
            Variacao variacao, FormVariacaoDTO dados) {
        variacao.setCor(dados.cor().trim());
        variacao.setTamanho(dados.tamanho().trim());
        variacao.setLocalizacao(dados.localizacao().trim());
        variacao.setPreco(dados.preco());
        variacao.setEstoque(dados.estoque());
        variacao.setDisponivel(
            dados.disponivel() == null || dados.disponivel()
        );
    }

    private void validar(FormVariacaoDTO dados) {
        if (dados == null || dados.idProd() == null
                || dados.cor() == null || dados.cor().isBlank()
                || dados.tamanho() == null || dados.tamanho().isBlank()
                || dados.localizacao() == null
                || dados.localizacao().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Preencha o tipo de flor, cor, tamanho e localização."
            );
        }

        if (dados.preco() == null
                || dados.preco().compareTo(BigDecimal.ZERO) < 0
                || dados.estoque() == null
                || dados.estoque() < 0) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "O preço e o estoque devem ser válidos e não negativos."
            );
        }
    }

    private ProdutoRespostaDTO paraResposta(Variacao variacao) {
        Produto produto = variacao.getProduto();

        return new ProdutoRespostaDTO(
            variacao.getIdVar(),
            produto.getIdProd(),
            produto.getNome(),
            produto.getCategoria(),
            variacao.getCor(),
            variacao.getTamanho(),
            variacao.getLocalizacao(),
            variacao.getPreco(),
            variacao.getDisponivel(),
            variacao.getEstoque()
        );
    }
}
