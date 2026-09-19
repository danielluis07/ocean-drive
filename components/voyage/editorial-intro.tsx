import { brand } from "@/content/editorial";
import Image from "next/image";

export default function EditorialIntro() {
  return (
    <section
      className="editorial-intro page-shell"
      aria-labelledby="sobre-a-viagem">
      <div>
        <h2 id="sobre-a-viagem">
          Uma rota composta para reunir lugares reais da costa brasileira numa
          única viagem.
        </h2>
        <Image
          src="/identity/editorial-vignette.v1.svg"
          alt=""
          width={420}
          height={180}
          unoptimized
          style={{ maxWidth: "100%", height: "auto" }}
        />
      </div>
      <div className="editorial-intro__copy">
        <p>
          {brand.name} dá forma a uma comissão fictícia. As ilhas, a vida
          marinha e as temporadas descritas são reais; o navio, a tripulação e
          o roteiro a bordo são imaginados.
        </p>
        <details className="disclosure" open>
          <summary>Comissão fictícia</summary>
          <p>{brand.disclosure}</p>
          <p>{brand.dataCredit}</p>
        </details>
      </div>
    </section>
  );
}
