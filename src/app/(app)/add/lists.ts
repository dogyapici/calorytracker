/** The lists the add page can show when nothing is searched. */
export const LISTS = [
  { key: "recent", label: "Zuletzt gegessen" },
  { key: "frequent", label: "Häufig gegessen" },
  { key: "favorites", label: "Favoriten" },
] as const;

export type ListKey = (typeof LISTS)[number]["key"];
