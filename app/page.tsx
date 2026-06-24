import dynamic from 'next/dynamic';

// The game is client-only (Three.js + the rAF combat loop). Load it without SSR
// so nothing 3D runs on the server.
const FpsGame = dynamic(() => import('@/components/arcade/FpsGame').then((m) => m.FpsGame), {
  ssr: false,
});

export default function Page() {
  return (
    <main
      id="content"
      className="flex min-h-[100svh] w-full flex-col items-center justify-center bg-black px-3 py-6 sm:px-6"
    >
      <FpsGame />
    </main>
  );
}
