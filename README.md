# 🚦 Lights Out – F1 Tippspiel

Das Formel-1-Tippduell für zwei. Installierbare PWA, offline-fähig, optimiert für Android/Chrome.

Konzept & Regeln: [docs/KONZEPT.md](docs/KONZEPT.md)

## Entwicklung

```bash
npm install
npm run dev        # Entwicklungsserver
npm test           # Tests (Punkte & Sperre)
npm run build      # Produktions-Build nach dist/
npm run preview    # Build lokal ansehen
npm run icons      # PWA-Icons aus assets/logo-mark.svg erzeugen (braucht Playwright)
```

## Deployment (GitHub Pages)

Jeder Push auf `main` baut und veröffentlicht die App über GitHub Actions.
Einmalig nötig: **Settings → Pages → Source: „GitHub Actions“**.

URL danach: `https://<user>.github.io/f1tippspiel/`

## Auf dem Handy installieren

1. URL in Chrome öffnen
2. Menü ⋮ → **„App installieren“** bzw. „Zum Startbildschirm hinzufügen“

## Testen

Unter **Mehr → Test-Wochenende anlegen** entsteht ein Wochenende, dessen Sessions in 2, 5, 10 und 30 Minuten starten.
So lassen sich Tippen, Sperre und Auswertung direkt ausprobieren. Oben rechts wechselt man zwischen den Spielern.
