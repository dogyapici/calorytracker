# Design-System – Calorie Tracker

Dieses Dokument ist die verbindliche Quelle für alle Designentscheidungen.
Alle Farben, Fonts, Abstände und Radien werden als Design-Tokens umgesetzt.
Komponenten verwenden ausschließlich Tokens, nie hardcodierte Werte.

---

## 1. Themes

Es gibt zwei Themes, jeweils mit Light- und Dark-Mode. Standard ist
`warm-minimal` (Entscheidung vom 26.09.2026). Beide nutzen **dieselben Token-Namen**, damit Komponenten
themeunabhängig bleiben.

### 1.1 Theme `monochrome-luxe` (Alternative)

Schwarz-Weiß-Basis mit edlen dunkelgrünen Akzenten. Reduziert, hochwertig,
viel Weißraum. Grün sparsam (ca. 10 % der Fläche): nur Kalorien-Fortschritt,
primäre Aktionen, aktive Zustände. Kein reines Weiß, kein reines Schwarz.

| Token                | Light     | Dark      | Verwendung                          |
|----------------------|-----------|-----------|-------------------------------------|
| bg                   | #FAFAF9   | #0E0F0E   | App-Hintergrund                     |
| surface              | #FFFFFF   | #171817   | Karten, Sheets                      |
| surface-muted        | #F1F1EF   | #222422   | Inputs, Chips, Ring-Track           |
| border               | #E6E6E3   | #2C2E2C   | Trennlinien, Kartenränder           |
| text-primary         | #0E0F0E   | #F4F4F2   | Überschriften, Zahlen               |
| text-secondary       | #5F615E   | #A3A5A1   | Labels                              |
| text-tertiary        | #9C9E9A   | #6E706C   | Platzhalter, inaktive Icons         |
| primary              | #1F4D3A   | #7FB89A   | Ring, primäre Buttons, aktive Tabs  |
| primary-hover        | #173B2C   | #93C6AB   |                                     |
| primary-soft         | #E6EEEA   | #1A2B23   | Badge-/Pill-Hintergründe            |
| on-primary           | #FAFAF9   | #0E0F0E   | Text auf primary                    |
| inverse-surface      | #0E0F0E   | #F4F4F2   | Hero-Karte (Tagesübersicht)         |
| inverse-text         | #FAFAF9   | #0E0F0E   | Text auf Hero-Karte                 |
| accent-calories      | #1F4D3A   | #7FB89A   | Kalorien (= primary in diesem Theme)|
| macro-protein        | #1F4D3A   | #7FB89A   | Protein                             |
| macro-carbs          | #B8A06A   | #D4BE88   | Kohlenhydrate (gedämpftes Gold)     |
| macro-fat            | #8C7B6B   | #B3A291   | Fett (Taupe)                        |
| success              | #2E7D57   | #5CBF8C   | Ziel erreicht                       |
| warning              | #B7791F   | #D9A04A   | Ziel überschritten                  |
| danger               | #B3261E   | #E0645C   | Nur destruktive Aktionen            |

Stilregeln:
- Grün nie als großflächiger Hintergrund.
- Kalorien-Ring ohne Verlauf: solides accent-calories, runde Enden.
- Tiefe über feine 1px-Borders statt Schatten.
- Hero-Karte darf invertiert sein (inverse-surface) – maximal eine pro Screen.
  Auf der Hero-Karte im Light Mode wird der Ring in #7FB89A dargestellt
  (sonst zu wenig Kontrast auf Schwarz); im Dark Mode in #1F4D3A.

### 1.2 Theme `warm-minimal` (Standard)

Warmer, cremiger Hintergrund, Waldgrün als Marke, appetitliches Koralle für
Kalorien. Ruhig und freundlich.

| Token                | Light     | Dark      |
|----------------------|-----------|-----------|
| bg                   | #FAF8F5   | #141312   |
| surface              | #FFFFFF   | #1E1C1A   |
| surface-muted        | #F2EFEA   | #292623   |
| border               | #E7E2DA   | #34302C   |
| text-primary         | #1F1D1B   | #F5F2ED   |
| text-secondary       | #6B665F   | #B3ADA4   |
| text-tertiary        | #A39D94   | #7A746C   |
| primary              | #2F6B4F   | #6FB38F   |
| primary-hover        | #255840   | #84C3A1   |
| primary-soft         | #E3EEE8   | #22342B   |
| on-primary           | #FFFFFF   | #141312   |
| inverse-surface      | #1F1D1B   | #F5F2ED   |
| inverse-text         | #FAF8F5   | #141312   |
| accent-calories      | #FF7A59   | #FF8A6B   |
| macro-protein        | #5B8DEF   | #7BA5F5   |
| macro-carbs          | #F2B544   | #F5C466   |
| macro-fat            | #E86A92   | #F084A6   |
| success              | #3FA372   | #5CBF8C   |
| warning              | #E0913A   | #F0A552   |
| danger               | #D9534F   | #E5645F   |

Stilregeln:
- Kalorien-Ring darf einen Verlauf haben: accent-calories → macro-carbs.
- Dezente, warme Schatten im Light Mode erlaubt (siehe 4.), im Dark Mode
  Borders statt Schatten.
- Keine invertierte Hero-Karte; stattdessen surface-Karte.

AA-Anpassungen im Light Mode (siehe 1.3), in der Tabelle oben noch mit den
Originalwerten:
- text-tertiary #A39D94 → #91897F (3:1 für Icons und inaktive Zustände;
  Platzhaltertext nutzt text-secondary)
- success #3FA372 → #32805A, warning #E0913A → #A5631A,
  danger #D9534F → #D33833 (4.5:1 als Text)
- accent-calories und Makrofarben bleiben: Ringe und Balken stehen immer
  neben der Zahl und tragen die Information nicht allein.

### 1.3 Für alle Themes
- Alle Text-/Hintergrund-Kombinationen erfüllen WCAG AA (4.5:1 für Text,
  3:1 für große Zahlen und UI-Elemente). Bei Bedarf Töne minimal anpassen und
  die Anpassung hier dokumentieren.
- Überschreitung des Kalorienziels immer in `warning`, nie in `danger`.

---

## 2. Typografie

- Font: **Inter** (Fallback: System-UI).
- Zahlen immer mit tabellarischen Ziffern (`font-feature-settings: "tnum"`
  bzw. Äquivalent), damit sie beim Ändern nicht springen.
- Einheiten („kcal“, „g“) kleiner und in text-secondary direkt neben der Zahl.

| Stil     | Größe/Zeilenhöhe | Gewicht | Extra                    |
|----------|------------------|---------|--------------------------|
| display  | 40/44            | 700     | letter-spacing -0.02em   |
| h1       | 28/34            | 700     | letter-spacing -0.01em   |
| h2       | 20/26            | 600     |                          |
| h3       | 17/23            | 600     |                          |
| body     | 15.5/23          | 400     | Eingaben immer 16px (iOS zoomt sonst) |
| label    | 13.5/19          | 500     | Button-Text 14.5px       |
| caption  | 12.5/17          | 500     | text-secondary           |

---

## 3. Spacing & Radius

- 4px-Grid: 4, 8, 12, 16, 20, 24, 32, 40, 48
- Screen-Padding horizontal: 20px
- Abstand zwischen Karten: 16px
- Karten-Innenabstand: 20px
- Radius: sm 8px (Chips, Inputs) · md 14px (Buttons) · lg 20px (Karten) ·
  xl 28px (Bottom Sheets) · full (Pills, Avatare)
- Touch-Targets mindestens 48×48px

---

## 4. Schatten

Nur im Light Mode, nur wo das Theme es erlaubt:
- card: `0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)`
- elevated: `0 8px 32px rgba(0,0,0,0.10)`

Dark Mode: keine Schatten, Tiefe über hellere Surfaces und Borders.

---

## 5. Komponenten

**Kalorien-Ring (Dashboard-Held)**
Großer Ring, Strichstärke ca. 14px, runde Enden, Track in surface-muted,
Fortschritt in accent-calories. Mitte: verbleibende kcal als display-Zahl,
darunter caption „kcal übrig“. Bei Überschreitung Farbe `warning` und Text
„X kcal über Ziel“.

**Makros**
Drei kompakte horizontale Balken (Höhe 6px, radius full) oder kleine Ringe
nebeneinander. Jeweils Makro-Farbe, Label, „aktuell / Ziel g“.

**Karten**
surface, radius lg, 1px border; im Light Mode von `warm-minimal` zusätzlich
card-Schatten.

**Mahlzeiten-Liste**
Pro Mahlzeit eine Karte: Header mit Name links, kcal-Summe rechts. Einträge als
Zeilen mit 12px Abstand, Trennlinien in border. Leere Mahlzeit: freundlicher
Empty State mit „+ Hinzufügen“.

**Buttons**
- primary: primary-Hintergrund, on-primary-Text, Höhe 52px, radius md
- secondary: surface-muted, text-primary
- ghost: nur Text in primary
- Press-State: scale 0.97

**FAB / Schnell-Hinzufügen**
Rund, accent-calories, elevated-Schatten (nur Light Mode).

**Inputs**
surface-muted, kein Rand, radius sm, Fokus: 2px Ring in primary.

**Bottom Navigation**
surface mit leichtem Blur, 1px border oben. Aktives Icon in primary mit
primary-soft Pill-Hintergrund, inaktive in text-tertiary.

**Icons**
Ein einheitliches Set (Lucide oder Phosphor), 1.75px Strich, 24px Standard.

**Charts**
Weiche Linien, keine Gitterlinien außer dezenter Baseline, Zielwert als
gestrichelte Linie in text-tertiary.

---

## 6. Motion

- Dauer 150–250ms, Easing ease-out (oder Spring mit geringem Bounce)
- Ringe und Balken animieren beim Laden von 0 auf den Wert (600ms)
- Zahlen zählen beim Ändern hoch
- Neue Einträge: Fade + leichtes Slide-in
- `prefers-reduced-motion` bzw. System-Einstellung respektieren

---

## 7. Tonalität

Positiv und neutral: „Noch 640 kcal übrig“, „Proteinziel erreicht“.
Keine Formulierungen, die Essen oder den Nutzer bewerten.

---

## 8. Theme-Switcher

Im Profil unter „Darstellung“: Hell / Dunkel / System (Standard: System).
Auswahl wird lokal gespeichert. Das Theme selbst ist fest `warm-minimal`. Neue Themes lassen sich hinzufügen, indem nur ein neues
Token-Set angelegt wird – ohne Änderungen an Komponenten.

---

## 9. Seitenkopf

Jede Unterseite nutzt `PageHeader` (src/components/page-header.tsx): optional
ein runder Zurück-Knopf (48px), darüber eine kleine Zeile in primary
(„Hinzufügen zu“, „Bearbeiten“), der Titel in h1 und darunter optional eine
Zeile in text-secondary. Titel umbrechen ausgewogen (`text-wrap: balance`) und
trennen deutsche Wörter; lange Titel (über 24 Zeichen) werden automatisch h2.
Aktionen (Stern, Zeitraum-Wahl) stehen rechts oder in einer eigenen Zeile
darunter, nie gequetscht neben einem langen Titel.
