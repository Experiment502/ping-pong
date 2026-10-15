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


def new(mid, name, img, w, h, walk, block=None, inside=False):
    m = Map(mid, name, img, grid(w, h, walk, block), inside)
    M[mid] = m
    return m


ROAD = {8: [(0, 29)], 9: [(0, 29)], 10: [(0, 29)], 11: [(0, 29)]}   # 東西向大馬路：第 8、11 列人行道，9、10 列車道
INDOOR_DOOR = {10: [6, 7]}                                           # 室內地圖的門口都在最下面中間

# ======================= 1. 社區路上 =======================
m = new(1, '社區路上', '01_community.png', 30, 20, {
    5: [3, 4, 11], 6: [3, 4, (11, 12), (17, 19), 26], 7: [3, 4, (11, 12), 18, 26],
    8: [(1, 29)], 9: [(1, 29)], 10: [(1, 29)], 11: [(1, 29)],
    **{r: [18] for r in range(12, 19)},
}, {11: [9, 28]})
m.obj('building', 2, 1, 4, 4, name='我的家')
m.obj('building', 10, 1, 4, 4, name='阿翔家')
m.obj('building', 24, 1, 4, 5, name='鄰居家', locked=True)
m.trainer('n1', 18, 13, 'up', '鄰居小孩 小志', 'male', 'allround', 0.04, rng=4,
          intro='你有球拍了耶！跟我比一場！', after='我回家叫我哥來找你！')
m.trainer('n2', 18, 6, 'down', '晨跑的阿伯', 'male', 'lobber', 0.07, rng=2,
          intro='年輕人，陪阿伯打一場吧！', after='哈哈，年輕真好。')
m.npc(24, 8, 'down', '鄰居阿姨', 'female', ['今天是你第一次上桌球課吧？', '學校在東邊，沿著大馬路一直往右走就到了。'])

# ======================= 2. 我的家 =======================
m = new(2, '我的家', '02_home.png', 14, 11, {
    3: [(7, 9)], 4: [(2, 9)], 5: [2, (7, 9)], 6: [2, (7, 9)], 7: [2, (7, 9)],
    8: [(2, 9)], 9: [(2, 12)], **INDOOR_DOOR}, inside=True)
m.obj('bed', 10, 4, 3, 5, text='在床上休息一下……進度已經存檔了！', role='save')
m.obj('tv', 4, 1, 3, 2, text='電視正在播桌球比賽的轉播。')
m.npc(2, 4, 'right', '媽媽', 'female', ['今天是第一次上桌球課，別遲到了！', '學校在東邊。桌球教室在走廊中間那扇門。',
                                       '累了就回家休息，媽媽會幫你存檔。'], role='mom')

# ======================= 3. 阿翔家 =======================
m = new(3, '阿翔家', '03_rival_home.png', 14, 11, {
    3: [(6, 8)], 4: [(2, 8)], 5: [(2, 4), (9, 11)], 6: [(2, 4), (9, 11)], 7: [(2, 4), (9, 11)],
    8: [(3, 11)], 9: [(3, 11)], **INDOOR_DOOR}, inside=True)
m.npc(7, 4, 'down', '阿翔的姊姊', 'female', ['阿翔？他一大早就跑去學校的桌球教室了。', '他說今天一定要第一個拿到球拍。'])

# ======================= 4. 市區道路（西側） =======================
m = new(4, '市區道路（西側）', '04_road_west.png', 30, 20, {
    7: [(0, 29)], **ROAD, **{r: [14, 15] for r in range(12, 20)},
}, {7: [1, 5, 6, 7, 13, 14, 15, 20, 22, 23, 28], 11: [2, 11, 13, 17, 18, 27]})
m.obj('building', 1, 1, 4, 6, name='早餐店', locked=True)
m.obj('building', 5, 1, 4, 6, name='眼鏡行', locked=True)
m.obj('building', 9, 1, 5, 6, name='社區活動中心', text='社區活動中心，今天沒有開放。')
m.obj('building', 15, 1, 5, 6, name='服飾店', locked=True)
m.obj('building', 22, 0, 4, 7, name='公寓', locked=True)
m.obj('building', 26, 1, 4, 6, name='便利商店', locked=True)
m.trainer('r1', 12, 7, 'down', '上班族 王先生', 'male', 'speedster', 0.10, rng=1,
          intro='上班前來一場晨間對決吧！', after='糟了，要遲到了！')
m.trainer('r2', 3, 7, 'down', '高中生 小婷', 'female', 'spinner', 0.12, rng=2,
          intro='我是高中桌球社的，讓你見識一下側旋！', after='國小生也太強了吧…')
m.trainer('r3', 14, 14, 'up', '外送員 阿峰', 'male', 'allround', 0.14, rng=2,
          intro='送餐前先比一場，速戰速決！', after='餐要涼了，先走啦！')

# ======================= 5. 光明國小 =======================
m = new(5, '光明國小', '05_school.png', 30, 20, {
    4: [14, 15], 5: [(13, 16)], 6: [(12, 17)], 7: [(13, 16)], **ROAD,
    **{r: [14, 15] for r in range(12, 17)}, 17: [(6, 23)], 18: [(5, 24)], 19: [(5, 24)],
}, {11: [6, 12, 17, 23]})
m.obj('building', 6, 0, 18, 4, name='光明國小')
m.trainer('e1', 4, 8, 'right', '一年級學弟', 'male', 'allround', 0.06,
          intro='學長！我也想打桌球！', after='學長好厲害！')
m.trainer('e2', 22, 18, 'left', '跳繩女孩', 'female', 'lobber', 0.08,
          intro='跳繩跳累了，換打桌球！', after='我還是回去跳繩好了。')
m.npc(12, 6, 'right', '警衛伯伯', 'male', ['早安！要去桌球教室嗎？', '進了大門，走廊中間那扇門就是桌球教室。'])

# ======================= 7. 走廊 =======================
m = new(7, '走廊', '07_corridor.png', 24, 8, {
    2: [5, 11], 3: [(3, 7), (10, 13), (17, 20)], 4: [(0, 23)], 5: [(0, 23)], 6: [11, 12], 7: [11, 12],
}, inside=True)
m.obj('door_locked', 18, 2, text='校長室。門關著，校長好像不在裡面。')
m.trainer('h3', 0, 4, 'right', '美術老師', 'female', 'spinner', 0.22, rng=3, teacher=True,
          intro='球的旋轉，就像畫畫的筆觸一樣！', after='你的球很有藝術感。')
m.trainer('h1', 6, 3, 'down', '三年級學長', 'male', 'looper', 0.12, rng=1,
          intro='學弟，你也是桌球社的嗎？來比比看！', after='看來我得多練習了。')
m.trainer('h2', 13, 3, 'down', '糾察隊長', 'female', 'chopper', 0.14, rng=1,
          intro='走廊不能奔跑！……但是可以打桌球！', after='好啦，讓你通過。')
m.trainer('boss_dir', 23, 4, 'left', '訓導主任', 'male', 'chopper', 0.30, rng=3, req='teachers3',
          intro='聽說你打敗了好幾位老師？讓我來試試你！', after='很好！去操場找校長吧，他在等你。',
          blocked='主任：先去跟三位老師比過，再來找我吧。')

# ======================= 6. 三年二班 =======================
m = new(6, '三年二班', '06_classroom.png', 14, 11, {
    3: [(2, 5), (8, 12)], **{r: [4, 9, 12] for r in range(4, 9)}, 9: [(2, 11)], **INDOOR_DOOR}, inside=True)
m.obj('blackboard', 3, 0, 8, 3, text='黑板上寫著：「今天的值日生：你」')
m.trainer('t_lin', 2, 3, 'right', '班導 林老師', 'female', 'allround', 0.20, rng=3, teacher=True,
          intro='上課前，老師先考考你的球技！', after='很好，你有認真練習。')
m.trainer('cl1', 12, 6, 'up', '同學 小胖', 'male', 'lobber', 0.09, rng=3,
          intro='下課了！來打一場！', after='我餓了，先去福利社…')
m.trainer('cl2', 11, 9, 'left', '班長 小雯', 'female', 'spinner', 0.11, rng=2,
          intro='身為班長，桌球也不能輸！', after='你……你給我記住！')

# ======================= 8. 桌球教室 =======================
m = new(8, '桌球教室', '08_tt_room.png', 14, 11, {
    3: [(2, 11)], **{r: [2, 6, 11, 12] for r in range(4, 8)}, 8: [(2, 12)], 9: [(2, 12)], **INDOOR_DOOR}, inside=True)
m.obj('ttable', 3, 4, 3, 4, text='桌球桌。今天也要好好練習！')
m.obj('ttable', 7, 4, 4, 4, text='桌球桌。今天也要好好練習！')
m.npc(2, 3, 'down', '桌球陳教練', 'male', [], role='coach')
m.trainer('rival1', 9, 9, 'left', '勁敵 阿翔', 'male', 'allround', 0.12, rng=7, story=True,
          intro='我也剛拿到球拍！第一場比賽，就跟你打！', after='哼，這次算你贏，我會變得更強的！')
m.trainer('tt2', 11, 3, 'down', '桌球社學姊', 'female', 'looper', 0.16, rng=2,
          intro='歡迎加入桌球社！學姊來陪你練習。', after='進步得真快！')

# ======================= 9. 操場 =======================
m = new(9, '操場', '09_field.png', 30, 20, {
    **{r: [14, 15] for r in range(0, 5)}, 5: [(5, 24)], 6: [(4, 25)], **{r: [(3, 26)] for r in range(7, 13)},
    13: [(4, 25)], 14: [(4, 9), (20, 25)], 15: [(6, 9), (20, 23)],
}, {9: [6, 23], 10: [6, 23], 11: [6, 23]})
m.obj('stage', 10, 14, 10, 5, text='司令台。朝會的時候校長會站在上面。')
m.trainer('pe', 4, 9, 'right', '體育老師', 'male', 'speedster', 0.22, rng=1, teacher=True,
          intro='運動員的反應要快！準備好了嗎？', after='好！你的腳步很靈活！')
m.trainer('f1', 20, 5, 'down', '田徑隊 小飛', 'male', 'speedster', 0.15, rng=3,
          intro='我跑得快，球也打得快！', after='輸了…再去跑五圈。')
m.trainer('f2', 14, 7, 'down', '足球隊 阿德', 'male', 'allround', 0.13, rng=4,
          intro='足球踢累了，換打桌球！', after='我還是比較會踢足球。')
m.trainer('boss_pri', 15, 13, 'up', '校長', 'male', 'allround', 0.38, rng=3, req='director',
          intro='我年輕時可是校隊隊長喔。來吧，讓我看看你的實力！',
          after='太精彩了！你就代表我們學校，去市區中心的體育館參加校際賽吧！',
          blocked='校長：同學好！聽說訓導主任很想跟你比一場喔。')

# ======================= 10. 市區道路（東側） =======================
m = new(10, '市區道路（東側）', '10_road_east.png', 30, 20, {
    8: [(0, 11), (19, 29)], 9: [(0, 29)], 10: [(0, 29)], 11: [(0, 29)],
}, {11: [1, 8, (12, 18), 21, 27]})
m.trainer('u1', 6, 11, 'up', '補習班學生', 'female', 'looper', 0.16, rng=2,
          intro='補習前偷偷打一場！', after='要被老師罵了啦！')
m.trainer('u2', 23, 8, 'down', '騎腳踏車的大哥', 'male', 'speedster', 0.18, rng=2,
          intro='我的球速跟腳踏車一樣快！', after='騎車去散散心…')
m.trainer('u3', 20, 11, 'left', '公園阿嬤', 'female', 'chopper', 0.20, rng=1,
          intro='阿嬤的切球，可是練了五十年喔！', after='乖孫，打得真好！')

# ======================= 11. 市區中心 =======================
m = new(11, '市區中心', '11_city.png', 30, 20, {
    **{r: [(13, 17)] for r in range(0, 5)}, 5: [14, 15, 21, 22], 6: [6, 7, 14, 15, 21, 22],
    7: [6, 7, (11, 18), 21, 22], 8: [(0, 12), (17, 22)], 9: [(0, 12), (17, 29)], 10: [(0, 12), (17, 29)],
    11: [11, 12, 17, 18], 12: [(11, 18)], 13: [14, 15], 14: [(13, 15)], 15: [(13, 15)], 16: [(13, 15)],
    17: [7, 8, (13, 15)], 18: [7, 8, (13, 15)], 19: [(1, 19)],
}, {9: [11, 18], 10: [11, 18]})
m.obj('building', 3, 0, 8, 6, name='市立體育館')
m.obj('building', 19, 0, 6, 5, name='恢復中心')
m.obj('building', 6, 13, 5, 4, name='商店')
m.obj('building', 26, 0, 3, 7, name='大樓', locked=True)
m.obj('building', 20, 11, 9, 8, name='購物中心', text='購物中心。今天休館整修中。')
m.obj('fountain', 13, 8, 4, 4, text='噴水池。水花在陽光下閃閃發亮。')
m.trainer('u4', 15, 3, 'down', '街頭藝人', 'male', 'spinner', 0.20, rng=2,
          intro='看我的魔術……不對，是側旋球！', after='掌聲鼓勵！')
m.trainer('u5', 19, 9, 'down', '逛街的姊姊', 'female', 'lobber', 0.18, rng=1,
          intro='逛街逛累了，來打球放鬆一下！', after='我去買杯飲料。')
m.npc(11, 12, 'up', '市民', 'male', ['藍色屋頂的是市立體育館，在辦各種桌球比賽。',
                                    '要先在學校打敗校長，代表學校出賽，才能報名喔。',
                                    '紅色屋頂的是恢復中心，可以免費修球拍。左下的店是商店。'])

# ======================= 12. 恢復中心 =======================
m = new(12, '恢復中心', '12_center.png', 14, 11, {
    3: [2, 3], 4: [(1, 3), 11, 12], 5: [(1, 12)], 6: [(1, 12)], 7: [(5, 8)], 8: [(4, 9)], 9: [(4, 9)], **INDOOR_DOOR,
}, inside=True)
m.obj('counter', 4, 4, 7, 1)
m.npc(7, 3, 'down', '恢復中心的姊姊', 'female', [], role='nurse', across=True)

# ======================= 13. 商店 =======================
m = new(13, '商店', '13_shop.png', 14, 11, {
    3: [2, 3], 4: [(2, 11)], **{r: [2, 6, 7, 11] for r in range(5, 9)}, 9: [(2, 4), 6, 7, (9, 11)], **INDOOR_DOOR,
}, inside=True)
m.obj('counter', 4, 3, 6, 1)
m.npc(6, 2, 'down', '店長', 'male', [], role='clerk', across=True)

# ======================= 14. 市立體育館（裡面） =======================
m = new(14, '市立體育館', '14_gym.png', 14, 11, {
    4: [(0, 2), (6, 7), 12, 13], 5: [(0, 2), (6, 7), 12, 13], 6: [2, 6, 7, 12], 7: [2, 6, 7, 12],
    8: [(2, 12)], 9: [(2, 11)], **INDOOR_DOOR,
}, inside=True)
m.obj('ttable', 3, 4, 3, 4, text='比賽用的桌球桌，擦得亮晶晶的。')
m.obj('ttable', 8, 4, 4, 4, text='比賽用的桌球桌，擦得亮晶晶的。')
m.npc(7, 4, 'down', '報名櫃檯 小姐', 'female', [], role='arena')

# ======================= 出入口 =======================
def link(a, ax, ay, b, bx, by, d):
    M[a].warp(ax, ay, b, bx, by, d)


# 大馬路：社區 ⇄ 市區道路西側 ⇄ 學校 ⇄ 市區道路東側 ⇄ 市區中心（同一列對同一列）
for y in range(8, 12):
    link(1, 29, y, 4, 0, y, 'right'); link(4, 0, y, 1, 29, y, 'left')
    link(4, 29, y, 5, 0, y, 'right'); link(5, 0, y, 4, 29, y, 'left')
    link(5, 29, y, 10, 0, y, 'right'); link(10, 0, y, 5, 29, y, 'left')
    link(10, 29, y, 11, 0, min(y, 10), 'right')
for y in range(8, 11):
    link(11, 0, y, 10, 29, y, 'left')
# 學校 ⇄ 操場
for x in (14, 15):
    link(5, x, 19, 9, x, 0, 'down'); link(9, x, 0, 5, x, 19, 'up')
# 家門
for x in (3, 4):
    link(1, x, 5, 2, 6, 9, 'up')
for x in (6, 7):
    link(2, x, 10, 1, 4, 6, 'down')
link(1, 11, 5, 3, 6, 9, 'up')
for x in (6, 7):
    link(3, x, 10, 1, 11, 6, 'down')
# 學校大門 ⇄ 走廊；走廊 ⇄ 教室、桌球教室
for x, tx in ((14, 11), (15, 12)):
    link(5, x, 4, 7, tx, 6, 'up')
for x, tx in ((11, 14), (12, 15)):
    link(7, x, 7, 5, tx, 5, 'down')
link(7, 5, 2, 6, 6, 9, 'up')
link(7, 11, 2, 8, 6, 9, 'up')
for x in (6, 7):
    link(6, x, 10, 7, 5, 3, 'down')
    link(8, x, 10, 7, 11, 3, 'down')
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

SPAWN = dict(map=2, x=8, y=6, dir='down')

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
data = {mid: dict(name=m.name, img='assets/maps/hd/' + m.img[:-4] + '.webp', w=m.w, h=m.h, tp=round(m.tp, 3), inside=m.inside, rows=m.rows,
                  objects=m.objects, trainers=m.trainers, npcs=m.npcs, warps=m.warps) for mid, m in M.items()}
js = ("'use strict';\n// 由 tools/build_maps.py 產生，請改那個檔案再重新產生\n"
      f"const WORLD_MAPS = {json.dumps(data, ensure_ascii=False, separators=(',', ':'))};\n"
      f"const WORLD_SPAWN = {json.dumps(SPAWN)};\n")
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
