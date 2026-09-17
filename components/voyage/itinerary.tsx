import { itinerary } from "@/content/editorial";

// The complete day-by-day route, from embarkation to disembarkation.
export default function Itinerary() {
  return (
    <ol className="flex flex-col divide-y divide-border border-y border-border">
      {itinerary.map((day) => (
        <li key={day.days + day.place} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 py-4 max-[22rem]:grid-cols-1">
          <span className="font-mono text-xs leading-6 tracking-wider text-muted-foreground uppercase">{day.days}</span>
          <div>
            <p className="font-semibold leading-6">{day.place}</p>
            <p className="mt-0.5 leading-relaxed text-muted-foreground">{day.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
