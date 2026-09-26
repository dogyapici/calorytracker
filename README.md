# Kalorientracker

Eine Web-App zum Erfassen von Kalorien und Nährwerten, gedacht für eine kleine Gruppe (Registrierung nur mit Einladungscode). Läuft im Browser und lässt sich auf dem Handy wie eine App zum Startbildschirm hinzufügen.

## Funktionen

- **Tagebuch** pro Tag mit Frühstück, Mittag, Abend und Snacks, Kalorienring und Makro-Balken, Tage vor- und zurückblättern, „Wie gestern“ kopiert eine Mahlzeit vom Vortag.
- **Lebensmittelsuche** in [Open Food Facts](https://world.openfoodfacts.org) (freie Datenbank, ODbL) plus bereits verwendete Lebensmittel.
- **Barcode-Scan** mit der Handykamera (native `BarcodeDetector`, auf iPhone per ZXing-WebAssembly) oder Barcode eintippen.
- **Eigene Lebensmittel** mit Portionsgröße, **Favoriten** und **zuletzt gegessen**.
- **Rezepte** aus mehreren Zutaten (Suche oder Barcode), mit Portionen und optionalem Gewicht nach dem Kochen.
- **Gespeicherte Mahlzeiten**: eine Mahlzeit aus dem Tagebuch speichern und später mit einem Tipp komplett eintragen.
- **Weitere Nährwerte**: Ballaststoffe, Zucker, gesättigte Fettsäuren, Salz sowie Vitamine und Mineralstoffe (soweit Open Food Facts sie kennt) mit DGE-Referenzwerten.
- **Streak**: Tage in Folge mit Einträgen und längste Serie.
- **Ziele**: Vorschlag nach Mifflin-St Jeor aus Geschlecht, Alter, Größe, Gewicht, Aktivität und Ziel. Makroziele wahlweise in Prozent oder Gramm; sie werden immer gegen das Kalorienziel geprüft und lassen sich sonst nicht speichern.
- **Gewicht** mit Verlauf, optionalen Körpermaßen (Taille, Hüfte, Brust, Oberarm, Oberschenkel, Körperfett) und optionalem Fortschrittsfoto. Fotos werden im Browser verkleinert, ohne Standortdaten in der Datenbank gespeichert und sind nur für die eigene Person abrufbar.
- **Statistik** über 7, 30 oder 90 Tage.
- Jede Person sieht nur ihre eigenen Einträge und eigenen Lebensmittel.

## Technik

Next.js 16 (App Router, Server Actions), TypeScript, Tailwind CSS 4, Drizzle ORM auf PostgreSQL. Login mit E-Mail und Passwort (scrypt), Sitzungen als HttpOnly-Cookie, in der Datenbank nur als Hash gespeichert.

## Lokal starten

```bash
cp .env.example .env.local   # DATABASE_URL und INVITE_CODE eintragen
npm install
npm run db:migrate           # Tabellen anlegen
npm run dev                  # http://localhost:3000
```

Tests und Prüfungen: `npm test`, `npm run lint`, `npm run typecheck`.

Nach einer Änderung an `src/db/schema.ts`: `npm run db:generate` erzeugt eine neue Migration in `drizzle/`.

## Kostenlos hosten (Vercel + Supabase)

1. Bei [Supabase](https://supabase.com) ein Projekt anlegen. Unter *Connect* den **Transaction pooler**-Connection-String kopieren (Port 6543).
2. Bei [Vercel](https://vercel.com) das GitHub-Repository importieren und diese Umgebungsvariablen setzen: `DATABASE_URL`, `INVITE_CODE`, optional `OFF_CONTACT`.
3. Deployen. Das Build-Skript `vercel-build` spielt die Datenbank-Migrationen automatisch ein.
4. Die URL und den Einladungscode an die Mitnutzer schicken.

Jede andere Postgres-Datenbank (z. B. Neon) funktioniert genauso.
