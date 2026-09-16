import { wrapperDisclosure } from "@/content/editorial";
import Image from "next/image";

export default function EditorialIntro() {
  return (
    <section
      className="editorial-intro page-shell"
      aria-labelledby="sobre-a-expedicao">
      <div>
        <h2 id="sobre-a-expedicao">
          Uma rota composta para aproximar evidências que aconteceram em
          tempos, lugares e escalas diferentes.
        </h2>
        <Image src="/identity/editorial-vignette.v1.svg" alt="" width={420} height={180} unoptimized style={{ maxWidth: "100%", height: "auto" }} />
      </div>
      <div className="editorial-intro__copy">
        <p>
          O Instituto Maré Aberta e o Observatório Atlântico Vivo dão forma a
          uma comissão ficcional. A pesquisa é real, e cada afirmação conduz
          aos registros que sustentam — e limitam — sua leitura.
        </p>
        <details className="disclosure" open>
          <summary>Pesquisa histórica · expedição fictícia</summary>
          <p>{wrapperDisclosure}</p>
        </details>
      </div>
    </section>
  );
}
