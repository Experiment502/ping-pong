"""Hand-authored geography. Props, terrain, doors and collision share one plan."""

PLANS = {}


def scene(mid, w, h, inside=False, floor='grass'):
    p = dict(w=w, h=h, inside=inside, floor=floor, surfaces=[], props=[], people={}, warps=[])
    PLANS[mid] = p
    return p


def surface(p, tile, x, y, w, h):
    p['surfaces'].append(dict(tile=tile, x=x, y=y, w=w, h=h))


def prop(p, art, x, y, w, h, **kw):
    item = dict(art=art, x=x, y=y, w=w, h=h, solid=True)
    item.update(kw)
    p['props'].append(item)


def path(p, *rects, tile='sand'):
    for rect in rects:
        surface(p, tile, *rect)


def trees(p, *positions):
    for x, y in positions:
        prop(p, 'tree', x, y, 2, 2)


def person(p, name, x, y):
    p['people'][name] = (x, y)


def room(mid, w, h, floor='wood'):
    return scene(mid, w, h, True, floor)


# A small residential neighborhood: staggered lots, three distinct front gardens.
p = scene(1, 30, 22)
path(p, (0,14,30,3), (5,8,3,7), (14,7,3,8), (23,10,3,5))
for art,x,y,w,h,name in [('red_house',3,3,6,5,'我的家'),('orange_house',12,2,6,5,'老奶奶家'),('blue_house',21,5,6,5,'韓家')]:
    prop(p,art,x,y,w,h,kind='building',name=name)
for rect in [(3,9,2,1),(8,9,2,1),(12,8,2,1),(17,8,2,1),(21,11,2,1),(26,11,2,1)]:
    prop(p,'flowers',*rect)
for rect in [(3,11,2,1),(8,11,2,1),(12,10,2,1),(17,10,2,1),(21,13,2,1),(26,13,2,1)]:
    prop(p,'fence',*rect)
trees(p,(1,2),(9,3),(18,2),(1,18),(4,18),(8,18),(19,18),(24,18))
prop(p,'sign',18,15,1,1,label='公園 →')
surface(p,'flowers',12,18,4,2)
person(p,'n1',17,15); person(p,'晨跑的阿伯',27,14); person(p,'鄰居阿姨',8,13)

# Bedrooms have a clear center and furniture against the perimeter.
p=room(15,12,11)
prop(p,'bed',9,3,2,3,kind='bed',role='save',text='在床上休息一下……進度已經存檔了！')
prop(p,'desk',2,3,2,2,kind='desk',text='書桌上放著爸爸比賽的照片。')
prop(p,'bookshelf',5,2,2,2); prop(p,'plant',9,8,1,1)
surface(p,'rug_blue',4,6,4,2)
prop(p,'stairs',1,8,2,2,solid=False)

p=room(2,14,12)
prop(p,'stairs',1,3,2,2,solid=False)
prop(p,'tv',4,3,2,2,kind='tv',text='電視正在播體育新聞。')
prop(p,'sofa',3,6,3,2); prop(p,'kitchen',8,2,4,2,kind='desk',text='廚房裡飄來早餐的香味。')
prop(p,'dining',9,6,2,2); prop(p,'plant',12,9,1,1)
surface(p,'rug_red',2,5,5,4)
person(p,'媽媽',10,8)

p=room(3,14,12)
prop(p,'stairs',11,3,2,2,solid=False)
prop(p,'kitchen',2,2,4,2); prop(p,'tv',8,3,2,2)
prop(p,'sofa',7,6,3,2); prop(p,'dining',3,7,2,2); prop(p,'plant',1,9,1,1)
surface(p,'rug_blue',6,5,5,4)
person(p,'韓宇的姊姊',10,8)

p=room(16,12,11)
prop(p,'bed',1,3,2,3); prop(p,'desk',7,3,2,2,kind='desk',text='書桌上貼滿了桌球選手的海報。')
prop(p,'bookshelf',4,2,2,2); prop(p,'stairs',9,8,2,2,solid=False)
surface(p,'rug_red',4,6,4,2)

p=room(17,14,12)
prop(p,'bookshelf',2,2,3,2); prop(p,'kitchen',8,2,4,2)
prop(p,'sofa',2,6,3,2); prop(p,'dining',8,6,3,2)
prop(p,'plant',1,9,1,1); prop(p,'plant',12,9,1,1)
surface(p,'rug_green',1,5,5,4)

# A pond garden and a separate paved table-tennis court, joined by a walking loop.
p=scene(18,24,20)
path(p,(0,13,24,3),(8,3,3,12),(8,3,13,2),(19,3,2,12))
surface(p,'paving',11,5,8,7)
prop(p,'water',2,4,5,6,kind='pond')
prop(p,'ttable',13,6,2,4,kind='ttable',text='公園的桌球桌，常常有人在這裡打球。')
prop(p,'bench',16,10,3,1); prop(p,'bench',3,11,3,1)
prop(p,'flowers',13,3,4,1); prop(p,'flowers',3,17,4,1)
prop(p,'sign',21,12,1,1,label='學校 →')
trees(p,(2,2),(8,17),(12,17),(16,17),(20,17),(21,6))
person(p,'上班族 王先生',10,6); person(p,'r2',17,7); person(p,'外送員 阿峰',8,16)

# The school entrance is a gate, not another school building.
p=scene(5,26,18)
path(p,(0,14,26,3), (12,0,3,17), (8,9,11,5),tile='paving')
for x,w in [(2,9),(16,8)]:
    prop(p,'fence',x,8,w,1)
prop(p,'pillar',11,7,1,2); prop(p,'pillar',15,7,1,2)
prop(p,'sign',17,10,2,1,label='光明國小')
for x in (3,7,20,23):
    prop(p,'flowers',x,10,2,2)
trees(p,(2,2),(6,2),(18,2),(22,2),(2,5),(22,5))
person(p,'e1',5,15); person(p,'跳繩女孩',21,15); person(p,'警衛伯伯',16,12)

p=scene(9,26,22)
surface(p,'track',3,4,20,14)
path(p,(12,0,3,5),(12,17,3,5),tile='paving')
prop(p,'bench',1,8,2,1); prop(p,'bench',23,8,2,1)
prop(p,'sign',4,2,1,1,label='操場')
trees(p,(1,2),(23,2),(1,18),(23,18))
person(p,'pe',3,12); person(p,'f1',22,6); person(p,'足球隊 阿德',13,11)

p=scene(19,26,18)
path(p,(11,8,4,10),(4,10,18,3),tile='paving')
prop(p,'school',8,2,10,7,kind='building',name='教學樓')
prop(p,'fountain',3,12,3,3,kind='fountain',text='水花在陽光下閃閃發亮。')
prop(p,'bench',19,13,3,1)
for x in (3,20):
    prop(p,'flowers',x,7,3,2)
trees(p,(2,2),(22,2),(2,5),(22,5),(2,15),(22,15))

p=room(7,22,10,'school_floor')
prop(p,'door',4,2,2,1,solid=False,label='辦公室')
prop(p,'door',9,2,2,1,kind='door_locked',text='這是其他班的教室。')
prop(p,'door',14,2,2,1,kind='door_locked',text='這是其他班的教室。')
prop(p,'stairs',18,2,2,2,solid=False)
prop(p,'bench',3,7,3,1); prop(p,'plant',17,7,1,1)
person(p,'h1',8,4); person(p,'糾察隊長',14,5)

p=room(20,22,10,'school_floor')
prop(p,'door',4,2,2,1,solid=False,label='三年二班')
prop(p,'door',10,2,2,1,kind='door_locked',text='這是其他班的教室。')
prop(p,'door',14,2,2,1,kind='door_locked',text='這是其他班的教室。')
prop(p,'stairs',18,2,2,2,solid=False)
prop(p,'bench',6,7,3,1); prop(p,'plant',2,7,1,1)
person(p,'h3',16,6)

p=room(6,16,13,'school_floor')
prop(p,'blackboard',5,1,6,1,solid=False,kind='blackboard',text='黑板上寫著：「今天的值日生：你」')
prop(p,'desk',7,3,2,2)
for y in (6,9):
    for x in (2,5,8,11):
        prop(p,'desk',x,y,2,2)
prop(p,'plant',14,2,1,1)
person(p,'t_lin',3,4); person(p,'cl1',13,4); person(p,'班長 小雯',10,8)

p=room(21,18,13,'school_floor')
prop(p,'bookshelf',2,2,3,2); prop(p,'bookshelf',11,2,3,2)
prop(p,'desk',3,5,3,2); prop(p,'desk',12,5,3,2)
prop(p,'sofa',10,9,3,2); prop(p,'plant',1,9,1,1); prop(p,'plant',16,9,1,1)
person(p,'boss_dir',4,7); person(p,'boss_pri',13,4)

p=room(8,22,16,'wood')
for x in (5,10,15):
    surface(p,'court',x-1,5,4,6)
    prop(p,'ttable',x,6,2,4,kind='ttable',text='桌球桌。今天也要好好練習！')
prop(p,'bookshelf',8,2,3,2); prop(p,'bench',7,13,3,1); prop(p,'bench',13,13,3,1)
person(p,'桌球陳教練',4,3); person(p,'rival1',3,12); person(p,'tt2',18,4)

# A green route with a bend, roadside pond, and clear western/eastern mouths.
p=scene(10,30,20)
path(p,(0,12,12,3),(10,8,3,7),(10,8,20,3))
prop(p,'water',19,2,7,4,kind='pond')
prop(p,'flowers',3,8,4,2); prop(p,'bench',16,13,3,1)
prop(p,'sign',26,11,2,1,label='市區 →')
trees(p,(2,2),(5,3),(8,2),(13,2),(3,16),(7,16),(11,16),(22,15),(26,15),(16,6))
person(p,'u1',6,12); person(p,'騎腳踏車的大哥',23,10); person(p,'u3',20,13)

p=scene(11,30,24)
path(p,(0,12,30,3),(6,8,3,7),(23,7,3,8),(5,19,3,3),(5,20,13,2),(14,10,4,12),tile='paving')
surface(p,'paving',10,10,12,10)
prop(p,'school',3,3,8,6,kind='building',name='市立體育館')
prop(p,'red_house',21,3,6,5,kind='building',name='恢復中心')
prop(p,'blue_house',3,15,6,5,kind='building',name='商店')
prop(p,'fountain',14,14,3,3,kind='fountain',text='噴水池。水花在陽光下閃閃發亮。')
prop(p,'sign',3,10,2,1,label='體育館'); prop(p,'sign',26,9,2,1,label='恢復中心'); prop(p,'sign',2,21,2,1,label='球具店')
prop(p,'bench',19,17,3,1); prop(p,'lamp',11,11,1,2); prop(p,'lamp',21,11,1,2)
for rect in [(12,18,2,1),(18,18,2,1),(12,5,5,2),(22,19,5,2)]:
    prop(p,'flowers',*rect)
trees(p,(1,2),(12,2),(16,2),(27,3),(1,17),(25,17))
person(p,'u4',17,11); person(p,'逛街的姊姊',23,15); person(p,'市民',11,18)

p=room(12,16,13,'school_floor')
prop(p,'counter',5,4,7,1,kind='counter')
prop(p,'bookshelf',2,2,2,2); prop(p,'bench',2,8,3,1); prop(p,'bench',11,8,3,1)
prop(p,'plant',1,10,1,1); prop(p,'plant',14,10,1,1)
surface(p,'rug_red',6,8,4,3)
person(p,'恢復中心的姊姊',8,3)

p=room(13,16,13,'wood')
prop(p,'counter',4,4,7,1,kind='counter')
prop(p,'bookshelf',2,7,3,2); prop(p,'bookshelf',11,7,3,2)
prop(p,'plant',1,10,1,1); prop(p,'plant',14,10,1,1)
person(p,'店長',7,3)

p=room(14,22,18,'wood')
for x in (5,14):
    surface(p,'court',x-1,6,4,6)
    prop(p,'ttable',x,7,2,4,kind='ttable',text='比賽用的桌球桌，擦得亮晶晶的。')
prop(p,'counter',8,3,6,1,kind='counter')
prop(p,'bench',3,14,3,1); prop(p,'bench',16,14,3,1)
prop(p,'plant',2,3,1,1); prop(p,'plant',19,3,1,1)
person(p,'報名櫃檯 小姐',10,4)


def warp(a,x,y,b,tx,ty,d):
    PLANS[a]['warps'].append(dict(x=x,y=y,to=b,tx=tx,ty=ty,dir=d))


def door(out,x,y,inside,ix,iy):
    warp(out,x,y,inside,ix,iy-1,'up')
    warp(inside,ix,iy,out,x,y+1,'down')


def east(a,ay,b,by):
    for offset in (0,1):
        warp(a,PLANS[a]['w']-1,ay+offset,b,1,by+offset,'right')
        warp(b,0,by+offset,a,PLANS[a]['w']-2,ay+offset,'left')


def north(a,ax,b,bx):
    for offset in (0,1):
        warp(a,ax+offset,0,b,bx+offset,PLANS[b]['h']-2,'up')
        warp(b,bx+offset,PLANS[b]['h']-1,a,ax+offset,1,'down')


east(1,15,18,14); east(18,14,5,15); east(5,15,10,13); east(10,9,11,13)
door(1,6,8,2,6,11); door(1,15,7,17,6,11); door(1,24,10,3,6,11)
for x in (1,2):
    warp(2,x,3,15,x,8,'up'); warp(15,x,9,2,x,4,'down')
for offset in (0,1):
    warp(3,11+offset,3,16,9+offset,8,'up'); warp(16,9+offset,9,3,11+offset,4,'down')
north(5,13,9,12); north(9,12,19,12)
door(19,13,9,7,10,9)
door(7,4,2,21,8,12); door(20,4,2,6,8,12)
for x in (18,19):
    warp(7,x,2,20,x,4,'up'); warp(20,x,2,7,x,4,'up')
east(7,6,8,12)
door(11,7,9,14,10,17); door(11,24,8,12,7,12); door(11,6,20,13,7,12)

SPAWN = dict(map=15,x=5,y=5,dir='down')
