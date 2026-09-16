import InstituteMark from "@/components/voyage/institute-mark";

export default function Opening() {
  return (
    <header className="ocean-opening">
      <div className="ocean-opening__wash" aria-hidden="true">
        <span className="current current--one" />
        <span className="current current--two" />
        <span className="current current--three" />
      </div>
      <div className="topline page-shell">
        <a
          className="identity"
          href="#conteudo-principal"
          aria-label="Travessia, início">
          <InstituteMark />
          <span>
            Travessia<strong>Viagens costeiras</strong>
          </span>
        </a>
        <p>
          Viagens<strong>pela costa brasileira</strong>
        </p>
      </div>
      <div className="opening-copy page-shell">
        <h1 id="voyage-editorial-heading" tabIndex={-1}>
          O Brasil <em>visto do mar.</em>
        </h1>
        <div className="opening-note">
          <p>
            <strong>Uma viagem · quatro ilhas</strong>De Fernando de Noronha a
            Ilha Grande, a bordo do Maré Mansa.
          </p>
          <a href="#rota">Ver a rota</a>
        </div>
      </div>
      <div className="horizon-note page-shell">
        <span aria-hidden="true" />
        <p>Pesquisa histórica · expedição fictícia</p>
      </div>
    </header>
  );
}
