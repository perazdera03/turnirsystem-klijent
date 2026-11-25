# TurnirSystem (klijent)

Klijent aplikacije za organizaciju turnira, napisan u Vue 3 (Vite). Radi sa serverom iz posebnog repozitorijuma `turnirsystem-server`.

## Šta je potrebno

- Node.js 22.18 ili noviji
- pokrenut server na `http://localhost:5095` (vidi README servera)

## Pokretanje

```
npm install
npm run dev
```

Otvori adresu koju ispiše Vite (obično `http://localhost:5173`). Zahtevi ka `/api` se automatski prosleđuju serveru (podešeno u `vite.config.js`).

## Šta može

- javni pregled turnira, grupa, tabela, kostura, rasporeda i statistike (bez prijave)
- admin (posle prijave): ekipe, turniri, prijava ekipa, grupe, mečevi, rezultati, termini, eliminacija
- tamna i svetla tema, latinica i ćirilica (dugmad u gornjem meniju)

## Struktura (`src/`)

- `views/`: stranice
- `components/`: delovi koji se ponavljaju (meni, prozor za brisanje, okviri za tabele i forme)
- `utils/`: prijava, poruke grešaka, tema, pismo
- `router/`: adrese stranica i zaštita za admina