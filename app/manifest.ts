import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CTimer | Una herramienta de C3",
    short_name: "CTimer",
    description:
      "Cronómetros para competencias, eventos y equipos. Una herramienta de Competitive Coding Club.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F9FC",
    theme_color: "#0F203E",
    lang: "es-SV",
    icons: [{ src: "/brand/logo-c3-claro-con-color.png", sizes: "1600x1600", type: "image/png" }],
  };
}
