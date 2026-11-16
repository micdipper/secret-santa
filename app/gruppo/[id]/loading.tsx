import { StellaNordica } from "@/components/ornamenti";

// Compare subito al tocco mentre la pagina del gruppo (o una sua pagina interna) arriva dal server:
// senza, il tasto sembrava non fare niente finché la pagina non era pronta.
export default function Caricamento() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-5 pb-16" role="status" aria-live="polite">
      <StellaNordica className="size-12 animate-spin text-senape [animation-duration:2.4s] motion-reduce:animate-none" />
      <p className="text-crema/80">Un attimo…</p>
    </main>
  );
}
