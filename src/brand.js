/** MyPetDex brand tokens — keep in sync with public/index.html splash */
export const BRAND = {
  blue: "#4486F4",
  blueDark: "#2F6AD8",
  blueGlow: "rgba(68, 134, 244, 0.45)",
  bg: "#F0F5FF",
  bgDeep: "#E3EDFF",
  text: "#1E293B",
  muted: "#64748B",
};

export function dismissAppSplash() {
  const splash = document.getElementById("app-splash");
  if (!splash) return;
  splash.classList.add("mpd-splash-hide");
  window.setTimeout(() => splash.remove(), 520);
}
