"""把 assets/char_frames/<角色>/ 的原圖整理成遊戲用的圖集。

每個資料夾一個角色，每個姿勢一張圖、洋紅色背景（畫法見 docs/character_prompts.md）：
  走路 12 張：down_stand、down_step1、down_step2、right_*、up_*、left_*
  對戰 12 張（正面、面向玩家）：ready_1～2、move_1～2、fore_1～4、back_1～4
  頭像（可以沒有）：portrait.png；沒有的話用正面站姿代替

執行：python tools/build_chars.py
  走路 → assets/chars.png 和 js/chars.js（地圖上的人）
  對戰 → assets/battle.png、js/battle.js 和 assets/portraits/（球桌對面的對手）
只想看一個角色走路：python tools/build_chars.py --test assets/char_frames/coach
  會產生 test/sprite_test.png 和 test/sprite_test.js，用瀏覽器打開 test/sprite_walk.html 就能看到。
處理方式：從圖片邊緣往內把洋紅背景去掉（有輪廓線擋住的粉紅衣服不會被去掉），
再依角色身高（HEAD_TOP）縮小、用腳底對齊。裝了 scipy 會快很多，沒裝也能跑。
"""
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

try:
    from scipy import ndimage
except ImportError:
    ndimage = None

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FRAMES = os.path.join(ROOT, 'assets', 'char_frames')
OUT_PNG = os.path.join(ROOT, 'assets', 'chars.png')
OUT_JS = os.path.join(ROOT, 'js', 'chars.js')
CW, CH = 72, 104          # 走路圖集裡每一格的大小
PER_ROW = 5               # 走路圖集每一排放幾個角色

# 畫圖時要求的頭頂位置（畫布高度的 %，腳底在 90%），見 docs/character_prompts.md。
# 頭頂越低的人越矮：身高 = (90 - 頭頂) / 70 x 最高的大人
HEAD_TOP = {
    'player_m': 36, 'player_f': 36, 'rival': 36, 'coach': 20, '15_female_referee': 26, 'senior_m': 34,
    'teacher_lin': 20, 'teacher_pe': 20, 'teacher_art': 20, 'director': 20, 'principal': 22, 'mom': 20,
    'grandpa': 24, 'grandma': 26, 'aunt': 20, 'office_m': 20, 'office_w': 20, 'high_m': 22, 'high_f': 22,
    'kid_m': 36, 'kid_f': 36, 'referee_m': 20,
}
WALK_H = 100              # 最高的大人在走路圖集裡多高（一格高 104）
BATTLE_H = 118            # 最高的大人準備姿勢在對戰圖裡多高（遊戲裡 106 像素 = 1.3 公尺）
height = lambda name, top_h: round(top_h * (90 - HEAD_TOP.get(name, 20)) / 70)


def magenta(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (r > 170) & (b > 170) & (np.minimum(r, b) - g > 40)


def label(m):
    """m 裡每一塊連在一起的部分編號（1～n）"""
    if ndimage is not None:
        return ndimage.label(m)
    lab = np.zeros(m.shape, int); n = 0
    for sy, sx in zip(*np.nonzero(m)):
        if lab[sy, sx]: continue
        n += 1; lab[sy, sx] = n; q = deque([(sy, sx)])
        while q:
            y, x = q.popleft()
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < m.shape[0] and 0 <= nx < m.shape[1] and m[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = n; q.append((ny, nx))
    return lab, n


def biggest(m):
    """只留 m 裡最大的一塊"""
    lab, n = label(m)
    if not n: return np.zeros_like(m)
    return lab == 1 + int(np.argmax(np.bincount(lab.ravel(), minlength=n + 1)[1:]))


def outside(bg):
    """bg 裡從邊緣連進來的部分"""
    h, w = bg.shape
    if ndimage is not None:
        lab, _ = ndimage.label(bg)
        ids = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
        return np.isin(lab, ids[ids > 0])
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
    return out


def cutout(cell):
    """從圖片邊緣往內，把連在一起的洋紅背景變透明；只留最大的一塊（角色本身）"""
    keep = biggest(~outside(magenta(cell)))
    if not keep.any():
        return None
    rgba = np.zeros(cell.shape[:2] + (4,), np.uint8)
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


def despill(a, width=6):
    """高解析度原圖的邊緣常混到洋紅背景（例如頭髮尖端偏紫）：離邊緣 width 像素內、偏洋紅的像素去掉。
    粉紅色的鞋子、髮圈紅比藍多很多，不會被當成洋紅（只去掉紅、藍差不多的紫色）"""
    a = a.copy(); al = a[..., 3] > 0
    near = ~al
    for _ in range(width):
        near = near | np.pad(near, 1)[2:, 1:-1] | np.pad(near, 1)[:-2, 1:-1] | np.pad(near, 1)[1:-1, 2:] | np.pad(near, 1)[1:-1, :-2]
    r, g, b = (a[..., i].astype(int) for i in range(3))
    mag = al & near & (np.minimum(r, b) - g > 30) & (np.abs(r - b) < 40) & (g < np.minimum(r, b) * 0.5)
    a[mag, 3] = 0
    return a


def pure_bg(a):
    """幾乎就是背景的純洋紅 #FF00FF（被頭髮包住、沒有連到外面的背景）；粉紅色的髮圈、衣服綠色比較多，不會被當成背景"""
    r, g, b = (a[..., i].astype(int) for i in range(3))
    return (r > 200) & (b > 200) & (g < 60)


def one_figure(path):
    """一張圖只有一個人：去背，頭髮之間被包住的洋紅背景也去掉"""
    f = despill(cutout(np.array(Image.open(path).convert('RGB')).astype(int)))
    f[pure_bg(f), 3] = 0
    return f


def scaled(figs, s_):
    return {k: np.array(Image.fromarray(f).resize((max(1, round(f.shape[1] * s_)), max(1, round(f.shape[0] * s_))), Image.LANCZOS))
            for k, f in figs.items()}


# ======================= 走路 =======================
ORDER = ['down', 'left', 'right', 'up']   # 圖集裡每個角色由上到下的四行
STEPS = ['step1', 'stand', 'step2']        # 每一行由左到右：跨步、站、另一腳跨步


def walk_rows(path, name):
    """一個角色的 4 行 x 3 格（ORDER x STEPS），12 張用同一個比例縮小；沒有 left_* 就用 right_* 翻轉"""
    dirs = ['down', 'right', 'left', 'up']
    if not os.path.exists(os.path.join(path, 'left_stand.png')): dirs.remove('left')
    figs = {(d, f): one_figure(os.path.join(path, f'{d}_{f}.png')) for d in dirs for f in STEPS}
    figs = scaled(figs, height(name, WALK_H) / max(figs[d, 'stand'].shape[0] for d in dirs))
    if 'left' not in dirs:
        figs.update({('left', f): figs['right', f][:, ::-1].copy() for f in STEPS})
    return [[figs[d, f] for f in STEPS] for d in ORDER]


def place(atlas, rows, bx, by):
    """把一個角色的 4 行 x 3 格畫進圖集 (bx, by)：腳底對齊格子底部、左右置中"""
    for r, row in enumerate(rows):
        for c, f in enumerate(row):
            fim = Image.fromarray(f)
            if fim.width > CW or fim.height > CH:   # 太大就等比例縮小
                s_ = min(CW / fim.width, CH / fim.height)
                fim = fim.resize((max(1, int(fim.width * s_)), max(1, int(fim.height * s_))), Image.LANCZOS)
            atlas.alpha_composite(fim, (bx + c * CW + (CW - fim.width) // 2, by + r * CH + CH - fim.height))
    return {d: r for r, d in enumerate(ORDER)}


# 測試模式：只做一個角色，放到 test/，不動遊戲的圖集
if len(sys.argv) > 2 and sys.argv[1] == '--test':
    path = sys.argv[2].rstrip('/')
    name = os.path.basename(path)
    sheet = Image.new('RGBA', (3 * CW, 4 * CH), (0, 0, 0, 0))
    dirs = place(sheet, walk_rows(path, name), 0, 0)
    out = os.path.join(ROOT, 'test')
    sheet.save(os.path.join(out, 'sprite_test.png'))
    open(os.path.join(out, 'sprite_test.js'), 'w', encoding='utf-8', newline='\n').write(
        "'use strict';\n// 由 tools/build_chars.py --test 產生\n"
        f"const TEST_SHEET = {json.dumps(dict(name=name, x=0, y=0, dirs=dirs))};\n")
    print('寫入', os.path.normpath(os.path.join(out, 'sprite_test.png')), '和 sprite_test.js')
    sys.exit(0)


names = sorted(n for n in os.listdir(FRAMES) if os.path.exists(os.path.join(FRAMES, n, 'down_stand.png')))
atlas = Image.new('RGBA', (PER_ROW * 3 * CW, ((len(names) + PER_ROW - 1) // PER_ROW) * 4 * CH), (0, 0, 0, 0))
meta = {}
for i, name in enumerate(names):
    bx, by = (i % PER_ROW) * 3 * CW, (i // PER_ROW) * 4 * CH
    meta[name] = dict(x=bx, y=by, dirs=place(atlas, walk_rows(os.path.join(FRAMES, name), name), bx, by))
    print('走路', name)
atlas.save(OUT_PNG, optimize=True)
open(OUT_JS, 'w', encoding='utf-8', newline='\n').write(
    "'use strict';\n// 由 tools/build_chars.py 產生：assets/chars.png 裡每個角色的位置\n"
    f"const CHAR_CELL = {{ w: {CW}, h: {CH} }};\n"
    f"const CHAR_SHEETS = {json.dumps(meta, ensure_ascii=False)};\n")
print('寫入', os.path.normpath(OUT_PNG), atlas.size, '和', os.path.normpath(OUT_JS))


# ======================= 對戰 =======================
# 每個動作用哪幾張圖（都是正面）。準備和移動每張重複兩次，晃動才不會太快
BATTLE_ANIMS = {
    'idle': ['ready_1', 'ready_1', 'ready_2', 'ready_2'],
    'moveR': ['move_1', 'move_1', 'move_2', 'move_2'],
    'moveL': ['move_1', 'move_1', 'move_2', 'move_2'],
    'fore': ['fore_1', 'fore_2', 'fore_3', 'fore_4'],
    'back': ['back_1', 'back_2', 'back_3', 'back_4'],
}
# 球拍位置用哪一張算（對手接球時讓這裡對準球）：揮拍用擊球那一張，其他用第一張
BATTLE_PAD = {'fore': 'fore_3', 'back': 'back_3'}
# 直接比賽和海外賽事的對手只分男女：用哪個角色
BATTLE_ALIAS = {'male': 'player_m', 'female': 'player_f'}


def red_paddle(r, g, b):
    return (r > 150) & (g < 90) & (b < 90)


# 球拍顏色：大部分是紅拍；三年級學長藍拍（深藍短褲比較暗，不會算進去）、韓宇黑拍
PADDLE = {
    'senior_m': lambda r, g, b: (b > 140) & (r < 90) & (g < 130),
    'rival': lambda r, g, b: (r < 45) & (g < 45) & (b < 45),
}


def paddle(a, name):
    """球拍：球拍顏色、在身高 20%～70% 之間（頭髮在上面、鞋子在下面）的色塊裡，挑最大的一塊；
    太高或太寬（超過身高 1/5）的是衣服、褲子，不算。回傳那一塊的範圍，找不到就全部是 False"""
    H = a.shape[0]
    r_, g_, b_ = (a[..., i].astype(int) for i in range(3))
    m = (a[..., 3] > 0) & PADDLE.get(name, red_paddle)(r_, g_, b_)
    m[:int(H * 0.2)] = False; m[int(H * 0.7):] = False
    lab, n = label(m)
    best, best_n = None, 0
    for i, sl in enumerate(ndimage.find_objects(lab) if ndimage is not None else
                           [tuple(slice(v.min(), v.max() + 1) for v in np.nonzero(lab == k)) for k in range(1, n + 1)]):
        if sl is None or sl[0].stop - sl[0].start > H / 5 or sl[1].stop - sl[1].start > H / 5: continue
        c = int((lab[sl] == i + 1).sum())
        if c > best_n: best, best_n = i + 1, c
    return lab == best if best else np.zeros_like(m)


def paddle_x(a, name):
    """球拍中心的 x；找不到就回傳 None"""
    m = paddle(a, name)
    return float(np.nonzero(m)[1].mean()) if m.any() else None


figs = {}
for name in names:
    path = os.path.join(FRAMES, name)
    if not all(os.path.exists(os.path.join(path, n + '.png')) for v in BATTLE_ANIMS.values() for n in v):
        print('沒有對戰姿勢，跳過', name)
        continue
    raw = {n: one_figure(os.path.join(path, n + '.png')) for n in sorted({n for v in BATTLE_ANIMS.values() for n in v})}
    figs[name] = scaled(raw, height(name, BATTLE_H) / raw['ready_1'].shape[0])
    print('對戰', name)
# 每個人一行：每張圖 x, y, w, h, 身體中心 x（遊戲裡叫「腳的中心」，站的位置對齊這裡）
PADX = 2
width = max(sum(f.shape[1] + PADX for f in fs.values()) for fs in figs.values()) + PADX
sheet = Image.new('RGBA', (width, sum(max(f.shape[0] for f in fs.values()) + PADX for fs in figs.values()) + PADX), (0, 0, 0, 0))
spr, pad, y = {}, {}, PADX
for name, fs in figs.items():
    x, cells, pads = PADX, {}, {}
    for n, f in fs.items():
        al = f[..., 3] > 0
        # 身體中心：用頭（上面 10%～40%）的左右中心，走路抬腳、球拍伸出去都不會讓它偏掉（球拍不算）
        band = (al & ~paddle(f, name))[int(f.shape[0] * 0.1):int(f.shape[0] * 0.4)]
        foot = float(np.nonzero(band)[1].mean())
        sheet.alpha_composite(Image.fromarray(f), (x, y))
        cells[n] = [x, y, f.shape[1], f.shape[0], round(foot, 1)]
        px = paddle_x(f, name)
        if px is None: print('  找不到球拍', name, n)
        pads[n] = round(px - foot, 1) if px is not None else 0
        x += f.shape[1] + PADX
    y += max(f.shape[0] for f in fs.values()) + PADX
    spr[name] = {a_: [cells[n] for n in ns] for a_, ns in BATTLE_ANIMS.items()}
    pad[name] = {a_: pads[BATTLE_PAD.get(a_, ns[0])] for a_, ns in BATTLE_ANIMS.items()}
sheet.save(os.path.join(ROOT, 'assets', 'battle.png'), optimize=True)
# 頭像：資料夾裡有 portrait.png 就用它，沒有就用正面站姿；去背、縮成 300 像素高，存到 assets/portraits/<資料夾>.png
portraits = {}
for name in figs:
    src_ = os.path.join(FRAMES, name, 'portrait.png')
    f = one_figure(src_ if os.path.exists(src_) else os.path.join(FRAMES, name, 'down_stand.png')); s_ = 300 / f.shape[0]
    out = os.path.join(ROOT, 'assets', 'portraits', name + '.png')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    Image.fromarray(f).resize((round(f.shape[1] * s_), 300), Image.LANCZOS).save(out, optimize=True)
    portraits[name] = 'assets/portraits/' + name + '.png'
for k, v in BATTLE_ALIAS.items():
    spr[k], pad[k], portraits[k] = spr[v], pad[v], portraits[v]
open(os.path.join(ROOT, 'js', 'battle.js'), 'w', encoding='utf-8', newline='\n').write(
    "'use strict';\n// 由 tools/build_chars.py 產生：對戰模式的對手（assets/battle.png）\n"
    "// spr：每個角色每個動作的格子 [x, y, w, h, 身體中心 x]；pad：球拍在身體中心左右幾像素；portrait：對手的頭像\n"
    "// male、female 是直接比賽和海外賽事的對手，跟主角用同一套圖\n"
    f"const BATTLE = {json.dumps(dict(img='assets/battle.png', spr=spr, pad=pad, portrait=portraits))};\n")
print('寫入 assets/battle.png', sheet.size, '和 js/battle.js')
