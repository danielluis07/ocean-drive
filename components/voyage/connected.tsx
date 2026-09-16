type ConnectedProps = {
  connected: boolean;
  onRestart: () => void;
  onReviewStops: () => void;
  onShowSources: () => void;
};

export default function Connected({
  connected,
  onRestart,
  onReviewStops,
  onShowSources,
}: ConnectedProps) {
  return (
    <section
      className="connected page-shell"
      aria-labelledby="viagem-concluida-title"
      hidden={!connected}>
      <div>
        <h2 id="viagem-concluida-title" tabIndex={-1}>
          Viagem concluída.
        </h2>
        <p>
          Você chegou a Ilha Grande. Revisite qualquer parada ou recomece a
          viagem.
        </p>
      </div>
      <div
        className="connected__actions"
        role="group"
        aria-label="Ações da viagem concluída">
        <button type="button" onClick={onReviewStops}>
          Revisitar paradas
        </button>
        <button type="button" onClick={onShowSources}>
          Consultar fontes
        </button>
        <button type="button" onClick={onRestart}>
          Recomeçar viagem
        </button>
      </div>
    </section>
  );
}
