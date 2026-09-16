import InstituteMark from "@/components/voyage/institute-mark";

export default function Closing() {
  return (
    <footer className="closing">
      <div className="closing__inner page-shell">
        <div className="identity identity--closing">
          <InstituteMark />
          <span>
            Travessia<strong>Viagens costeiras</strong>
          </span>
        </div>
        <p>
          Travessia
          <span>Uma viagem pela costa brasileira.</span>
        </p>
        <a href="#conteudo-principal">Voltar ao início</a>
      </div>
    </footer>
  );
}
