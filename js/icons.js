const paths = {
  cross: "M12 3v18M3 12h18",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  user: "M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  trophy:
    "M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v7m-5 1h10",
  bag: "M5 7h14l2 14H3L5 7Zm3 0V5a4 4 0 0 1 8 0v2",
  chart: "M4 20V10m8 10V4m8 16v-7",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2-6h4l1 3 3 2 3-.4 2 3-2 2v3l2 2-2 3-3-.4-3 2-1 3h-4l-1-3-3-2-3 .4-2-3 2-2v-3l-2-2 2-3 3 .4 3-2 1-3Z",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  back: "M19 12H5m6-6-6 6 6 6",
  chevron: "m9 5 7 7-7 7",
  clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  coin: "M9 8a5 5 0 1 0 0 8m13-4a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  bolt: "m13 2-9 12h7l-1 8 10-12h-7l1-8Z",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
  pulse: "M2 12h5l3-8 4 16 3-8h5",
  volume: "M11 5 5 9H2v6h3l6 4V5Zm5 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14",
  expand: "M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5",
  close: "m6 6 12 12M6 18 18 6",
  check: "m5 12 4 4L19 6",
  lock: "M5 10h14v11H5V10Zm3 0V6a4 4 0 0 1 8 0v4",
  spark: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z",
  menu: "M4 6h16M4 12h16M4 18h16",
  info: "M12 11v6m0-10v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  play: "m9 5 11 7-11 7V5Z",
  rotate: "M20 8a9 9 0 1 0 1 7m-1-13v6h-6",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  moon: "M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z",
};
export const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.cross}"/></svg>`;
