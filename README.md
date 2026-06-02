# Scratch & Read: Chaos Edition

A free static scratch-card book tracker built with plain HTML, CSS and JavaScript.

## Artwork

Place the supplied 1536 x 864 artwork image here:

```text
assets/scratch-and-read.jpg
```

The app uses that image as the board background and overlays percentage-positioned scratch zones on the visible gold circles. I identified 24 visible scratch circles in the supplied coordinate list. The Apocalypse / Zombie Chaos category lists five books but appears to show only four visible gold circles, so the app defaults to 24 zones.

To add the estimated missing fifth zombie coin, open `app.js` and set:

```js
const SHOW_SYNTHETIC_MISSING_ZOMBIE_COIN = true;
```

Scratch coordinates live near the top of `app.js`. Edit the `x` and `y` values there if any circle needs a small alignment nudge.

## Run Locally

Because service workers require a local server, preview with any static server:

```sh
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Deploy For Free

### GitHub Pages

1. Create a GitHub repository.
2. Add these files, including `assets/scratch-and-read.jpg`.
3. Commit and push.
4. In GitHub, open **Settings -> Pages**.
5. Set the source to the main branch and root folder.

### Netlify Free

1. Drag this project folder into Netlify Drop, or connect the GitHub repository.
2. Use no build command.
3. Set the publish directory to the project root.

### Vercel Hobby

1. Import the GitHub repository.
2. Use no framework preset.
3. Set the output directory to the project root.

## Features

- Pointer Events scratching for mouse, touch and stylus.
- Double tap or tap-and-hold fallback completion.
- Automatic completion after roughly 50% of a coin is scratched.
- Progress saved in `localStorage`.
- Reset, mark all, export JSON and import JSON controls.
- PWA manifest and service worker for Android Add to Home Screen and offline loading after first visit.
