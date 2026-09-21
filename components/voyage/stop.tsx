import { Check } from "lucide-react";
import StopAccount from "@/components/voyage/stop-account";
import { editorialAction, editorialHeading, editorialLabel, editorialShell } from "@/components/voyage/editorial-styles";
import { cn } from "@/lib/utils";
import { focusAndScrollToElement, stopNumber, type AccountStop } from "@/lib/voyage-view";

type StopProps = {
  enhanced: boolean;
  stop: AccountStop;
  visited: boolean;
};

// One Stop and its full Stop Account, in the order the Sheet reads it.
export default function Stop({ enhanced, stop, visited }: StopProps) {
  return (
    <article
      id={stop.id}
      data-slot="editorial-stop"
      aria-labelledby={`${stop.id}-title`}
      className="border-t border-border">
      <div
        className={cn(
          editorialShell,
          "grid gap-x-16 gap-y-10 py-16 sm:py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]",
        )}>
        <header>
          <p className={editorialLabel}>
            Parada {stopNumber(stop)} · {stop.account.day}
          </p>
          <h2
            id={`${stop.id}-title`}
            tabIndex={-1}
            className={cn(editorialHeading, "mt-4 text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl")}>
            {stop.name}
          </h2>
          <p className="mt-2 text-muted-foreground">{stop.context}</p>
          {enhanced && visited ? (
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-semibold">
              <Check aria-hidden="true" className="size-4" strokeWidth={3} />
              Visitada
            </p>
          ) : null}
          <p className="mt-6 max-w-[30rem] text-xl leading-snug">{stop.introduction}</p>
        </header>
        <div className="max-w-[42rem]">
          <StopAccount id={stop.id} account={stop.account} />
          {enhanced ? (
            <footer className="mt-10 border-t border-border pt-6">
              <button type="button" onClick={() => focusAndScrollToElement("route-title")} className={editorialAction}>
                Voltar à rota
              </button>
            </footer>
          ) : null}
        </div>
      </div>
    </article>
  );
}
