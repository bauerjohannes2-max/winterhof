import os
import math
from PIL import Image, ImageFilter

BRAIN = r"C:\Users\hannes.bauer\.gemini\antigravity\brain\a4bccfb6-bd11-4f97-9bcb-71b90aec0246"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TERRAIN_DIR = os.path.join(ROOT, "assets", "terrain")
SPRITES_DIR = os.path.join(ROOT, "assets", "sprites")
os.makedirs(TERRAIN_DIR, exist_ok=True)
os.makedirs(SPRITES_DIR, exist_ok=True)


def make_seamless_tile(src_path, dst_path, size=512, soften_contrast=0.0):
    img = Image.open(src_path).convert("RGB").resize((size, size), Image.Resampling.LANCZOS)
    # Optional slight brightening/contrast softening for snow background calm readability
    if soften_contrast > 0:
        px = img.load()
        for y in range(size):
            for x in range(size):
                r, g, b = px[x, y]
                # Blend subtly toward crisp sunlit alpine snow (#EDF5FD)
                tr, tg, tb = 237, 245, 253
                r = int(r * (1 - soften_contrast) + tr * soften_contrast)
                g = int(g * (1 - soften_contrast) + tg * soften_contrast)
                b = int(b * (1 - soften_contrast) + tb * soften_contrast)
                px[x, y] = (r, g, b)

    # Half-shift blend to guarantee 100% mathematically seamless edges
    half = size // 2
    shifted = Image.new("RGB", (size, size))
    shifted.paste(img.crop((half, half, size, size)), (0, 0))
    shifted.paste(img.crop((0, half, half, size)), (half, 0))
    shifted.paste(img.crop((half, 0, size, half)), (0, half))
    shifted.paste(img.crop((0, 0, half, half)), (half, half))

    # Diamond radial mask: 1.0 at center of img, 0.0 at edges -> hides original seams completely
    mask = Image.new("L", (size, size))
    mpx = mask.load()
    for y in range(size):
        dy = abs((y - half) / half)
        for x in range(size):
            dx = abs((x - half) / half)
            d = max(dx, dy)
            # Smooth feather near border (0.62 -> 0.96)
            if d <= 0.60:
                w = 1.0
            elif d >= 0.96:
                w = 0.0
            else:
                t = (d - 0.60) / 0.36
                w = 0.5 * (1.0 + math.cos(math.pi * t))
            mpx[x, y] = int(w * 255)

    out = Image.composite(img, shifted, mask)
    out.save(dst_path, "WEBP", quality=88, method=6)
    print(f"Saved seamless tile: {dst_path} ({os.path.getsize(dst_path)//1024} KB)")


def extract_magenta_sprite(src_path, dst_path, max_size=512):
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    px = img.load()

    # Step 1: Soft chroma-key for bright magenta (#FF00FF) with smooth edge anti-aliasing & despill
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            # How "magenta" is this pixel? Magenta has high R, high B, low G
            rb_min = min(r, b)
            magenta_excess = rb_min - g
            rb_diff = abs(r - b)

            # Background flood/key score
            if magenta_excess > 72 and rb_diff < 95 and rb_min > 120:
                alpha = 0
                nr, ng, nb = r, g, b
            elif magenta_excess > 24 and rb_diff < 110 and rb_min > 85:
                # Smooth anti-aliased transition band
                t = (magenta_excess - 24.0) / 48.0
                t = max(0.0, min(1.0, t))
                alpha = int((1.0 - t) * 255)
                # Despill: clamp R and B toward G proportionally to remove pink halo
                cap = min(255, g + int((1.0 - t) * 34))
                nr = min(r, cap) if r > g + 16 else r
                nb = min(b, cap) if b > g + 16 else b
                ng = g
            else:
                alpha = 255
                nr, ng, nb = r, g, b
                # Mild edge despill only if noticeably magenta-tinted near border
                if magenta_excess > 14 and rb_diff < 55 and g < 160 and r > 130 and b > 130:
                    # Preserve burgundy/red coats (where r >> b), only despill balanced R==B pink
                    if rb_diff < 32:
                        reduce = int((magenta_excess - 14) * 0.45)
                        nr = max(g, r - reduce)
                        nb = max(g, b - reduce)

            px[x, y] = (nr, ng, nb, alpha)

    # Step 2: Flood-fill cleanup from corners so interior magenta-ish colors (if any) aren't accidentally holed,
    # and clean 1px stray fringe pixels on outer alpha
    alpha_band = img.getchannel("A")
    # Tight crop to non-transparent bounding box with small padding
    bbox = alpha_band.getbbox()
    if bbox:
        pad = 6
        x0 = max(0, bbox[0] - pad)
        y0 = max(0, bbox[1] - pad)
        x1 = min(w, bbox[2] + pad)
        y1 = min(h, bbox[3] + pad)
        img = img.crop((x0, y0, x1, y1))

    # Resize cleanly keeping aspect ratio
    cw, ch = img.size
    scale = min(max_size / cw, max_size / ch, 1.0)
    if scale < 1.0:
        img = img.resize((max(1, int(cw * scale)), max(1, int(ch * scale))), Image.Resampling.LANCZOS)

    img.save(dst_path, "WEBP", quality=90, method=6)
    print(f"Saved sprite: {dst_path} ({img.size[0]}x{img.size[1]}, {os.path.getsize(dst_path)//1024} KB)")


def main():
    make_seamless_tile(
        os.path.join(BRAIN, "tex_snow_ground_1795391566170.jpg"),
        os.path.join(TERRAIN_DIR, "snow_ground.webp"),
        size=512,
        soften_contrast=0.22,
    )
    make_seamless_tile(
        os.path.join(BRAIN, "tex_cobblestone_1795391538569.jpg"),
        os.path.join(TERRAIN_DIR, "cobble_road.webp"),
        size=512,
        soften_contrast=0.0,
    )
    extract_magenta_sprite(
        os.path.join(BRAIN, "prop_timber_bridge_1795391537505.jpg"),
        os.path.join(SPRITES_DIR, "timber_bridge.webp"),
        max_size=512,
    )
    extract_magenta_sprite(
        os.path.join(BRAIN, "prop_alpine_cliff_1795391539002.jpg"),
        os.path.join(SPRITES_DIR, "alpine_cliff.webp"),
        max_size=512,
    )
    extract_magenta_sprite(
        os.path.join(BRAIN, "prop_alpine_villager_1795391540283.jpg"),
        os.path.join(SPRITES_DIR, "alpine_villager.webp"),
        max_size=320,
    )

    # Remove unused legacy non-Christmas sprites for 100% pure Alpine Christmas bundle
    legacy = [
        "animal_owl.webp",
        "autumn_tree_landmark.webp",
        "crop_mushroom.webp",
        "crop_pumpkin.webp",
        "deco_autumn_tree.webp",
        "deco_cauldron.webp",
        "deco_ghost.webp",
        "deco_pumpkin.webp",
        "deco_sorting_hat.webp",
        "deco_spider.webp",
    ]
    for name in legacy:
        p = os.path.join(SPRITES_DIR, name)
        if os.path.exists(p):
            os.remove(p)
            print(f"Purged legacy non-Christmas sprite: {name}")


if __name__ == "__main__":
    main()
