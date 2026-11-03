
package feira.tecno.repository;

import feira.tecno.domain.Produto;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProdutoRepository
        extends JpaRepository<Produto, Integer> {
}
