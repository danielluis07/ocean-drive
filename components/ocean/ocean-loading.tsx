import TravessiaLogo from "@/components/voyage/travessia-logo";

// Loading is only a brief logo fade over the ocean ground. It is server-rendered
// so the page never flashes other content first; without JavaScript it stays hidden.
// It stops catching the pointer as soon as it starts fading out.
export default function OceanLoading({ loading }: { loading: boolean }) {
  return (
    <>
      <div
        data-slot="ocean-loading"
        data-loading={loading}
        aria-hidden="true"
        className="pointer-events-none invisible fixed inset-0 z-50 flex items-center justify-center bg-background opacity-0 transition-[opacity,visibility] duration-700 data-[loading=true]:pointer-events-auto data-[loading=true]:visible data-[loading=true]:opacity-100">
        <TravessiaLogo className="animate-in text-2xl duration-1000 fade-in motion-safe:animate-pulse" />
      </div>
      <noscript>
        <style>{`[data-slot="ocean-loading"] { display: none; }`}</style>
      </noscript>
    </>
  );
}
