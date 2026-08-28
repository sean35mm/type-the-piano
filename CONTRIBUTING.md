# Contributing

Thanks for improving Type the Piano.

Pull requests and useful public feedback are welcome; `@sean35mm` is the sole maintainer and makes final acceptance and merge decisions.

## Before opening a change

1. Search existing issues and pull requests.
2. For a substantial feature or behavior change, open an issue before investing in implementation.
3. Keep changes focused and avoid unrelated dependency or formatting updates.

## Development workflow

Use Node.js 22.13 or newer and install from the lockfile:

```sh
npm ci
```

Before opening a pull request, run:

```sh
npm run verify:assets
npm run lint
npm test
npm run build
```

Describe the user-visible effect, testing performed, and any accessibility impact in the pull request.

## Music and audio assets

Do not add or replace MIDI, audio, images, fonts, or other third-party assets without documented provenance and redistribution rights. Asset changes must update `ASSET_ATTRIBUTIONS.md`, `ASSET_CHECKSUMS.sha256`, `THIRD_PARTY_NOTICES.md`, and `public/assets/NOTICE.txt` as applicable.

## Contribution license

You retain copyright in your contribution. By submitting it, you agree that it may be distributed under this project's MIT License. This does not change the separate licenses of bundled third-party assets.
