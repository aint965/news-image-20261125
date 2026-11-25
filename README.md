[![make.fun · news-image-20261125](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![rank](https://make.fun/badge/news-image-20261125/aint965/news-image-20261125/rank.svg)](https://make.fun/bounty/news-image-20261125/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![reward](https://make.fun/badge/news-image-20261125/aint965/news-image-20261125/reward.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)

# The World Today — Wednesday, 25 November 2026

A newspaper front page summing up Wednesday 25 November 2026's world news in one
1024×1024 image, for the make.fun competition `news-image-20261125`.

The lead story is Ukraine striking Russian ships at sea — President Zelenskiy
confirmed Ukraine was behind a drone strike on a Russian cargo ship in the Gulf of
Finland, and Ukraine says it sank a Russian warship in Benghazi harbour, Libya.
Six further stories cover Iran (naval mines hit three oil tankers in the Strait of
Hormuz), the Houthi drone strike on Riyadh's tallest tower, Huawei's conviction in
a US criminal trial, Trump's Presidential Medal of Freedom for Rudy Giuliani, the
cybersecurity breach at the CIA and the Director of National Intelligence, and
NATO's early-warning aircraft deployment to Poland.

`main.ts` (Node 22, standard library only) draws the whole page programmatically —
masthead, date band, lead story with a flat-colour sea pictogram, and a 3×2 grid of
stories, each with its own pictogram drawn from rectangles, circles and triangles.
Text is rendered with a small bitmap font embedded in the code, and the PNG is
encoded by hand with `node:zlib`. No assets, no network, and both runs write
byte-identical output.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024×1024, under 1 MiB).
