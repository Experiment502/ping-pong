"""把 assets/maps/*.png 轉成遊戲用的 assets/maps/hd/*.webp。

執行：python tools/upscale_maps.py
地圖原圖已經是高解析度（每格約 64 像素以上），所以不再放大，只轉成檔案比較小的 WebP。
如果原圖每格少於 40 像素，會自動放大到約 64 像素一格並稍微銳化，免得在手機上太糊。
原本的 PNG 保留著，tools/build_maps.py 用它來切格子；遊戲讀的是 hd 版本。
"""
import os
import re

from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets', 'maps')
DST = os.path.join(SRC, 'hd')
TARGET = 64      # 每格想要的像素數

# 每張地圖寬幾格（跟 tools/build_maps.py 一致）
src_maps = open(os.path.join(ROOT, 'tools', 'build_maps.py'), encoding='utf-8').read()
cols = {}
for img, w in re.findall(r"new\(\d+, '[^']*', '([^']+)', (\d+),", src_maps):
    cols[img] = int(w)

os.makedirs(DST, exist_ok=True)
total = 0
for name in sorted(os.listdir(SRC)):
    if not name.endswith('.png'):
        continue
    im = Image.open(os.path.join(SRC, name)).convert('RGB')
    per_tile = im.width / cols.get(name, 30)
    note = ''
    if per_tile < 40:
        s = TARGET / per_tile
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        im = im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=90, threshold=3))
        note = f'（每格 {per_tile:.0f} 像素太少，放大 {s:.1f} 倍）'
    out = os.path.join(DST, name[:-4] + '.webp')
    im.save(out, 'WEBP', quality=85, method=6)
    size = os.path.getsize(out)
    total += size
    print(f'{name:20s} {im.size}  每格 {im.width / cols.get(name, 30):.0f} 像素  {size // 1024} KB {note}')
print(f'合計 {total // 1024} KB')
