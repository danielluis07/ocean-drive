type PresentationNoticeProps = {
  // One short line on why the ocean is not showing, if it failed.
  explanation: string | null;
  canReturn: boolean;
  onReturn: () => void;
};

// Heads the Accessible Editorial Presentation: why it opened, and the way back.
export default function PresentationNotice({ explanation, canReturn, onReturn }: PresentationNoticeProps) {
  if (!explanation && !canReturn) return null;
  return (
    <div
      data-slot="presentation-notice"
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 bg-background py-3 pr-[max(1.5rem,env(safe-area-inset-right))] pl-[max(1.5rem,env(safe-area-inset-left))] text-sm text-foreground">
      {explanation ? <p className="m-0">{explanation}</p> : <p className="m-0">Modo leitura</p>}
      {canReturn ? (
        <button
          type="button"
          onClick={onReturn}
          className="inline-flex min-h-11 items-center gap-2.5 rounded-full bg-card px-5 font-semibold text-card-foreground transition-colors hover:bg-secondary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
          Voltar ao oceano
        </button>
      ) : null}
    </div>
  );
}
