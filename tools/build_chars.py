"""把 assets/15_character_sprite_sheets 的走路圖整理成 assets/chars.png 和 js/chars.js。

執行：python tools/build_chars.py [預覽圖路徑]
另一種原圖是 assets/char_turnarounds 的「三視圖」：一排 3 個人（正面站、朝右跨步、背面站），
或 4 個人（正面站、朝右站、朝右跨步、背面站），其餘的格子由程式做出來（見 TURN_H）。
列在 TURN_USE 的角色才會在遊戲裡改用三視圖；還在試的先用測試模式看看：
    python tools/build_chars.py --test assets/char_turnarounds/15_female_referee.png
會產生 test/sprite_test.png 和 test/sprite_test.js，用瀏覽器打開 test/sprite_walk.html 就能看到走路的樣子。
第三種是 assets/char_frames/<原圖檔名>/ 資料夾：每個姿勢一張圖（down_stand、down_step1、down_step2、
right_*、up_*、left_*，共 12 張；沒有 left_* 就用 right_* 翻轉），測試模式一樣可以用：
    python tools/build_chars.py --test assets/char_frames/15_female_referee
對戰模式的對手（面向玩家）也用這些資料夾，見 BATTLE：
    python tools/build_chars.py --battle
會產生 assets/battle.png 和 js/battle.js。
每張原圖是 4 行 x 3 格、洋紅色背景：第 1 行朝下、最後一行朝上，中間兩行是側面（方向不一定，見 SIDES）。
處理方式：從每一格的邊緣往內把洋紅背景去掉（有輪廓線擋住的粉紅衣服不會被去掉），
再用腳底對齊，排進一張圖集。
"""
import json
import math
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets', '15_character_sprite_sheets')
TURN = os.path.join(ROOT, 'assets', 'char_turnarounds')
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
UP_ROW = {}
# 三格沒有平均排的行：直接指定切開的 x 座標（原圖像素），不然會切到頭髮
CUT_X = {'15_female_referee': {3: [0, 68, 116, 186]}}
# 三視圖的角色：做好之後身高幾像素（圖集一格高 104；主角約 91、大人約 88、小學生約 76）
TURN_H = {'15_female_referee': 88}
TURN_USE = set()   # 遊戲裡改用三視圖的角色（原圖檔名）
# 走路第 1 格跟其他格長得不一樣的，改用第 3 格左右翻轉代替（方向：要修的那幾行）
MIRROR_STEP = {'player_f': ['down']}
# 直接指定某個方向的三格要用原圖的哪幾格：(行, 格, 是否翻轉)；順序是 跨步、站、另一腳跨步
# 男主角朝左那一行每格都多畫了一隻手，所以兩個側面都用朝右那一行的第 2、3 格
FRAMES = {
    'player_m': {
        'right': [(1, 2, False), (1, 1, False), (1, 2, False)],
        'left': [(1, 2, True), (1, 1, True), (1, 2, True)],
    },
    # 女裁判（桌球社學姊）原圖只有最後一行是綁馬尾的女生，前三行畫成男生的刺刺頭；她不會走路，四個方向都用那一行
    'tt_f': {d: [(3, 0, False), (3, 1, False), (3, 2, False)] for d in ('down', 'left', 'right', 'up')},
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


def hip_row(a):
    """腿的上緣：從腳底往上，兩隻腳之間還有空隙的列都算腿"""
    al = a[..., 3] > 0
    ys = np.nonzero(al.any(axis=1))[0]
    top, bot = ys.min(), ys.max()
    y = bot
    while y > top + (bot - top) // 2:
        xs = np.nonzero(al[y])[0]
        if not len(xs):
            break
        runs = 1 + int(np.sum(np.diff(xs) > 1))
        if runs < 2:
            break
        y -= 1
    if y + 1 > bot - 4:                                   # 兩腳貼在一起（例如背面）：用身高比例
        return top + int((bot - top) * 0.84), bot
    return y + 1, bot


def feet_split(a, bot):
    al = a[..., 3] > 0
    cols = al[bot - 6:bot + 1].any(axis=0); xs = np.nonzero(cols)[0]
    gaps = [x for x in range(xs.min(), xs.max()) if not cols[x]]
    split = (gaps[0] + gaps[-1]) // 2 if gaps else (xs.min() + xs.max()) // 2
    lw, rw = np.nonzero(cols[:split])[0], np.nonzero(cols[split:])[0] + split
    return split, lw, rw

def shift1d(row, d):
    """一列像素左右移動 d 格，超出邊界的丟掉（不繞回另一邊）"""
    out = np.zeros_like(row)
    if d > 0: out[d:] = row[:-d]
    elif d < 0: out[:d] = row[-d:]
    else: out[:] = row
    return out


def legs_together(a, front_right, k=0.75):
    """兩隻腳往中間靠：短褲下緣不動，越靠近腳底靠得越多（輪廓不會斷）"""
    a = a.copy(); y0, bot = hip_row(a)
    split, lw, rw = feet_split(a, bot)
    if not len(lw) or not len(rw): return a
    D = (rw.mean() - lw.mean()) * k / 2
    band = a[y0:bot + 1].copy(); a[y0:bot + 1] = 0
    n = bot + 1 - y0
    for i in range(n):
        d = int(round(D * min(1.0, (i + 1) / 3)))         # 短褲下緣往下 3 列就整隻腳一起平移，鞋子不變形
        row = band[i]; L = row.copy(); L[split:] = 0; R = row.copy(); R[:split] = 0
        L = shift1d(L, d); R = shift1d(R, -d)
        out = a[y0 + i]
        for part in ((L, R) if front_right else (R, L)):
            m = part[:, 3] > 0; out[m] = part[m]
    return a

def lift_leg(a, left, lift):
    """抬起一隻腳：那隻腿從短褲下緣往下壓短 lift 像素（大腿根部不動）"""
    a = a.copy(); y0, bot = hip_row(a)
    split, lw, rw = feet_split(a, bot)
    x0, x1 = (0, split) if left else (split, a.shape[1])
    seg = a[y0:bot + 1, x0:x1].copy(); n = seg.shape[0]; m = n - lift
    a[y0:bot + 1, x0:x1] = 0
    for i in range(m):
        a[y0 + i, x0:x1] = seg[min(n - 1, int(i * n / m))]
    return a


def front_steps(stand):
    """正面或背面的站姿 → 兩個跨步格（左右腳輪流抬起，大腿根部不動，輪廓不會斷）"""
    return lift_leg(stand, True, 6), lift_leg(stand, False, 6)


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


def runs(row):
    """一列裡連續有顏色的段落：[(起, 迄), ...]"""
    xs = np.nonzero(row)[0]
    if not len(xs): return []
    out, s0 = [], xs[0]
    for a_, b_ in zip(xs, xs[1:]):
        if b_ - a_ > 1: out.append((s0, a_)); s0 = b_
    out.append((s0, xs[-1]))
    return out


def biggest(m):
    """只留 m 裡最大的一塊"""
    lab = np.zeros(m.shape, int); best, bn, n = 0, 0, 0
    for sy, sx in zip(*np.nonzero(m)):
        if lab[sy, sx]: continue
        n += 1; lab[sy, sx] = n; q = deque([(sy, sx)]); c = 0
        while q:
            y, x = q.popleft(); c += 1
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < m.shape[0] and 0 <= nx < m.shape[1] and m[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = n; q.append((ny, nx))
        if c > best: best, bn = c, n
    return lab == bn if bn else np.zeros_like(m)


def side_stand(a, shoe=0.11):
    """側面跨步 → 雙腳併攏站好：兩條腿各自繞著胯下轉成直立，鞋子平移到新的腳踝（保持水平）。
    垂在腿旁邊的紅色球拍不算腿，留在原位。用原圖解析度做，做完再縮小"""
    al = a[..., 3] > 0; H, W = al.shape
    ys = np.nonzero(al.any(axis=1))[0]; top, bot = ys.min(), ys.max()
    sh0 = bot - int((bot - top) * shoe)                         # 鞋子從這一列開始
    cols = al[sh0:bot + 1].any(axis=0); xs = np.nonzero(cols)[0]
    gaps = [x for x in range(xs.min(), xs.max()) if not cols[x]]
    if not gaps: return a                                       # 兩隻鞋子沒分開：本來就是站姿
    c = (gaps[0] + gaps[-1]) // 2                               # 兩隻鞋子中間
    y0 = bot
    while y0 > top and not al[y0, c]: y0 -= 1
    y0 += 1                                                     # 胯下：從這一列開始兩條腿分開
    r_, g_, b_ = (a[..., i].astype(int) for i in range(3))
    red = al & (r_ > 140) & (g_ < 110) & (b_ < 110)
    red[:y0 - (bot - top) // 8] = False; red[sh0:] = False
    held = biggest(red)
    for _ in range(4):                                          # 連球拍的深色外框一起
        held = held | (al & (np.pad(held, 1)[2:, 1:-1] | np.pad(held, 1)[:-2, 1:-1] | np.pad(held, 1)[1:-1, 2:] | np.pad(held, 1)[1:-1, :-2]))
    held[sh0:] = False
    leg_m = al & ~held
    legs = [np.zeros_like(a), np.zeros_like(a)]
    for y in range(y0, sh0):
        for x0, x1 in runs(leg_m[y]):
            seg = legs[0 if (x0 + x1) / 2 < c else 1][y, x0:x1 + 1]
            m_ = leg_m[y, x0:x1 + 1]; seg[m_] = a[y, x0:x1 + 1][m_]
    out = a.copy(); out[y0:bot + 1] = 0
    for i, leg in enumerate(legs):
        m_ = leg[..., 3] > 0
        if not m_[y0].any() or not m_[sh0 - 1].any(): return a
        hx, hy = np.nonzero(m_[y0])[0].mean(), y0               # 髖部（轉軸）
        ax, ay = np.nonzero(m_[sh0 - 1])[0].mean(), sh0 - 1     # 腳踝
        ang = math.degrees(math.atan2(ax - hx, ay - hy))
        rot = np.array(Image.fromarray(leg.astype(np.uint8)).rotate(-ang, center=(hx, hy), resample=Image.NEAREST))
        dx, dy = int(round(hx - ax)), int(round(hy + math.hypot(ax - hx, ay - hy) - ay))
        shoe_ = np.zeros_like(a)
        x0, x1 = (0, c) if i == 0 else (c, W)
        shoe_[sh0:bot + 1, x0:x1] = a[sh0:bot + 1, x0:x1]
        moved = np.zeros_like(a)
        moved[max(0, dy):min(H, H + dy), max(0, dx):min(W, W + dx)] = \
            shoe_[max(0, -dy):min(H, H - dy), max(0, -dx):min(W, W - dx)]
        for lay in (rot, moved):
            mm = lay[..., 3] > 0; out[mm] = lay[mm]
    out[held] = a[held]
    return out


def split_figures(im):
    """一排人物 → 每個人各自的範圍（用整欄都是洋紅背景的空隙切開）"""
    cols = (~magenta(im)).sum(axis=0) > im.shape[0] * 0.01
    runs, x = [], 0
    while x < len(cols):
        if cols[x]:
            x0 = x
            while x < len(cols) and cols[x]: x += 1
            if x - x0 > im.shape[1] * 0.03: runs.append((x0, x))
        x += 1
    gaps = [0] + [(runs[i][1] + runs[i + 1][0]) // 2 for i in range(len(runs) - 1)] + [im.shape[1]]
    return [im[:, gaps[i]:gaps[i + 1]] for i in range(len(runs))]


def turnaround(path, name, key):
    """三視圖 → 跟 4 行 x 3 格原圖一樣的 rows：正面、背面用站姿做走路；左邊用右邊翻轉。
    3 個人：側面只有跨步一格，站姿用 side_stand() 做出來
    4 個人：側面是 跨步、站、跨步"""
    im = np.array(Image.open(path).convert('RGB')).astype(int)
    figs = [despill(cutout(c)) for c in split_figures(im)]
    assert len(figs) in (3, 4), f'{path}：找到 {len(figs)} 個人，要 3 或 4 個'
    for f in figs:   # 頭髮之間被包住的洋紅背景（沒有連到外面，cutout 去不掉）
        f[pure_bg(f), 3] = 0
    if len(figs) == 3:
        figs.insert(1, side_stand(figs[1]))
    s_ = TURN_H.get(name, 86) / max(f.shape[0] for f in figs)       # 所有人用同一個比例縮小
    figs = [np.array(Image.fromarray(f).resize((max(1, round(f.shape[1] * s_)), max(1, round(f.shape[0] * s_))), Image.LANCZOS))
            for f in figs]
    front, stand, walk, back = figs
    for d_ in (FRAMES, MIRROR_STEP, UP_ROW, BORROW_BACK):   # 這些是給舊原圖用的特別處理，三視圖不用
        d_.pop(key, None)
    SIDE_PASS_WALK.discard(key)
    SIDES[key] = (R(1), L(1))
    SYNTH_FRONT_WALK[key] = ['down', 'up']
    side = [walk, stand, walk]
    return [[front] * 3, side, side, [back] * 3]


def pure_bg(a):
    """幾乎就是背景的純洋紅 #FF00FF（被頭髮包住、沒有連到外面的背景）；粉紅色的髮圈、衣服綠色比較多，不會被當成背景"""
    r, g, b = (a[..., i].astype(int) for i in range(3))
    return (r > 200) & (b > 200) & (g < 60)


def one_figure(path):
    """一張圖只有一個人：去背，頭髮之間被包住的洋紅背景也去掉"""
    f = despill(cutout(np.array(Image.open(path).convert('RGB')).astype(int)))
    f[pure_bg(f), 3] = 0
    return f


def frames_dir(path, name, key):
    """每個姿勢一張圖的資料夾 → rows（下、右、左、上；每行 跨步 1、站、跨步 2）。12 張用同一個比例縮小"""
    dirs = ['down', 'right', 'left', 'up']
    if not os.path.exists(os.path.join(path, 'left_stand.png')): dirs.remove('left')
    figs = {(d, f): one_figure(os.path.join(path, f'{d}_{f}.png')) for d in dirs for f in ('step1', 'stand', 'step2')}
    s_ = TURN_H.get(name, 86) / max(figs[d, 'stand'].shape[0] for d in dirs)
    figs = {k: np.array(Image.fromarray(f).resize((max(1, round(f.shape[1] * s_)), max(1, round(f.shape[0] * s_))), Image.LANCZOS))
            for k, f in figs.items()}
    for d_ in (FRAMES, MIRROR_STEP, UP_ROW, BORROW_BACK, SYNTH_FRONT_WALK):   # 每一格都是畫好的，不用特別處理
        d_.pop(key, None)
    SIDE_PASS_WALK.discard(key)
    SIDES[key] = (R(1), R(2) if 'left' in dirs else L(1))
    rows = [[figs[d, f] for f in ('step1', 'stand', 'step2')] for d in dirs]
    return rows if 'left' in dirs else rows[:2] + [rows[1]] + rows[2:]


def place(atlas, rows, key, bx, by):
    """把一個角色的 4 個方向 x 3 格畫進圖集 (bx, by)，回傳 {方向: 第幾行}"""
    right, left = SIDES[key]
    src = {'down': (0, False), 'left': left, 'right': right, 'up': (UP_ROW.get(key, 3), False)}
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
            frames = [frames[1], legs_together(frames[1], faces_right, 0.6), frames[1]]
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
    return dirs


# 對戰模式的對手：男、女各用哪個資料夾、第一張準備姿勢有多高（原圖像素；遊戲裡 106 像素 = 1.3 公尺）
# 主角（男）還沒有對戰姿勢，男對手也先用學姊
BATTLE = {'male': ('15_female_referee', 108), 'female': ('15_female_referee', 108)}
# 每個動作用哪幾張圖（都是正面）。準備和移動每張重複兩次，晃動才不會太快
BATTLE_ANIMS = {
    'idle': ['ready_1', 'ready_1', 'ready_2', 'ready_2'],
    'moveR': ['move_1', 'move_1', 'move_2', 'move_2'],
    'moveL': ['move_1', 'move_1', 'move_2', 'move_2'],
    'fore': ['fore_1', 'fore_2', 'fore_3', 'fore_4'],
    'back': ['back_1', 'back_2', 'back_3', 'back_4'],
}
# 資料夾裡還沒有對戰姿勢時，先用站姿和走路代替
BATTLE_FALLBACK = {
    'idle': ['down_stand'],
    'moveR': ['down_step1', 'down_stand', 'down_step2', 'down_stand'],
    'moveL': ['down_step1', 'down_stand', 'down_step2', 'down_stand'],
    'fore': ['down_stand'],
    'back': ['down_stand'],
}
# 球拍位置用哪一張算（對手接球時讓這裡對準球）：揮拍用擊球那一張，其他用第一張
BATTLE_PAD = {'fore': 'fore_3', 'back': 'back_3'}


def paddle_x(a):
    """球拍（紅色、在身體下半部最大的一塊）的中心 x；找不到就回傳 None。
    紅色衣服的角色：最大那塊如果是從上半身延伸下來的就是衣服，跳過它找下一塊"""
    al = a[..., 3] > 0
    r_, g_, b_ = (a[..., i].astype(int) for i in range(3))
    red = al & (r_ > 150) & (g_ < 90) & (b_ < 90)
    red[:int(a.shape[0] * 0.25)] = False                      # 揮拍時球拍會舉到胸口，從身高 25% 開始找
    m = biggest(red)
    if m.any() and np.nonzero(m)[0].min() < a.shape[0] * 0.5 and np.nonzero(m)[0].max() > a.shape[0] * 0.5:
        m = biggest(red & ~m)
    return float(np.nonzero(m)[1].mean()) if m.any() else None


if len(sys.argv) > 1 and sys.argv[1] == '--battle':
    figs, pad, anims = {}, {}, {}
    for ch, (folder, h) in BATTLE.items():
        path = os.path.join(ROOT, 'assets', 'char_frames', folder)
        full = all(os.path.exists(os.path.join(path, n + '.png')) for v in BATTLE_ANIMS.values() for n in v)
        anims[ch] = BATTLE_ANIMS if full else BATTLE_FALLBACK
        names_ = sorted({n for v in anims[ch].values() for n in v})
        raw = {n: one_figure(os.path.join(path, n + '.png')) for n in names_}
        s_ = h / raw[anims[ch]['idle'][0]].shape[0]            # 全部用同一個比例縮小
        figs[ch] = {n: np.array(Image.fromarray(f).resize((max(1, round(f.shape[1] * s_)), max(1, round(f.shape[0] * s_))), Image.LANCZOS))
                    for n, f in raw.items()}
    # 每個人每張圖排一行：x, y, w, h, 身體中心 x（遊戲裡叫「腳的中心」，站的位置對齊這裡）
    PADX = 2
    uniq = {BATTLE[ch][0]: fs for ch, fs in figs.items()}       # 每個資料夾只排一次
    width = max(sum(f.shape[1] + PADX for f in fs.values()) for fs in uniq.values()) + PADX
    height = sum(max(f.shape[0] for f in fs.values()) + PADX for fs in uniq.values()) + PADX
    sheet = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    spr, y = {}, PADX
    done = {}
    for ch, fs in figs.items():
        if BATTLE[ch][0] in done:                              # 跟前一個人用同一個資料夾：共用同一行
            spr[ch], pad[ch] = done[BATTLE[ch][0]]
            continue
        x, cells = PADX, {}
        for n, f in fs.items():
            al = f[..., 3] > 0
            # 身體中心：用頭（上面 10%～40%）的左右中心，走路抬腳、球拍伸出去都不會讓它偏掉（紅色的球拍不算）
            r_, g_, b_ = (f[..., i].astype(int) for i in range(3))
            band = (al & ~((r_ > 150) & (g_ < 90) & (b_ < 90)))[int(f.shape[0] * 0.1):int(f.shape[0] * 0.4)]
            foot = float(np.nonzero(band)[1].mean())
            sheet.alpha_composite(Image.fromarray(f), (x, y))
            cells[n] = [x, y, f.shape[1], f.shape[0], round(foot, 1)]
            px = paddle_x(f)
            pad.setdefault(ch, {})[n] = round(px - foot, 1) if px is not None else 0
            x += f.shape[1] + PADX
        y += max(f.shape[0] for f in fs.values()) + PADX
        spr[ch] = {a_: [cells[n] for n in ns] for a_, ns in anims[ch].items()}
        pad[ch] = {a_: pad[ch][BATTLE_PAD[a_] if anims[ch] is BATTLE_ANIMS and a_ in BATTLE_PAD else ns[0]]
                   for a_, ns in anims[ch].items()}
        done[BATTLE[ch][0]] = (spr[ch], pad[ch])
    sheet.save(os.path.join(ROOT, 'assets', 'battle.png'), optimize=True)
    # 頭像：資料夾裡有 portrait.png 就去背、縮成 300 像素高，存到 assets/portraits/<資料夾>.png
    portraits = {}
    for ch, (folder, _) in BATTLE.items():
        src_ = os.path.join(ROOT, 'assets', 'char_frames', folder, 'portrait.png')
        if not os.path.exists(src_): continue
        f = one_figure(src_); s_ = 300 / f.shape[0]
        out = os.path.join(ROOT, 'assets', 'portraits', folder + '.png')
        os.makedirs(os.path.dirname(out), exist_ok=True)
        Image.fromarray(f).resize((round(f.shape[1] * s_), 300), Image.LANCZOS).save(out, optimize=True)
        portraits[ch] = 'assets/portraits/' + folder + '.png'
    open(os.path.join(ROOT, 'js', 'battle.js'), 'w', encoding='utf-8', newline='\n').write(
        "'use strict';\n// 由 tools/build_chars.py --battle 產生：對戰模式的對手（assets/battle.png）\n"
        "// spr：每個動作的格子 [x, y, w, h, 身體中心 x]；pad：球拍在身體中心左右幾像素；portrait：對手的頭像\n"
        f"const BATTLE = {json.dumps(dict(img='assets/battle.png', spr=spr, pad=pad, portrait=portraits))};\n")
    print('寫入 assets/battle.png', sheet.size, '和 js/battle.js')
    sys.exit(0)


# 測試模式：只做一個三視圖角色，放到 test/，不動遊戲的圖集
if len(sys.argv) > 2 and sys.argv[1] == '--test':
    path = sys.argv[2]
    path = path.rstrip('/')
    name = os.path.basename(path) if os.path.isdir(path) else os.path.basename(path)[:-4]
    key = KEYS.get(name, name)
    sheet = Image.new('RGBA', (3 * CW, 4 * CH), (0, 0, 0, 0))
    rows = frames_dir(path, name, key) if os.path.isdir(path) else turnaround(path, name, key)
    dirs = place(sheet, rows, key, 0, 0)
    out = os.path.join(ROOT, 'test')
    sheet.save(os.path.join(out, 'sprite_test.png'))
    open(os.path.join(out, 'sprite_test.js'), 'w', encoding='utf-8', newline='\n').write(
        "'use strict';\n// 由 tools/build_chars.py --test 產生\n"
        f"const TEST_SHEET = {json.dumps(dict(name=name, x=0, y=0, dirs=dirs))};\n")
    print('寫入', os.path.normpath(os.path.join(out, 'sprite_test.png')), '和 sprite_test.js')
    sys.exit(0)


names = sorted(f[:-4] for f in os.listdir(SRC) if f.endswith('.png'))
atlas = Image.new('RGBA', (PER_ROW * 3 * CW, ((len(names) + PER_ROW - 1) // PER_ROW) * 4 * CH), (0, 0, 0, 0))
meta = {}
for i, name in enumerate(names):
    im = np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGB')).astype(int)
    H, W = im.shape[:2]
    key = KEYS.get(name, name)
    tpath = os.path.join(TURN, name + '.png')
    rows = turnaround(tpath, name, key) if name in TURN_USE and os.path.exists(tpath) else []
    for r in range(4 if not rows else 0):
        row = []
        xs = CUT_X.get(name, {}).get(r) or [round(c * W / 3) for c in range(4)]
        for c in range(3):
            cell = im[round(r * H / 4):round((r + 1) * H / 4), xs[c]:xs[c + 1]]
            row.append(cutout(cell))
        rows.append(row)
    bx, by = (i % PER_ROW) * 3 * CW, (i // PER_ROW) * 4 * CH
    dirs = place(atlas, rows, key, bx, by)
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
