import TravessiaLogo from "@/components/voyage/travessia-logo";
import { editorialFocus, editorialShell } from "@/components/voyage/editorial-styles";
import { brand } from "@/content/editorial";
import { cn } from "@/lib/utils";

export default function Closing() {
  return (
    <footer className="border-t border-border">
      <div className={cn(editorialShell, "flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-10 text-sm")}>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <TravessiaLogo className="text-card-foreground" />
          <span className="text-muted-foreground">{brand.tagline}</span>
        </p>
        <a href="#conteudo-principal" className={cn("rounded-sm py-2 font-semibold underline underline-offset-4", editorialFocus)}>
          Voltar ao início
        </a>
      </div>
    </footer>
  );
}
