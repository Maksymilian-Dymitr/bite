# Bite

Snap a meal → Gemini estimates it → correct the grams → logged. Local-only Android app (Expo SDK 58).

See `PLAN.md` for product, design and phases.

## Run it

```bash
npm install            # .npmrc sets legacy-peer-deps
npx expo start         # scan the QR with Expo Go (SDK 58) on your Android phone
```

In the app: **Settings → Gemini** → paste a key from aistudio.google.com, then set your daily targets.

## Install as a real app (APK)

```bash
npx eas-cli@latest login
npm run build:apk      # EAS cloud build → download link for an .apk
```

## Structure

```
src/
  app/                 routes (expo-router)
    _layout.tsx        fonts, DB migrations, pending-retry (on open + on foreground)
    (tabs)/index.tsx   Today — readout, scale tape, macros, meals
    (tabs)/progress    7-day bars, averages, weight + smoothed trend
    (tabs)/settings    targets, Gemini key/model, daily reminder, backup
    capture.tsx        camera → hint → analyze
    add.tsx            describe a meal in words, scan a barcode, favorites, log again
    scan.tsx           barcode → Open Food Facts → meal
    meal/[id].tsx      review/edit items, retry, favorite, log again, delete
  db/                  Drizzle schema, client, live queries + writes
  lib/                 gemini, photos, analyze, barcode, reminder, backup, dates, nutrition, settings
  components/          ScaleTape, MacroLine, MealRow, Button
  theme.ts             colors, fonts, type scale
drizzle/               generated migrations
```

## Changing the schema

Edit `src/db/schema.ts`, then:

```bash
npm run db:generate    # writes a new migration into drizzle/
```

Migrations run on app start.

## Checks

```bash
npm run typecheck
```
