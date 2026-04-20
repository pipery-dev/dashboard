export default function manifest() {
  return {
    name: "Pipery Dashboard",
    short_name: "Pipery",
    description: "A local-first PWA for browsing GitHub Action artifacts and exploring Pipery JSONL output.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4efe5",
    theme_color: "#f4efe5",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "any"
      }
    ]
  };
}
