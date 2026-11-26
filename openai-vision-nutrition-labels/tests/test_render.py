from PIL import Image

from nutrilabel.catalog import PRODUCTS
from nutrilabel.render import generate_all, path_for


def test_generates_one_png_per_product(tmp_path):
    paths = generate_all(tmp_path)
    assert [p.name for p in paths] == [f"{p.slug}.png" for p in PRODUCTS]
    for path in paths:
        with Image.open(path) as img:
            assert img.format == "PNG"
            assert min(img.size) > 200


def test_generate_keeps_existing_files(tmp_path):
    generate_all(tmp_path)
    target = path_for("granola", tmp_path)
    before = target.stat().st_mtime_ns
    generate_all(tmp_path)
    assert target.stat().st_mtime_ns == before
