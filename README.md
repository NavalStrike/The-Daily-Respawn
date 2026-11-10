# The Daily Respawn

Daily digital magazine on games, movies, tech, A.I., comics, manga and manhwa — as an installable PWA (EN/PT).

- App: static site (no build). `index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest`.
- Data: `data/editions.json` (index, `latest` id) + `data/editions/<id>.json` (one file per edition, bilingual `{en, pt}` fields).
- Images: `img/<id>/…`. Logo: `img/respawn-logo.jpg`.
- Daily edition: a scheduled task writes the new edition JSON + images, updates `data/editions.json`, and pushes to `main`.
- Install: open the site on the phone → "Add to Home Screen" (iOS: Share → Add to Home Screen; Android/Chrome: Install).

Creators: Pedro Nanjamba & Anderson Naval · Co-creators: Paulo Anjos and Sandro Ndala.
