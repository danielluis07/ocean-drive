import TravessiaMark from "@/components/voyage/travessia-mark";
import { brand } from "@/content/editorial";

export default function Closing() {
  return (
    <footer className="closing">
      <div className="closing__inner page-shell">
        <div className="identity identity--closing">
          <TravessiaMark />
          <span>
            Travessia<strong>Viagens costeiras</strong>
          </span>
        </div>
        <p>
          {brand.name}
          <span>{brand.tagline}</span>
        </p>
        <a href="#conteudo-principal">Voltar ao início</a>
      </div>
    </footer>
  );
}
