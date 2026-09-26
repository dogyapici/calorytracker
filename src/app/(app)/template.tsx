// Jeder Tab-Wechsel blendet die neue Seite weich ein (Templates werden pro Seite neu aufgebaut).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
