# Undercut – Konzept

> Ein Formel-1-Tippduell für zwei Spieler als installierbare, offline-fähige PWA.

## 1. Ziel

Zwei Spieler tippen Qualifying-, Sprint- und Rennergebnisse, sammeln Punkte und spielen die Saison gegeneinander.
Fokus zunächst: **Android-Smartphone (Samsung, Chrome)**. Tablet/Desktop später.

## 2. Spielregeln

### Tipps pro Wochenende

| Session            | Getippt wird | Multiplikator |
|--------------------|--------------|---------------|
| Qualifying         | Top 10       | ×1            |
| Sprint-Qualifying  | Top 10       | ×1            |
| Sprint             | Top 8        | ×1            |
| Rennen             | Top 10       | **×2**        |

### Punkte (für jede Session)

- **1 Punkt** pro getipptem Fahrer, der tatsächlich in den Top 10 bzw. Top 8 landet (Position egal)
- **+2 Punkte**, wenn zusätzlich die **Position exakt** stimmt (also 3 Punkte für einen exakten Treffer)
- Das Rennen zählt doppelt.

Maximal: Qualifying/Sprint-Qualifying 30 · Sprint 24 · Rennen 60 + 18 Bonus.

### Bonusfragen (nur Rennen)

| Frage              | Punkte |
|--------------------|---------|
| Schnellste Runde   | 5      |
| Driver of the Day  | 10     |
| Safety Car ja/nein (VSC zählt als SC) | 3 |

**Tippschluss Bonusfragen:** Schnellste Runde und SC/VSC sperren mit dem Rennstart.
**Driver of the Day** bleibt bis **30 Minuten nach Rennstart** tippbar. So sieht man schon etwas vom Rennen.
Den Driver-of-the-Day-Tipp der anderen Person sieht man erst nach diesen 30 Minuten.

### Saisontipps (vor dem ersten Saison-Event)

| Tipp                      | Punkte |
|---------------------------|---------|
| Fahrer-Weltmeister        | 30     |
| Konstrukteurs-Weltmeister | 30     |

Alle Punktwerte stehen zentral in `src/domain/rules.ts`.

**Manuell einzutragen:** Ergebnis des Sprint-Qualifyings, Driver of the Day, SC/VSC.

### Fairness

- **Tippschluss = Sessionbeginn.** Danach werden Tipps abgelehnt.
- Die Tipps der anderen Person sind **erst nach Tippschluss sichtbar**. Vorher sieht man nur, *ob* getippt wurde.
- Saisontipps sperren mit der ersten Session der Saison.

## 3. Funktionen

- **Start:** Punktestand, nächste Session mit Countdown, Tippstatus beider Spieler; Aktualisieren durch Runterwischen (nur hier, nur im oberen Drittel)
- **Tipps:** kommende Wochenenden, abgeschlossene Rennen und Saisontipps in zugeklappten Bereichen
- **Renntipp:** Gibt es schon einen Quali-Tipp, wird angeboten, ihn zu übernehmen (Dialog mit Vorschau)
- **Icons:** Comic-Stil auf Basis von Phosphor Icons (MIT, siehe `licenses/`)
- **Tippen:** Plätze antippen und Fahrer wählen (nur Stammfahrer, nach Team-WM sortiert, zweispaltig je Team); Plätze per Drag & Drop (lange drücken) verschieben
- **Auto-Save:** Alle Eingaben werden sofort gespeichert, es gibt keine Speichern-Buttons, Teamfarben, Bonusfragen beim Rennen
- **Auswertung:** Vergleich Ergebnis ↔ Tipp A ↔ Tipp B, Punkte pro Session
- **Wertung:** Gesamtstand, Wochenendsiege, Punkte pro Wochenende
- **Boxenfunk:** kurze Nachrichten an die andere Person, inkl. Schnellfunk-Buttons
- **Offline:** App-Shell über den Service Worker, Daten in IndexedDB

- **Bedienung:** Kein Zoom, kein natives Pull-to-Refresh; Wischen links/rechts wechselt zwischen den Hauptmenüpunkten; Auswahlmenüs lassen sich nach unten wegwischen

## 4. Daten

- **Kalender, Fahrer, Teams, Ergebnisse:** [Jolpica F1 API](https://github.com/jolpica/jolpica-f1) (Nachfolger von Ergast), kostenlos und ohne Key
- **Nicht über die API verfügbar, wird manuell eingetragen:** Ergebnis des Sprint-Qualifyings, Driver of the Day, SC/VSC
- **Fallback:** Fahrerfeld 2026 ist hinterlegt, falls die API noch keine Daten liefert
- **Ersatzfahrer** werden automatisch ausgeblendet: Aus den letzten 3 Rennergebnissen werden pro Team die 2 Fahrer mit den meisten Einsätzen genommen (bei Gleichstand gewinnt, wer zuletzt gefahren ist). Unter *Mehr → Fahrer* lässt sich das per Hand überschreiben. Beim manuellen Eintragen eines Ergebnisses stehen alle Fahrer zur Wahl, auch Ersatzfahrer.

## 5. Architektur

```
src/
  domain/      Reine Logik ohne UI und Speicher → zieht später 1:1 auf den Server
    rules.ts     alle Spielregeln/Punktwerte
    scoring.ts   Punkteberechnung (+ Tests)
    lock.ts      Sperrlogik (Tippschluss)
    types.ts
  data/
    repository.ts       Interface für alle schreibenden Operationen
    localRepository.ts  Testphase: IndexedDB (Dexie), prüft die Sperre wie später der Server
    queries.ts          lesende Hooks (live-aktualisierend)
    f1api.ts            Jolpica-Client
    sync.ts             Kalender/Ergebnisse laden
    fallback.ts         Fallback-Fahrerfeld, Test-Wochenende
  components/  UI-Bausteine (DriverPicker, BonusEditor, …)
  pages/       Seiten (Hash-Routing → läuft auf GitHub Pages)
```

**Stack:** Vite · React · TypeScript · Dexie (IndexedDB) · vite-plugin-pwa (Workbox) · Vitest

## 6. Phasen

### Phase 1 – Testphase (jetzt)
- Alle Daten lokal im Browser (IndexedDB)
- Jedes Gerät tippt nur für **sich selbst** (fest Spieler 1). Die andere Person erscheint erst mit dem Server.
- Sperre wird lokal geprüft. Das ist zum Testen gedacht, die Handyuhr könnte man verstellen.
- Hosting: GitHub Pages

### Phase 2 – Server & Datenbank
- Eigener Server + Datenbank, **Login pro Spieler**
- `ApiRepository` implementiert das bestehende `Repository`-Interface, die UI bleibt unverändert
- `domain/lock.ts` und `domain/scoring.ts` laufen **serverseitig mit Serverzeit**. Die Sperre ist dann manipulationssicher.
- Server holt Ergebnisse automatisch (Cron) und verteilt die Tipps erst nach Tippschluss
- Offline: Lesen aus dem lokalen Cache. Offline gespeicherte Tipps zählen erst, wenn der Server sie **vor** dem Sessionbeginn angenommen hat.
- Push-Benachrichtigungen (z. B. „Qualy in 1 h – du hast noch nicht getippt“, neue Boxenfunk-Nachricht)

### Später
- Tablet/Desktop-Layout
- Finaler App-Name und Logo-Feinschliff
- Statistiken (Trefferquote, bester Fahrer-Tipper, Saisonverlauf als Diagramm)

## 7. Branding

- **Name:** Undercut (die Boxenstrategie, mit der man den Gegner austrickst)
- **Logo:** „Duell-Linie“: zwei Ideallinien durch eine Kurve in Rot und Türkis (= Spielerfarben), dezente Zielflagge im Hintergrund
- Quelle: `assets/logo-mark.svg` (Motiv in `<g id="mark">`) → Icons erzeugen mit `npm run icons`
- Verworfene Entwürfe: `assets/logo-concepts/`
