"""產生 js/maps.js：台灣篇 13 張地圖（背景是 assets/maps/ 裡的圖片）。

執行：python tools/build_maps.py [預覽圖資料夾]
（換了地圖圖片之後，先執行 python tools/upscale_maps.py）
每張地圖用一張圖片當背景，上面切成格子；rows 標出每一格能不能走：
  .  可以走      #  不能走（牆、家具、樹、建築、水）
門口、出口、地墊另外列在 warps；建築的門列在 objects（role='arena' 是體育館，enter 是按 A 進入）。
產生前會檢查：出入口、門、人物旁邊是不是都走得到。
給了預覽圖資料夾的話，會把格子和障礙物疊在圖片上輸出，方便對照。
"""
import json
import os
import sys
from collections import deque

from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'js', 'maps.js')


class Map:
    def __init__(self, mid, name, img, rows, inside=False):
        self.id, self.name, self.img, self.inside = mid, name, img, inside
        self.rows = rows
        self.h, self.w = len(rows), len(rows[0])
        bad = [i for i, r in enumerate(rows) if len(r) != self.w]
        assert not bad, f'{name}: 第 {bad} 列長度不對'
        im = Image.open(os.path.join(ROOT, 'assets', 'maps', img))
        self.iw, self.ih = im.size
        self.tp = self.iw / self.w          # 圖片上每一格有幾個像素
        self.objects, self.trainers, self.npcs, self.warps = [], [], [], []

    def obj(self, kind, x, y, w=1, h=1, **kw):
        o = dict(kind=kind, x=x, y=y, w=w, h=h)
        o.update(kw)
        self.objects.append(o)
        return o

    def warp(self, x, y, to, tx, ty, d):
        self.warps.append(dict(x=x, y=y, to=to, tx=tx, ty=ty, dir=d))

    def trainer(self, tid, x, y, d, name, char, style, strength, rng=4, intro='', after='', req='racket', **kw):
        prize = int(round((40 + 900 * strength ** 1.3) / 10.0) * 10)
        t = dict(id=tid, x=x, y=y, dir=d, name=name, char=char, style=style, str=strength, range=rng,
                 prize=prize, intro=intro, after=after, req=req)
        t.update(kw)
        self.trainers.append(t)

    def npc(self, x, y, d, name, char, lines, role='talk', **kw):
        n = dict(x=x, y=y, dir=d, name=name, char=char, lines=lines, role=role)
        n.update(kw)
        self.npcs.append(n)


M = {}


def grid(w, h, walk, block=None):
    """用「哪些格子可以走」產生 rows：walk = {列: [欄 或 (起, 迄)]}，block 是在可以走的範圍裡再挖掉的格子"""
    g = [['#'] * w for _ in range(h)]
    for spec, ch in ((walk, '.'), (block or {}, '#')):
        for r, items in spec.items():
            for it in items:
                for c in (range(it[0], it[1] + 1) if isinstance(it, tuple) else [it]):
                    g[r][c] = ch
    return [''.join(row) for row in g]


def new(mid, name, img, w, h, walk, block=None, inside=False, cell=1):
    """cell：一格是標準格子的幾倍大。0.5 = 半格（課桌之間只有一格半寬的走道時用），座標和視線範圍都用半格算"""
    m = Map(mid, name, img, grid(w, h, walk, block), inside)
    m.cell = cell
    M[mid] = m
    return m


ROAD = {8: [(0, 29)], 9: [(0, 29)], 10: [(0, 29)], 11: [(0, 29)]}   # 東西向大馬路：第 8、11 列人行道，9、10 列車道
INDOOR_DOOR = {10: [6, 7]}                                           # 室內地圖的門口都在最下面中間

# ======================= 社區和學校（第二版地圖：assets/school_community_rpg_maps，原圖每 20 像素一格） =======================
# 地圖編號：1 社區街道、15 我家二樓、2 我家一樓、3 韓家一樓、16 韓家二樓、17 老奶奶家、18 社區公園、
#          5 校門、9 操場、19 教學樓、7 一樓走廊、20 二樓走廊、6 教室、21 辦公室、8 桌球體育館
STAIRS_1F = {r: [1, 2] for r in range(3, 9)}


def W(*ds):
    """合併好幾個「列 → 可以走的欄」：同一列的欄位會加在一起，不會互相蓋掉"""
    out = {}
    for d in ds:
        for r, items in d.items():
            out.setdefault(r, []).extend(items)
    return out


# ----- 1. 社區街道（紅屋頂：我家，橘屋頂：老奶奶家，藍屋頂：韓家） -----
m = new(1, '社區街道', 'v2_street.png', 29, 12, W({
    6: [4, 5, 12, 20, 21], 7: [4, 5, 12, 20, 21], 8: [(1, 8), (10, 16), (18, 28)],
    9: [(0, 28)], 10: [(0, 28)], 11: [26, 27, 28]}, {r: [26, 27, 28] for r in range(0, 8)}))
m.obj('building', 2, 2, 6, 4, name='我的家')
m.obj('building', 10, 2, 5, 4, name='老奶奶家')
m.obj('building', 18, 2, 5, 4, name='韓家')
m.trainer('n1', 14, 8, 'down', '鄰居小孩 小志', 'male', 'allround', 0.04, rng=2,
          intro='你有球拍了耶！跟我比一場！', after='我回家叫我哥來找你！')
m.npc(27, 3, 'down', '晨跑的阿伯', 'male', ['早安啊！阿伯每天早上都繞社區跑三圈。',
       '打桌球跟跑步一樣，靠的是每天練習。'])
m.npc(7, 8, 'down', '鄰居阿姨', 'female', ['今天是你第一次上桌球課吧？', '往右走過公園，就到學校了。'])

# ----- 15. 我家二樓（主角的房間，故事從這裡開始） -----
m = new(15, '我的房間', 'v2_home_2f.png', 11, 10, W({
    1: [4, 5, 6], 2: [4, 5, 6], 3: [4, 5, 6], 4: [(3, 9)], 5: [3, 8, 9], 6: [3, 8, 9], 7: [3, 8],
    8: [(3, 9)]}, {r: [1, 2] for r in range(4, 9)}), inside=True)
m.obj('bed', 7, 1, 3, 3, text='在床上休息一下……進度已經存檔了！', role='save')
m.obj('desk', 1, 1, 3, 3, text='書桌上放著爸爸比賽的照片。')

# ----- 2. 我家一樓（客廳） -----
m = new(2, '我家客廳', 'v2_home_1f.png', 11, 10, W({
    3: [(4, 8)], 4: [3, 4, 7, 8, 9], 5: [3, 4, 7, 8, 9], 6: [3, 8, 9], 7: [3, 8],
    8: [(3, 9)], 9: [4, 5, 6]}, STAIRS_1F), inside=True)
m.obj('tv', 5, 1, 4, 2, text='廚房裡飄來早餐的香味。')
m.npc(8, 5, 'left', '媽媽', 'female', ['今天是第一次上桌球課，別遲到了！', '往右走過公園，就到學校了。',
                                       '累了就回家休息，媽媽會幫你存檔。'], role='mom')

# ----- 3. 韓家一樓 -----
m = new(3, '韓家', 'v2_rival_1f.png', 12, 10, W({
    3: [(4, 9)], 4: [(3, 9)], 5: [3, 4, 5, 8, 9], 6: [3, 4, 9], 7: [3, 4, 9],
    8: [(3, 10)], 9: [5, 6, 7]}, STAIRS_1F), inside=True)
m.npc(9, 4, 'down', '阿翔的姊姊', 'female', ['阿翔？他一大早就跑去學校的桌球體育館了。', '他說今天一定要第一個拿到球拍。'])

# ----- 16. 韓家二樓 -----
m = new(16, '韓家二樓', 'v2_rival_2f.png', 10, 10, W({
    1: [4, 5], 2: [4, 5], 3: [4, 5], 4: [(3, 8)], 5: [3, 7, 8], 6: [3, 7, 8], 7: [3, 7],
    8: [(3, 8)]}, {r: [1, 2] for r in range(5, 9)}), inside=True)
m.obj('desk', 1, 1, 3, 3, text='書桌上貼滿了桌球選手的海報。')

# ----- 17. 老奶奶家 -----
m = new(17, '老奶奶家', 'v2_grandma.png', 15, 11, {
    3: [(7, 12)], 4: [(3, 7), 11, 12], 5: [2, 11], 6: [2, 11], 7: [2, 11],
    8: [(2, 12)], 9: [6, 7, 8], 10: [6, 7, 8]}, inside=True)

# ----- 18. 社區公園（一定會經過；之後老奶奶在這裡教球） -----
m = new(18, '社區公園', 'v2_park.png', 19, 12, {
    3: [(7, 17)], 4: [7, 8, 9, 10, 14, 15, 16, 17], 5: [7, 8, 9, 10, 14, 15, 16, 17],
    6: [7, 8, 9, 10, 14, 15, 16, 17], 7: [7, 8, 9, 10, 14, 15, 16, 17],
    8: [(0, 18)], 9: [(7, 10), (12, 14), (16, 18)]})
m.obj('ttable', 11, 4, 3, 4, text='公園的桌球桌，常常有人在這裡打球。')
m.npc(9, 4, 'right', '上班族 王先生', 'male', ['上班要遲到了啦……',
       '公園那張桌球桌，假日都要排隊才搶得到喔。'])
m.trainer('r2', 16, 5, 'left', '高中生 小婷', 'female', 'spinner', 0.12, rng=2,
          intro='我是高中桌球社的，讓你見識一下側旋！', after='國小生也太強了吧…')
m.npc(8, 9, 'up', '外送員 阿峰', 'male', ['我在等下一張訂單。',
       '騎車送餐的時候常常看到有人在公園打球，看起來好好玩。'])

# ----- 5. 校門 -----
m = new(5, '光明國小 校門', 'v2_gate.png', 26, 14, W({
    5: [13, 14], 6: [(12, 16)], 7: [(11, 16)], 8: [(10, 17)], 9: [(12, 15)], 10: [(12, 15)],
    11: [(0, 25)], 12: [(0, 25)], 13: [(0, 25)]}, {r: [24, 25] for r in range(0, 11)}))
m.obj('building', 7, 1, 14, 4, name='光明國小')
m.trainer('e1', 4, 11, 'right', '一年級學弟', 'male', 'allround', 0.06,
          intro='學長！我也想打桌球！', after='學長好厲害！')
m.npc(21, 11, 'left', '跳繩女孩', 'female', ['我今天跳繩跳了一百下！',
       '聽說桌球體育館的陳教練以前是國手耶。'])
m.npc(16, 8, 'left', '警衛伯伯', 'male', ['早安！進了大門先是操場，教學樓在操場後面。',
                                        '一樓走廊走到底就是桌球體育館。'])

# ----- 9. 操場 -----
m = new(9, '操場', 'v2_field.png', 24, 14, {
    0: [10, 11, 12, 13], 1: [10, 11, 12, 13], 2: [(9, 14)], **{r: [(2, 21)] for r in range(3, 12)},
    12: [10, 11, 12]}, {6: [4, 5, 17, 18], 7: [4, 5, 17, 18], 8: [4, 5, 17, 18]})
m.trainer('pe', 3, 7, 'right', '體育老師', 'male', 'speedster', 0.22, rng=1, teacher=True,
          intro='運動員的反應要快！準備好了嗎？', after='好！你的腳步很靈活！')
m.trainer('f1', 20, 3, 'down', '田徑隊 小飛', 'male', 'speedster', 0.15, rng=3,
          intro='我跑得快，球也打得快！', after='輸了…再去跑五圈。')
m.npc(11, 7, 'down', '足球隊 阿德', 'male', ['足球隊今天休息，我在這裡看大家練跑。',
       '頭上有桌球圖示的人，就是想找人比賽的喔。'])

# ----- 19. 教學樓（外面） -----
m = new(19, '教學樓', 'v2_building.png', 25, 14, {
    7: [12, 13], 8: [9, 11, 12, 13, 14, 16], 9: [(3, 21)], 10: [3, 4, 6, 7, (10, 14), 18, 19, 20],
    11: [(10, 15)], 12: [(10, 15)], 13: [(10, 15)]})
m.obj('building', 3, 1, 19, 6, name='教學樓')

# ----- 7. 一樓走廊（左邊是辦公室，走到底是桌球體育館） -----
m = new(7, '一樓走廊', 'v2_corridor_1f.png', 16, 9, {
    2: [2, 13, 14], 3: [(0, 15)], 4: [(0, 15)], 5: [(0, 15)], 6: [4, 5]}, inside=True)
m.obj('door_locked', 6, 2, text='這是其他班的教室。')
m.obj('door_locked', 9, 2, 2, 1, text='這是其他班的教室。')
m.trainer('h1', 6, 3, 'down', '三年級學長', 'male', 'looper', 0.12, rng=1,
          intro='學弟，你也是桌球社的嗎？來比比看！', after='看來我得多練習了。')
m.npc(11, 3, 'down', '糾察隊長', 'female', ['走廊上不可以奔跑喔！',
       '辦公室在走廊左邊，訓導主任很嚴格，聽說他只跟打敗老師的學生比賽。'])

# ----- 20. 二樓走廊（左邊是你的教室） -----
m = new(20, '二樓走廊', 'v2_corridor_2f.png', 17, 9, {
    2: [2, 3, 13, 14, 15], 3: [(1, 16)], 4: [(1, 16)], 5: [(1, 16)], 6: [6, 7]}, inside=True)
m.obj('door_locked', 6, 2, 2, 1, text='這是其他班的教室。')
m.obj('door_locked', 10, 2, 2, 1, text='這是其他班的教室。')
m.trainer('h3', 16, 4, 'left', '美術老師', 'female', 'spinner', 0.22, rng=3, teacher=True,
          intro='球的旋轉，就像畫畫的筆觸一樣！', after='你的球很有藝術感。')

# ----- 6. 教室（二樓） -----
m = new(6, '三年二班', 'v2_classroom.png', 13, 9, {
    2: [(1, 11)], 3: [1, 2, 4, 6, 8, 10, 11], 4: [2, 4, 6, 8, 10, 11], 5: [2, 4, 6, 8, 10, 11], 6: [2, 4, 6, 8, 10, 11],
    7: [2, 3, (5, 8), 10, 11], 8: [6, 7]}, inside=True)
m.obj('blackboard', 3, 0, 6, 2, text='黑板上寫著：「今天的值日生：你」')
m.trainer('t_lin', 2, 2, 'right', '班導 林老師', 'female', 'allround', 0.20, rng=6, teacher=True,
          intro='上課前，老師先考考你的球技！', after='很好，你有認真練習。')
m.trainer('cl1', 11, 3, 'down', '同學 小胖', 'male', 'lobber', 0.09, rng=3,
          intro='下課了！來打一場！', after='我餓了，先去福利社…')
m.npc(8, 6, 'up', '班長 小雯', 'female', ['班長的工作好多……',
       '聽說學校裡有三位老師也很會打桌球，班導林老師就是其中一位。'])

# ----- 21. 辦公室（一樓：主任和校長） -----
m = new(21, '辦公室', 'v2_office.png', 14, 9, {
    3: [(1, 12)], 4: [(1, 3), (9, 12)], 5: [2, 3, (9, 12)], 6: [2, 3, (9, 11)], 7: [(2, 12)], 8: [7, 8]}, inside=True)
m.trainer('boss_dir', 3, 7, 'right', '訓導主任', 'male', 'chopper', 0.30, rng=3, req='teachers3',
          intro='聽說你打敗了好幾位老師？讓我來試試你！', after='很好！校長也很想跟你比一場。',
          blocked='主任：先去跟三位老師比過，再來找我吧。')
m.trainer('boss_pri', 11, 3, 'down', '校長', 'male', 'allround', 0.38, rng=3, req='director',
          intro='我年輕時可是校隊隊長喔。來吧，讓我看看你的實力！',
          after='太精彩了！你就代表我們學校，去市區中心的體育館參加校際賽吧！',
          blocked='校長：同學好！聽說訓導主任很想跟你比一場喔。')

# ----- 8. 桌球體育館（一樓走廊走到底） -----
m = new(8, '桌球體育館', 'v2_tt_gym.png', 15, 9, {
    **{r: [(0, 13)] for r in (7, 8)}, 3: [(1, 13)], **{r: [1, 2, 6, 10, 13] for r in (4, 5, 6)}}, inside=True)
m.obj('ttable', 3, 4, 3, 3, text='桌球桌。今天也要好好練習！')
m.obj('ttable', 7, 4, 3, 3, text='桌球桌。今天也要好好練習！')
m.obj('ttable', 11, 4, 2, 3, text='桌球桌。今天也要好好練習！')
m.npc(1, 3, 'right', '桌球陳教練', 'male', [], role='coach')
m.trainer('rival1', 2, 7, 'up', '勁敵 阿翔', 'male', 'allround', 0.12, rng=3, story=True,
          intro='我也剛拿到球拍！第一場比賽，就跟你打！', after='哼，這次算你贏，我會變得更強的！')
m.trainer('tt2', 13, 3, 'down', '桌球社學姊', 'female', 'looper', 0.16, rng=2,
          intro='歡迎加入桌球社！學姊來陪你練習。', after='進步得真快！')

# ======================= 10. 市區道路（東側） =======================
m = new(10, '市區道路（東側）', '10_road_east.png', 30, 20, {
    6: [4, 5, 23, 24], 7: [(2, 7), 9, (19, 24), 28], 8: [(0, 11), (19, 29)], 9: [(0, 29)], 10: [(0, 29)], 11: [(0, 29)],
    **{r: [11, 12, 18] for r in range(12, 20)}, 12: [11, 12, 18, 19],
}, {11: [1, 8, (12, 18), 21, 27], 18: [11]})
m.trainer('u1', 6, 11, 'up', '補習班學生', 'female', 'looper', 0.16, rng=2,
          intro='補習前偷偷打一場！', after='要被老師罵了啦！')
m.npc(23, 8, 'down', '騎腳踏車的大哥', 'male', ['今天天氣真好，適合騎車。',
       '一直往前騎就是市區中心，紅色屋頂的恢復中心可以免費修球拍喔。'])
m.trainer('u3', 20, 11, 'left', '公園阿嬤', 'female', 'chopper', 0.20, rng=1,
          intro='阿嬤的切球，可是練了五十年喔！', after='乖孫，打得真好！')

# ======================= 11. 市區中心 =======================
m = new(11, '市區中心', '11_city.png', 30, 20, {
    **{r: [(13, 17)] for r in range(0, 5)}, 5: [14, 15, 21, 22], 6: [6, 7, 14, 15, 21, 22],
    7: [6, 7, (11, 18), 21, 22], 8: [(0, 12), (17, 22)], 9: [(0, 12), (17, 29)], 10: [(0, 12), (17, 29)],
    11: [11, 12, 17, 18], 12: [(11, 18)], 13: [14, 15], 14: [14, 15], 15: [14, 15], 16: [14, 15],
    17: [7, 8, 14, 15], 18: [7, 8, 14, 15], 19: [(1, 19)],
}, {9: [11, 18], 10: [11, 18]})
m.obj('building', 3, 0, 8, 6, name='市立體育館')
m.obj('building', 19, 0, 6, 5, name='恢復中心')
m.obj('building', 6, 13, 5, 4, name='商店')
m.obj('building', 26, 0, 3, 7, name='大樓', locked=True)
m.obj('building', 20, 11, 9, 8, name='購物中心', text='購物中心。今天休館整修中。')
m.obj('fountain', 13, 8, 4, 4, text='噴水池。水花在陽光下閃閃發亮。')
m.trainer('u4', 15, 3, 'down', '街頭藝人', 'male', 'spinner', 0.20, rng=2,
          intro='看我的魔術……不對，是側旋球！', after='掌聲鼓勵！')
m.npc(19, 9, 'down', '逛街的姊姊', 'female', ['剛剛那家店的衣服好可愛！',
       '球拍如果壞了，記得去左下角的商店看看。'])
m.npc(11, 12, 'up', '市民', 'male', ['藍色屋頂的是市立體育館，在辦各種桌球比賽。',
                                    '要先在學校打敗校長，代表學校出賽，才能報名喔。',
                                    '紅色屋頂的是恢復中心，可以免費修球拍。左下的店是商店。'])

# ======================= 12. 恢復中心 =======================
m = new(12, '恢復中心', '12_center.png', 14, 11, {
    3: [(1, 3)], 4: [(1, 3), 11, 12], 5: [(1, 12)], 6: [(1, 12)], 7: [(5, 8)], 8: [1, (4, 9), 12], 9: [(1, 12)], **INDOOR_DOOR,
}, inside=True)
m.obj('counter', 4, 4, 7, 1)
m.npc(7, 3, 'down', '恢復中心的姊姊', 'female', [], role='nurse', across=True)

# ======================= 13. 商店 =======================
m = new(13, '商店', '13_shop.png', 14, 11, {
    3: [2, 3, 10], 4: [(2, 12)], **{r: [2, 6, 7, 11] for r in range(5, 9)}, 9: [(2, 4), 6, 7, (9, 11)], **INDOOR_DOOR,
}, inside=True)
m.obj('counter', 4, 3, 6, 1)
m.npc(6, 2, 'down', '店長', 'male', [], role='clerk', across=True)

# ======================= 14. 市立體育館（裡面） =======================
m = new(14, '市立體育館', '14_gym.png', 14, 11, {
    4: [1, 2, 6, 7, 11, 12], 5: [2, 6, 7, 11, 12], 6: [2, 6, 7, 11, 12], 7: [2, 6, 7, 11, 12],
    8: [(2, 12)], 9: [(2, 11)], **INDOOR_DOOR,
}, inside=True)
m.obj('ttable', 3, 4, 3, 4, text='比賽用的桌球桌，擦得亮晶晶的。')
m.obj('ttable', 8, 4, 4, 4, text='比賽用的桌球桌，擦得亮晶晶的。')
m.npc(7, 4, 'down', '報名櫃檯 小姐', 'female', [], role='arena')

# ======================= 出入口 =======================
def link(a, ax, ay, b, bx, by, d):
    M[a].warp(ax, ay, b, bx, by, d)


# 主路線：社區街道（往右）→ 社區公園 → 校門 → 市區道路東側 → 市區中心
for y in (9, 10):
    link(1, 28, y, 18, 0, 8, 'right')
link(18, 0, 8, 1, 27, 9, 'left')
for y in (8, 9):
    link(18, 18, y, 5, 0, y + 3, 'right')
for y in (11, 12, 13):
    link(5, 0, y, 18, 17, 8 if y == 11 else 9, 'left')
for y in (11, 12, 13):
    link(5, 25, y, 10, 0, y - 2, 'right')
for y in range(8, 12):
    link(10, 0, y, 5, 24, max(11, y + 2), 'left')
for y in range(8, 12):
    link(10, 29, y, 11, 0, min(y, 10), 'right')
for y in range(8, 11):
    link(11, 0, y, 10, 28, y, 'left')
# 社區街道的三間房子
for x in (4, 5):
    link(1, x, 6, 2, 5, 8, 'up')
for x in (4, 5, 6):
    link(2, x, 9, 1, 4, 7, 'down')
link(1, 12, 6, 17, 7, 9, 'up')
for x in (6, 7, 8):
    link(17, x, 10, 1, 12, 7, 'down')
for x in (20, 21):
    link(1, x, 6, 3, 6, 8, 'up')
for x in (5, 6, 7):
    link(3, x, 9, 1, 20, 7, 'down')
# 樓梯：一樓樓梯頂端 ⇄ 二樓樓梯底部
for x in (1, 2):
    link(2, x, 3, 15, 2, 7, 'up'); link(15, x, 8, 2, 2, 4, 'down')
    link(3, x, 3, 16, 2, 7, 'up'); link(16, x, 8, 3, 2, 4, 'down')
# 校門 → 操場 → 教學樓 → 一樓走廊
for x in (13, 14):
    link(5, x, 5, 9, 11, 11, 'up')
for x in (10, 11, 12):
    link(9, x, 12, 5, 13, 7, 'down')
for x in (10, 11, 12, 13):
    link(9, x, 0, 19, 12, 12, 'up')
for x in range(10, 16):
    link(19, x, 13, 9, 11, 1, 'down')
for x in (12, 13):
    link(19, x, 7, 7, 4 if x == 12 else 5, 5, 'up')
for x in (4, 5):
    link(7, x, 6, 19, 12, 8, 'down')
# 一樓走廊：辦公室、樓梯、走到底是桌球體育館
link(7, 2, 2, 21, 7, 7, 'up')
for x in (7, 8):
    link(21, x, 8, 7, 2, 3, 'down')
for x in (13, 14):
    link(7, x, 2, 20, 14, 3, 'up')
for y in (3, 4, 5):
    link(7, 15, y, 8, 1, 7, 'right')
for y in (7, 8):
    link(8, 0, y, 7, 14, 4, 'left')
# 二樓走廊：教室、樓梯
for x in (2, 3):
    link(20, x, 2, 6, 6, 7, 'up')
for x in (6, 7):
    link(6, x, 8, 20, 2, 3, 'down')
for x in (13, 14, 15):
    link(20, x, 2, 7, 13, 3, 'up')
for x in (6, 7):
    link(20, x, 6, 7, 13, 3, 'down')
# 市區中心 ⇄ 體育館、恢復中心、商店
for x in (6, 7):
    link(11, x, 6, 14, x, 9, 'up')
    link(14, x, 10, 11, x, 7, 'down')
for x in (21, 22):
    link(11, x, 5, 12, 6 if x == 21 else 7, 9, 'up')
for x in (6, 7):
    link(12, x, 10, 11, 15 + x, 6, 'down')
for x in (7, 8):
    link(11, x, 17, 13, 6 if x == 7 else 7, 9, 'up')
for x in (6, 7):
    link(13, x, 10, 11, x + 1, 18, 'down')

SPAWN = dict(map=15, x=5, y=3, dir='down')
MAP_VERSION = 2   # 地圖大改時加一：舊存檔的位置會換回起點

# 每個人在地圖上用哪一張走路圖（js/chars.js 裡的名字）
SPRITES = {
    '鄰居小孩 小志': 'boy', '晨跑的阿伯': 'grandpa', '鄰居阿姨': 'woman', '媽媽': 'woman', '阿翔的姊姊': 'student_f',
    '上班族 王先生': 'man', '高中生 小婷': 'student_f', '外送員 阿峰': 'student_m',
    '一年級學弟': 'boy', '跳繩女孩': 'girl', '警衛伯伯': 'grandpa',
    '美術老師': 'woman_teacher', '三年級學長': 'tt_m', '糾察隊長': 'student_f', '訓導主任': 'director',
    '班導 林老師': 'woman_teacher', '同學 小胖': 'student_m', '班長 小雯': 'student_f',
    '桌球陳教練': 'man', '勁敵 阿翔': 'student_m', '桌球社學姊': 'tt_f',
    '體育老師': 'man', '田徑隊 小飛': 'student_m', '足球隊 阿德': 'boy', '校長': 'principal',
    '補習班學生': 'student_f', '騎腳踏車的大哥': 'man', '公園阿嬤': 'grandma',
    '街頭藝人': 'man', '逛街的姊姊': 'woman', '市民': 'man', '恢復中心的姊姊': 'woman', '店長': 'man',
    '報名櫃檯 小姐': 'woman',
}
# 看到你就會衝過來挑戰的人（劇情關鍵角色）；其他路人要你自己點畫面找他們，才會問你要不要比賽
SPOTTERS = {'rival1', 'boss_dir', 'boss_pri'}
for _m in M.values():
    for _t in _m.trainers:
        _t['spot'] = _t['id'] in SPOTTERS
for _m in M.values():
    for _p in _m.trainers + _m.npcs:
        _p['sprite'] = SPRITES.get(_p['name'], 'woman' if _p['char'] == 'female' else 'man')


# ======================= 檢查 =======================
def check(m):
    errs = []
    solid = [[ch != '.' for ch in row] for row in m.rows]
    warps = [(w['x'], w['y']) for w in m.warps]
    doors = [tuple(o['door']) for o in m.objects if o.get('role') == 'arena']
    for x, y in warps + doors:
        solid[y][x] = False
    people = [(t['name'], t['x'], t['y'], False) for t in m.trainers] + \
             [(n['name'], n['x'], n['y'], n.get('across', False)) for n in m.npcs]
    for name, x, y, across in people:
        if solid[y][x] and not across:
            errs.append(f'{name} 站在障礙物上 {x},{y}')
    for name, x, y, across in people:
        solid[y][x] = True
    starts = [(w['x'], w['y']) for w in m.warps]
    if m.id == SPAWN['map']:
        starts.append((SPAWN['x'], SPAWN['y']))
    seen = {starts[0]}
    q = deque([starts[0]])
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < m.w and 0 <= ny < m.h and (nx, ny) not in seen and not solid[ny][nx]:
                seen.add((nx, ny)); q.append((nx, ny))
    for x, y in warps + doors:
        if (x, y) not in seen:
            errs.append(f'走不到出入口 {x},{y}')
    for name, x, y, across in people:
        near = [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)] + ([(x, y + 2)] if across else [])
        if not any(p in seen for p in near):
            errs.append(f'走不到 {name} 旁邊 {x},{y}')
    for o in m.objects:
        if o.get('enter'):
            ring = [(x, o['y'] + j) for j in range(o['h']) for x in (o['x'] - 1, o['x'] + o['w'])] + \
                   [(o['x'] + i, y) for i in range(o['w']) for y in (o['y'] - 1, o['y'] + o['h'])]
            if not any(p in seen for p in ring):
                errs.append(f'走不到 {o["name"]} 旁邊')
    return errs


bad = False
for mid, m in M.items():
    e = check(m)
    if e:
        bad = True
        print(f'[{mid} {m.name}]', *e, sep='\n  ')
    for w in m.warps:
        t = M[w['to']]
        if not (0 <= w['tx'] < t.w and 0 <= w['ty'] < t.h) or (t.rows[w['ty']][w['tx']] != '.' and
                                                               not any(v['x'] == w['tx'] and v['y'] == w['ty'] for v in t.warps)):
            bad = True
            print(f'[{mid}] 傳送點的目的地不能站 {w}')
if bad:
    sys.exit(1)

# 遊戲讀的是 tools/upscale_maps.py 做的高畫質版本（assets/maps/hd/*.webp）
data = {mid: dict(name=m.name, img='assets/maps/hd/' + m.img[:-4] + '.webp', w=m.w, h=m.h, tp=round(m.tp, 3), inside=m.inside, cell=m.cell, rows=m.rows,
                  objects=m.objects, trainers=m.trainers, npcs=m.npcs, warps=m.warps) for mid, m in M.items()}
js = ("'use strict';\n// 由 tools/build_maps.py 產生，請改那個檔案再重新產生\n"
      f"const WORLD_MAPS = {json.dumps(data, ensure_ascii=False, separators=(',', ':'))};\n"
      f"const WORLD_SPAWN = {json.dumps(SPAWN)};\n"
      f"const WORLD_MAP_VERSION = {MAP_VERSION};\n")
open(OUT, 'w', encoding='utf-8', newline='\n').write(js)
print('寫入', os.path.normpath(OUT), '：', len(M), '張地圖，路人', sum(len(m.trainers) for m in M.values()), '位')

# ======================= 預覽：把障礙物疊在圖片上 =======================
if len(sys.argv) > 1:
    from PIL import ImageDraw
    os.makedirs(sys.argv[1], exist_ok=True)
    for mid, m in M.items():
        im = Image.open(os.path.join(ROOT, 'assets', 'maps', m.img)).convert('RGBA')
        S = 40 / m.tp
        im = im.resize((round(im.width * S), round(im.height * S)))
        ov = Image.new('RGBA', im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(ov)
        T = 40
        for y in range(m.h):
            for x in range(m.w):
                if m.rows[y][x] != '.':
                    d.rectangle([x * T, y * T, x * T + T - 1, y * T + T - 1], fill=(255, 0, 0, 70))
                d.rectangle([x * T, y * T, x * T + T - 1, y * T + T - 1], outline=(255, 255, 255, 40))
        for w in m.warps:
            d.rectangle([w['x'] * T + 4, w['y'] * T + 4, w['x'] * T + T - 5, w['y'] * T + T - 5], outline=(255, 0, 255, 255), width=3)
        for o in m.objects:
            if o.get('role') == 'arena':
                x, y = o['door']
                d.rectangle([x * T + 4, y * T + 4, x * T + T - 5, y * T + T - 5], outline=(255, 220, 0, 255), width=3)
        for t in m.trainers:
            d.ellipse([t['x'] * T + 8, t['y'] * T + 8, t['x'] * T + T - 8, t['y'] * T + T - 8], fill=(255, 40, 40, 230))
        for n in m.npcs:
            d.ellipse([n['x'] * T + 8, n['y'] * T + 8, n['x'] * T + T - 8, n['y'] * T + T - 8], fill=(255, 255, 255, 230))
        Image.alpha_composite(im, ov).convert('RGB').save(os.path.join(sys.argv[1], f'{mid:02d}.png'))
    print('預覽圖', sys.argv[1])
