import SourceCard from "@/components/expedition/source-card";
import { sourceRecords, type SourceId } from "@/content/editorial";

export default function AllSources({ visible }: { visible: boolean }) {
  return (
    <section
      className="all-sources page-shell"
      id="fontes-da-expedicao"
      aria-labelledby="fontes-da-expedicao-title"
      hidden={!visible}>
      <header>
        <h2 id="fontes-da-expedicao-title" tabIndex={-1}>
          Fontes da expedição
        </h2>
        <p>Oito registros sustentam e delimitam os sinais percorridos.</p>
      </header>
      <div className="source-list">
        {(Object.keys(sourceRecords) as SourceId[]).map((sourceId) => (
          <SourceCard key={sourceId} sourceId={sourceId} />
        ))}
      </div>
    </section>
  );
}
