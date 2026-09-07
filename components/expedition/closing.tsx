import InstituteMark from "@/components/expedition/institute-mark";

export default function Closing() {
  return (
    <footer className="closing">
      <div className="closing__inner page-shell">
        <div className="identity identity--closing">
          <InstituteMark />
          <span>
            Instituto<strong>Maré Aberta</strong>
          </span>
        </div>
        <p>
          Observatório Atlântico Vivo
          <span>Uma composição retrospectiva sobre Abrolhos em 2019.</span>
        </p>
        <a href="#conteudo-principal">Voltar ao início</a>
      </div>
    </footer>
  );
}
