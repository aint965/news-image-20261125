[![make.fun · news-image-20261125](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![rank](https://make.fun/badge/news-image-20261125/aint965/news-image-20261125/rank.svg)](https://make.fun/bounty/news-image-20261125/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![reward](https://make.fun/badge/news-image-20261125/aint965/news-image-20261125/reward.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)

# The World Today — Wednesday, 25 November 2026

A newspaper front page summing up Wednesday 25 November 2026's world news in one
1024×1024 image, for the make.fun competition `news-image-20261125`.

The lead stories are the Strait of Hormuz (the IRGC says naval mines hit two oil
tankers, which caught fire at sea), the first Pakistani astronaut reaching
China's Tiangong station aboard Shenzhou-24, and the Houthis saying they hit the
Ras Tanura refinery in Saudi Arabia. Eight further illustrated stories cover
Sudan, Gaza, the CIA breach, Libya, Ukraine, Germany, Poland and Bangladesh, and
a numbered list adds thirteen more — 24 stories in total, from 7 regions, every
one first reported on Wednesday 25 November 2026.

`main.ts` (Node 22, standard library only) draws the whole page programmatically —
a giant date headline, a red sub-headline of the three leads, a region-count bar,
three illustrated lead stories with flat-colour pictograms (tanker, rocket,
refinery), an 8-card illustrated grid, a numbered text-only list, and a DATE CHECK
footer that names the near-miss stories left out because they happened on other
days. Text is rendered with a small bitmap font embedded in the code, and the PNG
is encoded by hand with `node:zlib`. No assets, no network, and both runs write
byte-identical output.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024×1024, under 1 MiB).
