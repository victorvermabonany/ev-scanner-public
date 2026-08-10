Vendored latin subsets of two open fonts, so the app makes no external
requests and works offline.

- newsreader-latin.woff2      Newsreader Variable (weight axis), SIL OFL 1.1
- jetbrains-mono-latin.woff2  JetBrains Mono Variable (weight axis), SIL OFL 1.1

Taken from the @fontsource-variable packages of the same names. Only the
latin subsets are shipped; the full packages carry Cyrillic, Greek and
Vietnamese too, which would be ~1.7MB of files this app never renders.
