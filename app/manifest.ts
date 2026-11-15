import type { MetadataRoute } from "next";

// PWA leggera: permette di aggiungere il sito alla schermata Home.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Secret Santa",
    short_name: "Secret Santa",
    description: "Il Babbo Natale segreto tra amici, con bacheca e lista dei desideri.",
    start_url: "/",
    display: "standalone",
    background_color: "#1e3826",
    theme_color: "#2c4a32",
    lang: "it",
    icons: [
      { src: "/icona-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/icona-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
