"""Generate square site icons from the user-provided icon.png (requires Pillow)."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = Image.open(root / "icon.png").convert("RGB")
# Find the red mark, excluding the generated image's wide cream margins.
mask = Image.new("L", source.size)
mask.putdata([255 if r > 150 and r > g * 1.5 and r > b * 1.5 else 0
              for r, g, b in source.getdata()])
bounds = mask.getbbox()
if not bounds:
    raise ValueError("Could not locate the red brand mark")
mark = source.crop(bounds)
side = round(max(mark.size) / 0.76)
square = Image.new("RGB", (side, side), source.getpixel((0, 0)))
square.paste(mark, ((side - mark.width) // 2, (side - mark.height) // 2))
public = root / "public"
for size, name in [(96, "favicon-96x96.png"), (192, "favicon-192x192.png"),
                   (180, "apple-touch-icon.png"), (512, "icon-512.png")]:
    square.resize((size, size), Image.Resampling.LANCZOS).save(public / name, optimize=True)
square.resize((256, 256), Image.Resampling.LANCZOS).save(
    public / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print(f"Source: {source.size}; mark: {bounds}; square: {side}x{side}")
