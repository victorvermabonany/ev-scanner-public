Vendored latin subsets of two open fonts, so the app makes no external
requests and works offline.

- newsreader-latin.woff2  Newsreader Variable (weight axis), SIL OFL 1.1
- inter-latin.woff2       Inter Variable (weight axis), SIL OFL 1.1

Taken from the @fontsource-variable packages of the same names. Newsreader is
the same file the chess-coach client uses. Only the latin subsets are shipped;
the full packages carry Cyrillic, Greek and Vietnamese too, which this app
never renders.
