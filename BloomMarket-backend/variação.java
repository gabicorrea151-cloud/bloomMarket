
package feira.tecno.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "tb_variacao")
@Data
@NoArgsConstructor
public class Variacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_var")
    private Integer idVar;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_prod", nullable = false)
    private Produto produto;

    @Column(name = "cor", length = 100)
    private String cor;

    @Column(name = "tamanho", length = 30)
    private String tamanho;

    @Column(name = "localizacao", length = 100)
    private String localizacao;

    @Column(name = "preco", precision = 10, scale = 2)
    private BigDecimal preco;

    @Column(name = "disponivel", nullable = false)
    private Boolean disponivel = true;

    @Column(name = "estoque")
    private Integer estoque;
}
