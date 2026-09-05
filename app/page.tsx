import { Suspense } from "react";
import ExpeditionPrototype from "@/app/_prototype/expedition-prototype";

export default function Home() {
  return (
    <Suspense fallback={<p>Preparando a expedição…</p>}>
      <ExpeditionPrototype />
    </Suspense>
  );
}
