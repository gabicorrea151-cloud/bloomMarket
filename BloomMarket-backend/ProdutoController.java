
package feira.tecno.controller;

import feira.tecno.domain.dto.FormVariacaoDTO;
import feira.tecno.domain.dto.ProdutoRespostaDTO;
import feira.tecno.service.ProdutoService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/produto")
public class ProdutoController {

    private final ProdutoService service;

    public ProdutoController(ProdutoService service) {
        this.service = service;
    }

    @GetMapping("/list")
    public List<ProdutoRespostaDTO> listarProdutos() {
        return service.listarProdutos();
    }

    @PostMapping("/create")
    @ResponseStatus(HttpStatus.CREATED)
    public ProdutoRespostaDTO cadastrarProduto(
            @RequestBody FormVariacaoDTO dados) {
        return service.cadastrarProduto(dados);
    }

    @PutMapping("/update/{id}")
    public ProdutoRespostaDTO atualizarProduto(
            @PathVariable Integer id,
            @RequestBody FormVariacaoDTO dados) {
        return service.atualizarProduto(id, dados);
    }

    @DeleteMapping("/delete/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletarProduto(@PathVariable Integer id) {
        service.deletarProduto(id);
    }
}
