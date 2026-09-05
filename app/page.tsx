import { Suspense } from "react";
import OceanVisualPrototype from "@/app/_prototype/ocean-visual-prototype";

// Throwaway: three ocean-world treatments on /, switched with ?variant=A|B|C.
export default function Home() {
  return (
    <Suspense fallback={<p>Preparando os estudos do oceano…</p>}>
      <OceanVisualPrototype />
    </Suspense>
  );
}
