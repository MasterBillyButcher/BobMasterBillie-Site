"""Generate favicon.ico (16/32/48) matching src/app/icon.svg: amber tile, black B."""
from PIL import Image, ImageDraw, ImageFont

AMBER = (245, 166, 35, 255)
INK = (20, 20, 20, 255)

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]


def draw_tile(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = max(2, size // 6)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=AMBER)
    font_path = next((p for p in FONT_CANDIDATES if __import__("os").path.exists(p)), None)
    if font_path:
        font = ImageFont.truetype(font_path, int(size * 0.72))
    else:
        font = ImageFont.load_default()
    bbox = d.textbbox((0, 0), "B", font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((size - w) / 2 - bbox[0], (size - h) / 2 - bbox[1]), "B", font=font, fill=INK)
    return img


tiles = [draw_tile(s) for s in (48, 32, 16)]
tiles[0].save(
    "/home/z/my-project/src/app/favicon.ico",
    format="ICO",
    sizes=[(48, 48), (32, 32), (16, 16)],
)
print("favicon.ico written")
