"""把 assets/15_character_sprite_sheets 的走路圖整理成 assets/chars.png 和 js/chars.js。

執行：python tools/build_chars.py [預覽圖路徑]
每張原圖是 4 行 x 3 格、洋紅色背景：第 1 行朝下、最後一行朝上，中間兩行是側面（方向不一定，見 SIDES）。
處理方式：從每一格的邊緣往內把洋紅背景去掉（有輪廓線擋住的粉紅衣服不會被去掉），
再用腳底對齊，排進一張圖集。
"""
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets', '15_character_sprite_sheets')
OUT_PNG = os.path.join(ROOT, 'assets', 'chars.png')
OUT_JS = os.path.join(ROOT, 'js', 'chars.js')
CW, CH = 72, 104          # 圖集裡每一格的大小（原圖像素）
PER_ROW = 5               # 圖集每一排放幾個角色

KEYS = {
    '01_protagonist_male': 'player_m', '02_protagonist_female': 'player_f', '03_male_teacher': 'man',
    '04_female_teacher': 'woman_teacher', '05_school_director': 'director', '06_principal': 'principal',
    '07_mother': 'woman', '08_little_boy': 'boy', '09_little_girl': 'girl', '10_male_student': 'student_m',
    '11_female_student': 'student_f', '12_grandfather': 'grandpa', '13_grandmother': 'grandma',
    '14_male_referee': 'tt_m', '15_female_referee': 'tt_f',
}


def magenta(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (r > 170) & (b > 170) & (np.minimum(r, b) - g > 40)


def cutout(cell):
    """從格子邊緣往內，把連在一起的洋紅背景變透明；只留最大的一塊（角色本身）"""
    h, w = cell.shape[:2]
    bg = magenta(cell)
    out = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bg[y, x]: out[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bg[y, x] and not out[y, x]: out[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and bg[ny, nx] and not out[ny, nx]:
                out[ny, nx] = True; q.append((ny, nx))
    solid = ~out
    # 只留最大的一塊
    lab = np.zeros((h, w), int); sizes = {}; n = 0
    for sy in range(h):
        for sx in range(w):
            if solid[sy, sx] and not lab[sy, sx]:
                n += 1; lab[sy, sx] = n; q.append((sy, sx)); c = 0
                while q:
                    y, x = q.popleft(); c += 1
                    for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                        if 0 <= ny < h and 0 <= nx < w and solid[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = n; q.append((ny, nx))
                sizes[n] = c
    if not sizes:
        return None
    keep = lab == max(sizes, key=sizes.get)
    rgba = np.zeros((h, w, 4), np.uint8)
    rgba[..., :3] = cell
    rgba[..., 3] = np.where(keep, 255, 0)
    # 邊緣去掉洋紅色的反光
    edge = keep & ~np.pad(keep, 1)[2:, 1:-1] | keep & ~np.pad(keep, 1)[:-2, 1:-1] | \
        keep & ~np.pad(keep, 1)[1:-1, 2:] | keep & ~np.pad(keep, 1)[1:-1, :-2]
    r, g, b = cell[..., 0].astype(int), cell[..., 1].astype(int), cell[..., 2].astype(int)
    pink = edge & (np.minimum(r, b) - g > 15)
    rgba[pink, 0] = np.clip(g[pink] + (r[pink] - g[pink]) * 0.35, 0, 255)
    rgba[pink, 2] = np.clip(g[pink] + (b[pink] - g[pink]) * 0.35, 0, 255)
    ys, xs = np.nonzero(keep)
    return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


# 原圖側面那兩行的方向不太一致，所以每個角色指定：右邊用哪一行、要不要左右翻轉；左邊同樣
# (行號, 是否翻轉)；行號 0 是朝下那一行
R, L = lambda r: (r, False), lambda r: (r, True)
SIDES = {
    'player_m': (L(2), R(2)), 'player_f': (R(1), L(1)), 'man': (R(1), L(1)), 'woman_teacher': (R(1), R(2)),
    'director': (R(1), R(2)), 'principal': (L(2), R(2)), 'woman': (R(1), R(2)), 'boy': (R(1), L(1)),
    'girl': (R(1), L(1)), 'student_m': (R(1), R(2)), 'student_f': (R(1), L(1)), 'grandpa': (R(1), L(1)),
    'grandma': (R(1), L(1)), 'tt_m': (L(1), R(1)), 'tt_f': (L(1), R(1)),
}
UP_ROW = {'tt_f': 0}
# 走路第 1 格跟其他格長得不一樣的，改用第 3 格左右翻轉代替（方向：要修的那幾行）
MIRROR_STEP = {'player_f': ['down']}
# 直接指定某個方向的三格要用原圖的哪幾格：(行, 格, 是否翻轉)；順序是 跨步、站、另一腳跨步
# 男主角朝左那一行每格都多畫了一隻手，所以兩個側面都用朝右那一行的第 2、3 格
FRAMES = {
    'player_m': {
        'right': [(1, 2, False), (1, 1, False), (1, 2, False)],
        'left': [(1, 2, True), (1, 1, True), (1, 2, True)],
    },
}   # 女選手的圖沒有背面，往上走時先用正面
ORDER = ['down', 'left', 'right', 'up']
# 原圖的側面走路每一格都是「前面那隻手往前擺」，走起來只有一隻手在動。
# 所以側面的第 3 格把上半身（手臂那一段）左右翻轉：前後手互換，跟第 1 格交替就像雙手在擺。
# 拿球拍的角色不做，不然球拍會在兩隻手之間換來換去。
NO_ARM_SWING = set(KEYS.values())   # 目前全部關掉：翻轉手臂做出來的格子看起來不自然
# 正面、背面原圖三格幾乎一樣的角色：用站姿做出兩個跨步格（左右腳輪流抬起、手反方向擺）
SYNTH_FRONT_WALK = {'player_m': ['down', 'up'], 'player_f': ['down']}
# 原圖沒有背面的角色：借別人的背面換顏色。(借誰, 色相要轉幾度)
BORROW_BACK = {'player_f': ('player_m', 140)}


def shift_region(a, y0, y1, x0, x1, dy):
    """把 a[y0:y1, x0:x1] 這一塊上下移動 dy 像素（空出來的地方變透明）"""
    blk = a[y0:y1, x0:x1].copy()
    a[y0:y1, x0:x1] = 0
    t0, t1 = max(0, y0 + dy), min(a.shape[0], y1 + dy)
    a[t0:t1, x0:x1] = np.where(blk[t0 - y0 - dy:t1 - y0 - dy, :, 3:4] > 0, blk[t0 - y0 - dy:t1 - y0 - dy], a[t0:t1, x0:x1])


def front_steps(stand):
    """正面或背面的站姿 → 兩個跨步格"""
    al = stand[..., 3] > 0
    ys = np.nonzero(al.any(axis=1))[0]
    top, bot = ys.min(), ys.max()
    h = bot - top + 1
    xs = np.nonzero(al.any(axis=0))[0]
    cx = (xs.min() + xs.max()) // 2
    wid = xs.max() - xs.min()
    leg0 = top + int(h * 0.80)
    arm0, arm1 = top + int(h * 0.50), top + int(h * 0.80)
    arm_l, arm_r = xs.min() + int(wid * 0.22), xs.max() - int(wid * 0.22)
    out = []
    for side in (0, 1):
        a = stand.copy()
        lx0, lx1 = (0, cx) if side == 0 else (cx, a.shape[1])
        shift_region(a, leg0, bot + 1, lx0, lx1, -5)                  # 抬起一隻腳
        ax0, ax1 = (0, arm_l) if side == 0 else (arm_r + 1, a.shape[1])
        bx0, bx1 = (arm_r + 1, a.shape[1]) if side == 0 else (0, arm_l)
        shift_region(a, arm0, arm1, ax0, ax1, 3)                      # 同一邊的手往後（往下）
        shift_region(a, arm0, arm1, bx0, bx1, -3)                     # 另一邊的手往前（往上）
        out.append(a)
    return out


def hue_shift(a, deg):
    """把藍色系的衣服、鞋子轉成別的顏色（皮膚、頭髮、黑色不動）"""
    import colorsys
    a = a.copy()
    r, g, b = a[..., 0] / 255.0, a[..., 1] / 255.0, a[..., 2] / 255.0
    blue = (a[..., 3] > 0) & (b > r + 0.08) & (b > g)
    for y, x in zip(*np.nonzero(blue)):
        hh, ll, ss = colorsys.rgb_to_hls(r[y, x], g[y, x], b[y, x])
        rr, gg, bb = colorsys.hls_to_rgb((hh + deg / 360.0) % 1, ll, ss)
        a[y, x, :3] = (int(rr * 255), int(gg * 255), int(bb * 255))
    return a


# 側面：原圖的「站姿」其實是跨大步，停下來像定格在走路中途，手也只有一隻在動。
# 所以主角側面改成：跨步（原圖站姿那格）→ 雙腳併攏（程式做出來）→ 跨步，手臂保持自然下垂。
SIDE_PASS_WALK = {'player_m', 'player_f'}


def legs_together(a, front_right, k=0.7):
    """跨步的姿勢 → 雙腳併攏（兩隻腳往中間靠，前腳畫在上面）"""
    a = a.copy()
    al = a[..., 3] > 0
    ys = np.nonzero(al.any(axis=1))[0]
    top, bot = ys.min(), ys.max()
    y0 = top + int((bot - top + 1) * 0.80)
    cols = al[bot - 6:bot + 1].any(axis=0)                 # 用腳底那幾行找兩隻腳
    xs = np.nonzero(cols)[0]
    gaps = [x for x in range(xs.min(), xs.max()) if not cols[x]]
    split = (gaps[0] + gaps[-1]) // 2 if gaps else (xs.min() + xs.max()) // 2
    lw, rw = np.nonzero(cols[:split])[0], np.nonzero(cols[split:])[0] + split
    if not len(lw) or not len(rw):
        return a
    d = int(round((rw.mean() - lw.mean()) * k / 2))
    band = a[y0:bot + 1].copy()
    a[y0:bot + 1] = 0
    left, right = band.copy(), band.copy()
    left[:, split:] = 0
    right[:, :split] = 0
    left, right = np.roll(left, d, axis=1), np.roll(right, -d, axis=1)
    for part in ((left, right) if front_right else (right, left)):
        m = part[..., 3] > 0
        a[y0:bot + 1][m] = part[m]
    return a


BUILT = {}   # 已經處理好的角色：key → {方向: [3 格]}


def swap_arms(a):
    a = a.copy()
    al = a[..., 3] > 0
    ys = np.nonzero(al.any(axis=1))[0]
    top, bot = ys.min(), ys.max()
    h = bot - top
    y0, y1 = top + int(h * 0.51), top + int(h * 0.78)    # 脖子下面到腰
    xs = np.nonzero(al[y0:y0 + 4])[1]                    # 用肩膀那幾行找身體中心
    c = (xs.min() + xs.max()) / 2
    band = a[y0:y1].copy()
    new = np.zeros_like(band)
    for x in range(a.shape[1]):
        nx = int(round(2 * c - x))
        if 0 <= nx < a.shape[1]:
            new[:, nx] = band[:, x]
    a[y0:y1] = new
    return a   # 圖集裡每個角色的四行


names = sorted(f[:-4] for f in os.listdir(SRC) if f.endswith('.png'))
atlas = Image.new('RGBA', (PER_ROW * 3 * CW, ((len(names) + PER_ROW - 1) // PER_ROW) * 4 * CH), (0, 0, 0, 0))
meta = {}
for i, name in enumerate(names):
    im = np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGB')).astype(int)
    H, W = im.shape[:2]
    rows = []
    for r in range(4):
        row = []
        for c in range(3):
            cell = im[round(r * H / 4):round((r + 1) * H / 4), round(c * W / 3):round((c + 1) * W / 3)]
            row.append(cutout(cell))
        rows.append(row)
    key = KEYS.get(name, name)
    right, left = SIDES[key]
    src = {'down': (0, False), 'left': left, 'right': right, 'up': (UP_ROW.get(key, 3), False)}
    bx, by = (i % PER_ROW) * 3 * CW, (i // PER_ROW) * 4 * CH
    dirs = {}
    for r, d in enumerate(ORDER):
        dirs[d] = r
        row, flip = src[d]
        frames = list(rows[row])
        if d in MIRROR_STEP.get(key, []) and frames[2] is not None:
            frames[0] = frames[2][:, ::-1].copy()
        if d in FRAMES.get(key, {}):
            frames = [rows[r_][c_][:, ::-1].copy() if f_ else rows[r_][c_] for r_, c_, f_ in FRAMES[key][d]]
            flip = False
        if d in SYNTH_FRONT_WALK.get(key, []) and frames[1] is not None:
            frames = [None, frames[1], None]
            frames[0], frames[2] = front_steps(frames[1])
        if d == 'up' and key in BORROW_BACK and BORROW_BACK[key][0] in BUILT:
            src_key, deg = BORROW_BACK[key]
            frames = [hue_shift(f, deg) for f in BUILT[src_key]['up']]
            flip = False
        BUILT.setdefault(key, {})[d] = [f if not flip else f[:, ::-1].copy() for f in frames]
        if d in ('left', 'right') and key in SIDE_PASS_WALK and frames[1] is not None:
            faces_right = (d == 'right') != flip            # 還沒翻轉的圖是朝哪邊
            frames = [frames[1], legs_together(frames[1], faces_right), frames[1]]
        elif d in ('left', 'right') and key not in NO_ARM_SWING:
            frames[2] = swap_arms(frames[2] if frames[2] is not None else frames[0])   # 腳步保留第 3 格自己的
        for c in range(3):
            f = frames[c]
            if f is None: continue
            fim = Image.fromarray(f)
            if flip: fim = fim.transpose(Image.FLIP_LEFT_RIGHT)
            if fim.width > CW or fim.height > CH:   # 太大就等比例縮小
                s_ = min(CW / fim.width, CH / fim.height)
                fim = fim.resize((max(1, int(fim.width * s_)), max(1, int(fim.height * s_))), Image.LANCZOS)
            # 腳底對齊格子底部、左右置中
            atlas.alpha_composite(fim, (bx + c * CW + (CW - fim.width) // 2, by + r * CH + CH - fim.height))
    meta[key] = dict(x=bx, y=by, dirs=dirs)
    print(f'{name:24s} → {key}')

atlas.save(OUT_PNG, optimize=True)
js = ("'use strict';\n// 由 tools/build_chars.py 產生：assets/chars.png 裡每個角色的位置\n"
      f"const CHAR_CELL = {{ w: {CW}, h: {CH} }};\n"
      f"const CHAR_SHEETS = {json.dumps(meta, ensure_ascii=False)};\n")
open(OUT_JS, 'w', encoding='utf-8', newline='\n').write(js)
print('寫入', os.path.normpath(OUT_PNG), atlas.size, '和', os.path.normpath(OUT_JS))
if len(sys.argv) > 1:
    bg = Image.new('RGBA', atlas.size, (90, 140, 90, 255))
    for y in range(0, atlas.height, 16):
        for x in range(0, atlas.width, 16):
            if (x // 16 + y // 16) % 2: bg.paste((110, 160, 110, 255), (x, y, x + 16, y + 16))
    Image.alpha_composite(bg, atlas).save(sys.argv[1])
