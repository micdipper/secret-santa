# Polaroid

Cornice polaroid per le foto caricate nella moodboard o incollate da un link.

## Quando usarla
- Elementi della moodboard di tipo "foto" e "immagine da link".
- Nella pagina finale "Chi era il Babbo Natale di chi", una polaroid per persona, in griglia sfalsata (ref. 04).

## Cosa fornisci
`.ss-polaroid` (un `<figure>`) con `<img class="ss-polaroid__img">` (quadrata, `object-fit: cover`) e una `<figcaption class="ss-polaroid__caption">` facoltativa nel formato dell'archivio di ref. 04: descrizione, a capo, "Nome · anno". La cornice è `photo-frame` in ogni tema. La rotazione segue il valore salvato, come per PostIt.
