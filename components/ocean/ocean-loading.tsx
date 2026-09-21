import Image from "next/image";
import TravessiaLogo from "@/components/voyage/travessia-logo";
import styles from "./ocean-loading.module.css";

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
  return (
    <>
      <div
        data-slot="ocean-loading"
        data-loading={loading}
        data-reveal={reveal}
        aria-hidden="true"
        className={`${styles.overlay} pointer-events-none fixed inset-0 z-50 overflow-hidden bg-background data-[loading=true]:pointer-events-auto`}>
        <div className={`${styles.planet} absolute inset-0 flex items-center justify-center`}>
          <Image
            src="/images/earth-intro.v1.webp"
            width={1254}
            height={1254}
            alt=""
            preload
            sizes="(max-width: 640px) 94vw, min(76svh, 56rem)"
            className={`${styles.earth} block h-auto w-[min(94vw,76svh,56rem)] max-w-none select-none`}
          />
        </div>
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
