
package feira.tecno.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "tb_produtos")
@Data
@NoArgsConstructor
public class Produto {

    @Id
    @Column(name = "id_prod")
    private Integer idProd;

    @Column(name = "categoria", length = 100)
    private String categoria;

    @Column(name = "nome", length = 100)
    private String nome;
}
