import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from nutrilabel.catalog import PRODUCTS, Product
from nutrilabel.config import LABELS_DIR

FONTS = {
    "sans": ["/System/Library/Fonts/Supplemental/Arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"],
    "bold": ["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"],
    "black": ["/System/Library/Fonts/Supplemental/Arial Black.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"],
}

DAILY_VALUE = {"fat": 78, "sodium": 2300, "carbs": 275}


def font(kind: str, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in FONTS[kind]:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size)


def fmt(value: float) -> str:
    return f"{value:g}"


def pct(amount: float, key: str) -> str:
    return f"{round(100 * amount / DAILY_VALUE[key])}%"


def right(d: ImageDraw.ImageDraw, x: int, y: int, text: str, fnt) -> None:
    d.text((x - d.textlength(text, font=fnt), y), text, font=fnt, fill="black")


def rule(d: ImageDraw.ImageDraw, x0: int, x1: int, y: int, width: int) -> int:
    d.rectangle([x0, y, x1, y + width - 1], fill="black")
    return y + width + 6


def classic(p: Product, columns: bool = False) -> Image.Image:
    t = p.truth
    mult = p.per_container_multiplier or 1
    w, h = (620 if columns else 520), 640
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)
    x0, x1 = 30, w - 30
    d.rectangle([x0 - 8, 20, x1 + 8, h - 20], outline="black", width=4)
    d.text((x0, 30), p.brand_line, font=font("bold", 15), fill="black")
    y = rule(d, x0, x1, 56, 1) + 4
    d.text((x0, y), "Nutrition Facts", font=font("black", 40), fill="black")
    y += 54
    d.text((x0, y), f"{p.servings_prefix}{fmt(t.servings_per_container)} servings per container", font=font("sans", 19), fill="black")
    y += 28
    d.text((x0, y), "Serving size", font=font("bold", 21), fill="black")
    right(d, x1, y, p.serving_text, font("bold", 21))
    y = rule(d, x0, x1, y + 34, 10)
    if columns:
        d.text((x0, y), "Amount", font=font("bold", 15), fill="black")
        right(d, x1 - 130, y, "Per serving", font("bold", 15))
        right(d, x1, y, "Per container", font("bold", 15))
        y += 24
    else:
        d.text((x0, y), "Amount per serving", font=font("bold", 15), fill="black")
        y += 22
    d.text((x0, y), "Calories", font=font("black", 30), fill="black")
    if columns:
        right(d, x1 - 130, y, str(t.calories), font("black", 30))
        right(d, x1, y, str(t.calories * mult), font("black", 30))
    else:
        right(d, x1, y, str(t.calories), font("black", 38))
    y = rule(d, x0, x1, y + 46, 6)
    if not columns:
        right(d, x1, y - 2, "% Daily Value*", font("bold", 15))
        y += 22
    rows = [
        ("Total Fat", t.total_fat_g, "g", "fat", False),
        ("Sodium", t.sodium_mg, "mg", "sodium", False),
        ("Total Carbohydrate", t.total_carbs_g, "g", "carbs", False),
        ("Total Sugars", t.sugars_g, "g", None, True),
        ("Protein", t.protein_g, "g", None, False),
    ]
    for label, amount, unit, key, indent in rows:
        x = x0 + (24 if indent else 0)
        name_font = font("sans" if indent else "bold", 19)
        d.text((x, y), label, font=name_font, fill="black")
        at = x + d.textlength(label, font=name_font) + 6
        if columns:
            right(d, x1 - 130, y, f"{fmt(amount)}{unit}", font("sans", 19))
            right(d, x1, y, f"{fmt(amount * mult)}{unit}", font("sans", 19))
        else:
            d.text((at, y), f"{fmt(amount)}{unit}", font=font("sans", 19), fill="black")
            if key:
                right(d, x1, y, pct(amount, key), font("bold", 19))
        y = rule(d, x0, x1, y + 28, 1)
    y += 4
    if not columns:
        d.multiline_text(
            (x0, y),
            "* The % Daily Value tells you how much a nutrient in a\nserving contributes to a daily diet. 2,000 calories a\nday is used for general nutrition advice.",
            font=font("sans", 12),
            fill="black",
        )
    return img


def tabular(p: Product) -> Image.Image:
    t = p.truth
    img = Image.new("RGB", (760, 330), "white")
    d = ImageDraw.Draw(img)
    d.rectangle([14, 14, 746, 316], outline="black", width=3)
    d.text((34, 24), p.brand_line, font=font("bold", 15), fill="black")
    d.text((34, 48), "Nutrition Facts", font=font("black", 30), fill="black")
    d.text((34, 92), f"Serving size {p.serving_text}", font=font("bold", 19), fill="black")
    d.text((34, 118), f"Servings per container: {fmt(t.servings_per_container)}", font=font("sans", 19), fill="black")
    d.text((470, 48), "Calories", font=font("black", 26), fill="black")
    right(d, 726, 44, str(t.calories), font("black", 38))
    d.rectangle([34, 150, 726, 155], fill="black")
    cells = [
        ("Total Fat", f"{fmt(t.total_fat_g)} g"),
        ("Sodium", f"{fmt(t.sodium_mg)} mg"),
        ("Total Carbohydrate", f"{fmt(t.total_carbs_g)} g"),
        ("Total Sugars", f"{fmt(t.sugars_g)} g"),
        ("Protein", f"{fmt(t.protein_g)} g"),
    ]
    for i, (label, value) in enumerate(cells):
        col, row = i % 2, i // 2
        x, y = 34 + col * 360, 170 + row * 46
        d.text((x, y), label, font=font("sans", 21), fill="black")
        right(d, x + 320, y, value, font("bold", 21))
        d.rectangle([x, y + 34, x + 320, y + 34], fill="#444444")
    return img


def photo(p: Product, seed: int = 7) -> Image.Image:
    rng = random.Random(seed)
    panel = classic(p)
    canvas = Image.new("RGB", (760, 820), (150, 140, 128))
    d = ImageDraw.Draw(canvas)
    for _ in range(4000):
        x, y = rng.randrange(760), rng.randrange(820)
        shade = rng.randrange(120, 170)
        d.point((x, y), fill=(shade, shade - 6, shade - 14))
    panel = panel.convert("RGB").point(lambda v: 95 + int(v * 0.5))
    tilted = panel.rotate(5, expand=True, fillcolor=(150, 140, 128), resample=Image.Resampling.BICUBIC)
    canvas.paste(tilted, (60, 60))
    return canvas.filter(ImageFilter.GaussianBlur(1.3))


def render(p: Product) -> Image.Image:
    if p.style == "classic":
        return classic(p)
    if p.style == "dual":
        return classic(p, columns=True)
    if p.style == "tabular":
        return tabular(p)
    return photo(p)


def path_for(slug: str, directory: Path = LABELS_DIR) -> Path:
    return directory / f"{slug}.png"


def generate_all(directory: Path = LABELS_DIR, force: bool = False) -> list[Path]:
    directory.mkdir(parents=True, exist_ok=True)
    paths = []
    for product in PRODUCTS:
        out = path_for(product.slug, directory)
        if force or not out.exists():
            render(product).save(out)
        paths.append(out)
    return paths
