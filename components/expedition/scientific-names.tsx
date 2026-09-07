import { splitScientificNames } from "@/lib/expedition-view";

export default function ScientificNames({ text }: { text: string }) {
  return splitScientificNames(text).map((part, index) =>
    part.scientific ? (
      <i key={`${part.text}-${index}`}>{part.text}</i>
    ) : (
      part.text
    ),
  );
}
