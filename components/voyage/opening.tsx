import ShipCredit from "@/components/voyage/ship-credit";
import TravessiaLogo from "@/components/voyage/travessia-logo";
import { editorialAction, editorialHeading, editorialLabel, editorialShell } from "@/components/voyage/editorial-styles";
import { brand, stops } from "@/content/editorial";
import { cn } from "@/lib/utils";

// Stop 00 heads the page: the brand, the Core Promise, and the one
// fictional-project disclosure this presentation carries.
export default function Opening() {
  return (
    <header data-slot="editorial-opening" className={cn(editorialShell, "pt-10 pb-16 sm:pt-14 sm:pb-24")}>
      <TravessiaLogo className="text-sm text-card-foreground" />
      <p className={cn(editorialLabel, "mt-16 sm:mt-24")}>Parada 00 · {stops[0].context}</p>
      <h1
        id="voyage-editorial-heading"
        tabIndex={-1}
        className={cn(editorialHeading, "mt-4 max-w-[14ch] text-5xl leading-[1.02] font-semibold tracking-tight text-balance sm:text-7xl")}>
        {brand.tagline}
      </h1>
      <p className="mt-6 max-w-[38rem] text-lg leading-relaxed text-muted-foreground sm:text-xl">
        Quatro ilhas, de Fernando de Noronha a Ilha Grande, a bordo do {brand.ship}.
      </p>
      <a href="#rota" className={cn(editorialAction, "mt-8 border-card-foreground")}>
        <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
        Ver a rota
      </a>
      <div
        data-slot="disclosure"
        className="mt-14 flex max-w-[40rem] flex-col gap-3 border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
        <p className="font-semibold text-card-foreground">Comissão fictícia</p>
        <p>{brand.disclosure}</p>
        <p>{brand.dataCredit}</p>
        <p>
          <ShipCredit />
        </p>
      </div>
    </header>
  );
}
