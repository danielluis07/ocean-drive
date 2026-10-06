import Image from "next/image";
import TravessiaLogo from "@/components/voyage/travessia-logo";
import { earthApproach } from "@/content/earth-approach";
import { useApproachLayers } from "@/lib/use-approach-layers";
import styles from "@/components/ocean/ocean-loading.module.css";

// The Approach: server-rendered so the Earth and the premise line cover the
// first frame while the ocean prepares. The descent toward the northeastern
// Brazilian coast only runs when a usable 3D scene is ready behind it.
export default function OceanLoading({
  loading,
  reveal,
}: {
  loading: boolean;
  reveal: boolean;
}) {
  const overlay = useApproachLayers(reveal);
  return (
    <>
      <div
        ref={overlay}
        data-slot="ocean-loading"
        data-loading={loading}
        data-reveal={reveal}
        data-descent="fallback"
        aria-hidden="true"
        className={`${styles.overlay} pointer-events-none fixed inset-0 z-50 overflow-hidden bg-background data-[loading=true]:pointer-events-auto`}>
        {earthApproach.levels.map(level => (
          <div key={level.id} data-level={level.id} className={`${styles.layer} absolute inset-0 flex items-center justify-center`}>
            <Image
              src={level.url}
              width={level.size}
              height={level.size}
              alt=""
              unoptimized
              preload={level.essential}
              loading={level.essential ? undefined : "eager"}
              fetchPriority={level.essential ? undefined : "low"}
              data-optional={level.essential ? undefined : "true"}
              className={`${styles.image} block h-auto max-w-none select-none`}
            />
          </div>
        ))}
        <div className={`${styles.chrome} absolute inset-x-0 top-0 flex justify-start px-[max(1.5rem,env(safe-area-inset-left))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-10 sm:pt-9`}>
          <TravessiaLogo className="text-[clamp(1rem,1.5vw,1.25rem)]" />
        </div>
        <p className={`${styles.chrome} absolute inset-x-0 bottom-0 m-0 px-[max(1.5rem,env(safe-area-inset-left))] pb-[max(2rem,env(safe-area-inset-bottom))] text-center text-[clamp(1rem,0.6vw+0.85rem,1.375rem)] font-medium tracking-wide text-balance text-foreground sm:pb-10`}>
          Uma viagem pela costa brasileira
        </p>
      </div>
      <noscript>
        <style>{`[data-slot="ocean-loading"] { display: none; }`}</style>
      </noscript>
    </>
  );
}
