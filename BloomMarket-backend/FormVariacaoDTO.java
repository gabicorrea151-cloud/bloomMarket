
package feira.tecno.domain.dto;

import java.math.BigDecimal;

public record FormVariacaoDTO(
    Integer idProd,
    String cor,
    String tamanho,
    String localizacao,
    BigDecimal preco,
    Integer estoque,
    Boolean disponivel
) {}
