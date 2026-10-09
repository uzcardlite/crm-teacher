"""Play Store marketing screenshots for Ustoz (copied from crm-portal, amber palette).

Takes a raw app screenshot (as captured from the phone or a device-mode
browser) and composites it into a branded 1080x1920 frame: the Farzandim
gradient, a headline, and the screen inside a phone mockup.

Usage:
    python scripts/store_screenshots.py raw/home.png "To'liq nazorat" \
        "Farzandingiz haqida hamma narsa bir joyda" out/01-home.png

Requires Pillow.
"""

import math
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920                    # 9:16, inside Play's 320-3840 range
BASE = (245, 166, 35)                # Ustoz amber (#F5A623)
YELLOW = (250, 199, 117)              # accent light (#FAC775)
PINK = (133, 79, 11)                  # accent dark (#854F0B), bottom-right bloom
INK = (255, 255, 255)

PHONE_W = 720                        # mockup width on the canvas
BEZEL = 16                           # dark frame thickness
RADIUS = 56


def _lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient() -> Image.Image:
    """The same corner-bloom gradient as the app icon, at canvas scale."""
    img = Image.new("RGB", (W, H))
    px = img.load()
    for y in range(H):
        ty = y / H
        for x in range(W):
            tx = x / W
            col = BASE
            wy = max(0.0, 1 - math.hypot(tx - 1, ty - 0) / 0.95)
            wp = max(0.0, 1 - math.hypot(tx - 1, ty - 1) / 1.0)
            col = _lerp(col, YELLOW, min(1.0, wy) * 0.55)
            col = _lerp(col, PINK, min(1.0, wp) * 0.75)
            px[x, y] = col
    return img


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    path = (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
        if bold
        else "/System/Library/Fonts/Supplemental/Arial.ttf"
    )
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def wrap(draw, text: str, f, max_w: int) -> list[str]:
    """Greedy wrap — measured, never estimated, so nothing overflows."""
    words, lines, cur = text.split(), [], ""
    for word in words:
        trial = f"{cur} {word}".strip()
        if draw.textbbox((0, 0), trial, font=f)[2] <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def rounded_shadow(size, radius, blur=28, alpha=110) -> Image.Image:
    w, h = size
    pad = blur * 3
    layer = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle([pad, pad, pad + w, pad + h], radius=radius,
                        fill=(60, 20, 0, alpha))
    return layer.filter(ImageFilter.GaussianBlur(blur))


def build(shot_path: str, headline: str, subtitle: str, out_path: str) -> None:
    canvas = gradient()
    draw = ImageDraw.Draw(canvas)
    margin = 72
    text_w = W - margin * 2

    # --- text block, measured top-down -----------------------------------
    f_head = font(74)
    f_sub = font(38, bold=False)
    head_lines = wrap(draw, headline, f_head, text_w)
    sub_lines = wrap(draw, subtitle, f_sub, text_w)

    y = 120
    for line in head_lines:
        bb = draw.textbbox((0, 0), line, font=f_head)
        draw.text(((W - bb[2]) // 2, y), line, font=f_head, fill=INK)
        y += bb[3] - bb[1] + 22
    y += 14
    for line in sub_lines:
        bb = draw.textbbox((0, 0), line, font=f_sub)
        draw.text(((W - bb[2]) // 2, y), line, font=f_sub, fill=(255, 255, 255, 230))
        y += bb[3] - bb[1] + 14

    # --- phone mockup ----------------------------------------------------
    shot = Image.open(shot_path).convert("RGB")
    inner_w = PHONE_W - BEZEL * 2
    inner_h = int(inner_w * shot.height / shot.width)
    shot = shot.resize((inner_w, inner_h), Image.LANCZOS)

    phone_h = inner_h + BEZEL * 2
    px = (W - PHONE_W) // 2
    py = y + 70
    # Clip an over-tall screenshot rather than letting it run off canvas.
    if py + phone_h > H - 40:
        phone_h = H - 40 - py
        inner_h = phone_h - BEZEL * 2
        shot = shot.crop((0, 0, shot.width, min(shot.height, inner_h)))

    shadow = rounded_shadow((PHONE_W, phone_h), RADIUS)
    canvas.paste(shadow, (px - 84, py - 60), shadow)

    body = Image.new("RGB", (PHONE_W, phone_h), (26, 22, 19))
    mask = Image.new("L", (PHONE_W, phone_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, PHONE_W, phone_h],
                                           radius=RADIUS, fill=255)
    body.paste(shot, (BEZEL, BEZEL))
    canvas.paste(body, (px, py), mask)

    canvas.save(out_path)
    print(f"{out_path}  ({W}x{H})")


if __name__ == "__main__":
    if len(sys.argv) != 5:
        print(__doc__)
        sys.exit(1)
    build(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
