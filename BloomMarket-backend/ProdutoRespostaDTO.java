
package feira.tecno.domain.dto;

import java.math.BigDecimal;

public record ProdutoRespostaDTO(
    Integer idVar,
    Integer idProd,
    String nome,
    String categoria,
    String cor,
    String tamanho,
    String localizacao,
    BigDecimal preco,
    Boolean disponivel,
    Integer estoque
) {}
