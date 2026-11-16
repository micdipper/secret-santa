// Schermate "scheletro": compaiono subito al tocco mentre la pagina vera arriva dal server,
// così il tasto risponde all'istante e l'attesa si vede (forme della pagina che pulsano piano).

function Blocco({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`block rounded-full bg-abete/12 ${className}`} />;
}

function Riquadro({ righe = 3, alto = false }: { righe?: number; alto?: boolean }) {
  return (
    <div className={`feltro p-6 ${alto ? "min-h-56" : ""}`}>
      <div className="relative flex flex-col gap-3">
        <Blocco className="h-6 w-2/3" />
        {Array.from({ length: righe }, (_, i) => (
          <Blocco key={i} className={`h-4 ${i === righe - 1 ? "w-1/2" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}

function Contenitore({ children }: { children: React.ReactNode }) {
  return (
    <main role="status" aria-label="Caricamento" className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16 motion-safe:animate-pulse">
      {children}
      <span className="sr-only">Un attimo…</span>
    </main>
  );
}

// Pagina interna: tasto indietro, titolo, due riquadri.
export function ScheletroPagina({ riquadri = 2 }: { riquadri?: number }) {
  return (
    <Contenitore>
      <div className="flex flex-col gap-4 pt-6">
        <span aria-hidden className="block size-14 rounded-full bg-crema/20" />
        <div className="flex flex-col gap-2">
          <span aria-hidden className="block h-4 w-24 rounded-full bg-crema/15" />
          <span aria-hidden className="block h-8 w-48 rounded-full bg-crema/20" />
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-5">
        {Array.from({ length: riquadri }, (_, i) => (
          <Riquadro key={i} alto={i === 0} righe={i === 0 ? 4 : 2} />
        ))}
      </div>
    </Contenitore>
  );
}

// Pagina del gruppo: nome, fulcro, guardaroba, bacheca, santa chat e giochi affiancati.
export function ScheletroGruppo() {
  return (
    <Contenitore>
      <div className="flex flex-col gap-2 pt-10">
        <span aria-hidden className="block h-9 w-56 rounded-full bg-crema/20" />
        <span aria-hidden className="block h-4 w-40 rounded-full bg-crema/15" />
      </div>
      <div className="mt-6 flex flex-col gap-5">
        <Riquadro alto righe={3} />
        <Riquadro righe={2} />
        <div className="grid grid-cols-2 gap-4">
          <div className="feltro h-36" />
          <div className="feltro h-36" />
        </div>
      </div>
    </Contenitore>
  );
}

// Scene a tutto schermo (busta, partita): solo lo sfondo e una scritta.
export function ScheletroScena() {
  return (
    <main role="status" className="flex min-h-dvh flex-1 items-center justify-center">
      <p className="font-titolo text-lg text-crema/80 motion-safe:animate-pulse">Un attimo…</p>
    </main>
  );
}
