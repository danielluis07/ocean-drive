import { shipSource } from "@/content/ship-source";

export default function ShipCredit() {
  return (
    <>
      Navio 3D adaptado de{" "}
      <a className="underline underline-offset-4" href={shipSource.url}>{shipSource.title}</a>,
      de {shipSource.creator}, sob{" "}
      <a className="underline underline-offset-4" href={shipSource.licenseUrl}>CC BY 3.0</a>.
      Proporções, geometria e textura adaptadas para o Maré Mansa.
    </>
  );
}
