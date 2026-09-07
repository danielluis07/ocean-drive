import InstituteMark from "@/components/expedition/institute-mark";

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
          aria-label="Instituto Maré Aberta, início">
          <InstituteMark />
          <span>
            Instituto<strong>Maré Aberta</strong>
          </span>
        </a>
        <p>
          Observatório<strong>Atlântico Vivo</strong>
        </p>
      </div>
      <div className="opening-copy page-shell">
        <h1>
          Conduza a expedição e <em>conecte os sinais</em> de um oceano em
          mudança.
        </h1>
        <div className="opening-note">
          <p>
            <strong>Banco dos Abrolhos · 2019</strong>Do calor acumulado às
            respostas dos corais, percorra doze sinais construídos a partir de
            observações históricas.
          </p>
          <a href="#rota">Iniciar leitura</a>
        </div>
      </div>
      <div className="horizon-note page-shell">
        <span aria-hidden="true" />
        <p>Pesquisa histórica · expedição fictícia</p>
      </div>
    </header>
  );
}
