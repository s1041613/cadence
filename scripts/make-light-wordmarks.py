"""make-light-wordmarks.py — derive the light month wordmarks the v2 "cute" mode shows over a photo.

The drawn wordmarks in public/month-wordmarks/ are near-black ink plus pink sparkles. Over a dark
wallpaper the ink disappears, so this script writes a copy of each into public/month-wordmarks/light/
with every ink pixel recoloured to a warm white. Only the colour changes: alpha is kept per pixel,
so the anti-aliased pixel edges and the drawing itself are identical to the original.

A pixel counts as ink when it is dark (brightest channel < 120) AND close to grey (channel spread
< 40). The pinks fail the second test however dark they get, so the sparkles are left alone. The
thresholds were checked against all twelve files; re-check them if a month gains a dark colour
that is not ink (a deep blue or green would be recoloured too).

Rerun after redrawing a wordmark:

    python3 scripts/make-light-wordmarks.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'public' / 'month-wordmarks'
OUT = SRC / 'light'
LIGHT_INK = (255, 248, 242)


def is_ink(r: int, g: int, b: int) -> bool:
    return max(r, g, b) < 120 and max(r, g, b) - min(r, g, b) < 40


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for src in sorted(SRC.glob('*.png')):
        im = Image.open(src).convert('RGBA')
        px = im.load()
        width, height = im.size
        for y in range(height):
            for x in range(width):
                r, g, b, a = px[x, y]
                if a and is_ink(r, g, b):
                    px[x, y] = (*LIGHT_INK, a)
        im.save(OUT / src.name, optimize=True)
        print(f'{src.name} -> light/{src.name}')


if __name__ == '__main__':
    main()
