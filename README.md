# Type the Piano

Choose a classical piano performance and play it by typing on a physical keyboard. Each eligible keystroke advances the score by one musical event while locally stored grand-piano samples provide the sound.

The library currently includes Chopin's *Aeolian Harp*, Beethoven's *Für Elise*, and Debussy's *Clair de lune*.

## Features

- A browsable classical library with direct links to each performance.
- **Guided mode:** follow a progressive text guide. A wrong key stays silent until corrected; Backspace clears the current typo.
- **Free Play mode:** use eligible keys without a required text sequence.
- Live performance progress, recent-key feedback, and guided words-per-minute and accuracy summaries.
- Sampled Salamander Grand Piano audio, served entirely with the app.
- Pause, resume, restart, and volume controls.

## Roadmap

- **Now:** expand and refine the classical library.
- **Next:** local favorites, recent performances, and personal bests.
- **Later:** optional accounts, cross-device sync, long-term statistics, and daily practice.

The website carries the public-facing roadmap. GitHub issues track implementation details once work begins.

## Requirements

- Node.js 22.13 or newer
- npm
- A modern desktop browser with Web Audio support
- A physical keyboard

This experience is designed around physical-key input and is not currently usable with touch-only devices.

## Local development

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Select **Wake the piano** once to allow browser audio.

Other checks:

```sh
npm run verify:assets
npm run lint
npm test
npm run build
```

## Privacy

The app has no accounts, analytics, advertising, or application backend. It does not intentionally collect or transmit personal information. The host you deploy to may keep standard request logs under its own policies.

## Accessibility

Controls have keyboard labels and guided prompts are exposed to assistive technology. The core interaction nevertheless depends on rapid physical-key input, visual feedback, and audio; it has not been validated as fully accessible for all users. Reduced-motion preferences are respected for optional transitions.

## Deploying to Vercel

Import the repository in Vercel and use the **Vite** framework preset. The standard settings are sufficient:

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm ci`
- Node.js version: 22.x

No environment variables or external services are required.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports should follow [SECURITY.md](SECURITY.md).

## Licenses and credits

The source code and documentation are available under the [MIT License](LICENSE). Bundled MIDI and piano recordings are **not** covered by the MIT License; they retain their respective Creative Commons licenses and attribution requirements. See [ASSET_ATTRIBUTIONS.md](ASSET_ATTRIBUTIONS.md), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), and the deployed [combined notice](public/assets/NOTICE.txt).
