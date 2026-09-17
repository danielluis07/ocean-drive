import type { StopAccount as StopAccountRecord } from "@/content/editorial";
import Image from "next/image";

type StopAccountProps = {
  // Prefixes the section heading ids.
  id: string;
  account: StopAccountRecord;
};

// Everything after a Stop's title, in one continuous scroll: intro, three
// highlights, best season, and the illustrative image slots. Both the Stop
// Account Sheet and the Accessible Editorial Presentation read it.
export default function StopAccount({ id, account }: StopAccountProps) {
  return (
    <div className="flex flex-col gap-8">
      <p className="text-lg leading-relaxed">{account.introduction}</p>
      <section aria-labelledby={`${id}-highlights`}>
        <h3 id={`${id}-highlights`} className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
          Destaques
        </h3>
        <ol className="mt-4 flex flex-col divide-y divide-border border-y border-border">
          {account.highlights.map((highlight, index) => (
            <li key={highlight.title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 py-5">
              <span aria-hidden="true" className="font-mono text-xs leading-7 text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h4 className="text-lg leading-7 font-semibold">{highlight.title}</h4>
                <p className="mt-1 leading-relaxed text-muted-foreground">{highlight.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby={`${id}-season`}>
        <h3 id={`${id}-season`} className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
          Melhor época
        </h3>
        <p className="mt-3 leading-relaxed">{account.bestSeason}</p>
      </section>
      {account.images.map((image) => (
        <figure key={image.caption} className="m-0">
          <Image
            src={image.src}
            alt={image.alt}
            width={960}
            height={720}
            unoptimized
            className="aspect-[4/3] w-full rounded-lg object-cover"
          />
          <figcaption className="mt-2 text-sm text-muted-foreground">{image.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}
