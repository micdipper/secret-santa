# RevealCard

Il biglietto che esce dalla busta alla rivelazione, con il nome della persona pescata.

## Quando usarlo
- Nella rivelazione: come fallback 2D quando il 3D o il movimento non sono disponibili, e come texture del biglietto three.js.
- Come card "il tuo abbinamento" nella pagina del gruppo, dopo l'estrazione.

## Cosa fornisci
`.ss-reveal` con `.ss-reveal__eyebrow` (una frase), `.ss-reveal__name` (il nome esattamente come l'ha scritto l'organizzatore), `.ss-reveal__stars` (tre `ss-star`, decorative) e `.ss-reveal__meta`. Sempre su fondo scuro (`fir` o `notte`), come se fosse appena uscito dalla busta.

## No
- Mai mostrare l'abbinamento di qualcun altro.
- L'effetto olografico sta nel livello 3D, non qui. Rispetta `prefers-reduced-motion`.
