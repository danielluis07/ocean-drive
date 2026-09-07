type ConnectedProps = {
  connected: boolean;
  onRestart: () => void;
  onReviewStations: () => void;
  onShowSources: () => void;
};

export default function Connected({
  connected,
  onRestart,
  onReviewStations,
  onShowSources,
}: ConnectedProps) {
  return (
    <section
      className="connected page-shell"
      aria-labelledby="expedicao-conectada-title"
      hidden={!connected}>
      <div>
        <h2 id="expedicao-conectada-title" tabIndex={-1}>
          Expedição conectada.
        </h2>
        <p>
          Você aproximou doze sinais sem apagar as diferenças entre tempos,
          lugares, organismos e métodos.
        </p>
      </div>
      <div
        className="connected__actions"
        aria-label="Ações da expedição conectada">
        <button type="button" onClick={onReviewStations}>
          Revisitar estações
        </button>
        <button type="button" onClick={onShowSources}>
          Consultar fontes
        </button>
        <button type="button" onClick={onRestart}>
          Recomeçar expedição
        </button>
      </div>
    </section>
  );
}
