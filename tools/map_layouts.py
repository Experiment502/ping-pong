"""Hand-authored geography. Props, terrain, doors and collision share one plan."""

PLANS = {}


def lake_mask(p, scale):
    """One shoreline for both water collision and rendered water, including island/bridge gaps."""
    from PIL import Image, ImageDraw
    mask=Image.new('L',(p['w']*scale,p['h']*scale))
    d=ImageDraw.Draw(mask)
    d.polygon([(x*scale,y*scale) for x,y in p['outline']],fill=255)
    for x,y,w,h in p['holes']:
        d.rectangle((x*scale,y*scale,(x+w)*scale-1,(y+h)*scale-1),fill=0)
    return mask


def scene(mid, w, h, inside=False, floor='grass'):
    p = dict(w=w, h=h, inside=inside, floor=floor, surfaces=[], props=[], people={}, warps=[])
    PLANS[mid] = p
    return p


def surface(p, tile, x, y, w, h):
    p['surfaces'].append(dict(tile=tile, x=x, y=y, w=w, h=h))


def prop(p, art, x, y, w, h, **kw):
    item = dict(art=art, x=x, y=y, w=w, h=h, solid=art != 'flowers')   # flower beds can be walked over
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
path(p, (0,14,26,3), (5,8,3,7), (14,7,3,8), (23,10,3,5))
for art,x,y,w,h,name in [('red_house',3,3,7,5,'主角家（大同路58巷3號）'),('orange_house',12,2,7,5,'老奶奶家'),('blue_house',21,5,7,5,'韓家')]:
    prop(p,art,x,y,w,h,kind='building',name=name)
for rect in [(3,9,2,1),(8,9,2,1),(12,8,2,1),(17,8,2,1),(21,11,2,1),(26,11,2,1)]:
    prop(p,'flowers',*rect)
for rect in [(3,11,2,1),(8,11,2,1),(12,10,2,1),(17,10,2,1),(21,13,2,1),(26,13,2,1)]:
    prop(p,'fence',*rect)
trees(p,(1,2),(10,8),(19,2),(1,18),(4,18),(8,18),(19,18),(24,18))
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
prop(p,'sofa_north',3,6,4,2); prop(p,'kitchen',8,2,4,2,kind='desk',text='廚房裡飄來早餐的香味。')
prop(p,'dining',9,6,2,2); prop(p,'plant',12,9,1,1)
surface(p,'rug_red',2,5,5,4)
person(p,'媽媽',10,8)

p=room(3,14,12)
prop(p,'stairs',11,3,2,2,solid=False)
prop(p,'kitchen',2,2,4,2); prop(p,'tv',8,3,2,2)
prop(p,'sofa_north',7,6,4,2); prop(p,'dining',3,7,2,2); prop(p,'plant',1,9,1,1)
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

# Longtan Pond is the western park: a long lake, island shrine and east-bank courts.
p=scene(18,36,42)
path(p,(2,2,29,2),(2,4,1,34),(2,37,26,2),(24,4,3,34),(24,18,12,3),tile='paving')
surface(p,'paving',25,7,8,8)
prop(p,'lake',3,4,18,32,kind='pond',text='龍潭池。沿著環湖步道走走，吹吹湖邊的風。',
     outline=[(6,0),(14,0),(18,5),(17,12),(15,18),(12,26),(8,32),(3,30),(1,24),(0,15),(2,5)],
     holes=[(7,13,6,5),(13,16,5,2)])
surface(p,'paving',10,17,6,5)
surface(p,'bridge',16,20,9,2)
prop(p,'island_shrine',10,17,6,4,kind='landmark',name='南天宮',text='湖心的南天宮，沿橋走就能到。')
prop(p,'ttable',27,9,2,4,kind='ttable',text='龍潭池東岸的桌球桌，常常有人在這裡打球。')
prop(p,'bench',21,9,2,1); prop(p,'bench',22,29,2,1); prop(p,'bench',6,37,2,1)
prop(p,'flowers',28,4,4,1); prop(p,'flowers',28,33,4,2)
trees(p,(4,2),(31,2),(30,36),(5,39),(12,39),(20,39))
person(p,'上班族 王先生',24,12); person(p,'r2',31,10); person(p,'外送員 阿峰',27,32)

# The school fence runs along the north edge; walking through the gate enters the campus.
p=scene(5,30,18)
path(p,(8,13,22,3), (12,0,3,14), (8,9,11,5), (23,0,3,13),tile='paving')
for x,w in [(2,9),(16,7)]:
    prop(p,'fence',x,2,w,1)
prop(p,'pillar',11,1,1,2); prop(p,'pillar',15,1,1,2)
for x in (3,7,20,26):
    prop(p,'flowers',x,10,2,2)
trees(p,(2,5),(6,5),(18,5),(20,5))
person(p,'e1',5,15); person(p,'跳繩女孩',21,15); person(p,'警衛伯伯',16,12)

# One continuous campus: school and forecourt to the north, dirt field to the south.
p=scene(9,26,36)
path(p,(11,8,4,8),(4,10,18,3),tile='paving')
prop(p,'japanese_school',4,2,19,7,kind='building',name='教學樓')
prop(p,'flagpole',5,12,1,3)
prop(p,'bench',19,13,2,1)
for x in (2,21):
    prop(p,'flowers',x,10,3,1)
trees(p,(2,2),(23,2),(2,5),(23,5))
prop(p,'hedge',2,4,2,1); prop(p,'hedge',23,4,2,1)
surface(p,'schoolyard',2,16,22,18)
surface(p,'chalk_track',3,18,20,14)
path(p,(12,33,3,3),tile='paving')
prop(p,'goal_left',4,24,2,2); prop(p,'goal_right',20,24,2,2)
prop(p,'bars',5,16,3,2)
prop(p,'bench',1,22,2,1); prop(p,'bench',23,22,2,1)
trees(p,(1,16),(23,16),(1,32),(23,32))
person(p,'pe',3,26); person(p,'f1',22,20); person(p,'足球隊 阿德',13,25)

p=room(7,22,10,'school_floor')
p['wall']=3
prop(p,'school_door',4,1,2,2,solid=False,label='辦公室')
prop(p,'school_door',9,1,2,2,kind='door_locked',text='這是其他班的教室。')
prop(p,'school_door',14,1,2,2,kind='door_locked',text='這是其他班的教室。')
prop(p,'stairs',18,1,2,3,solid=False)
prop(p,'noticeboard',1,1,2,1,solid=False)
prop(p,'shoe_lockers',1,6,3,2); prop(p,'plant',17,7,1,1)
person(p,'h1',8,4); person(p,'糾察隊長',14,5)

p=room(20,22,10,'school_floor')
p['wall']=3
prop(p,'school_door',4,1,2,2,solid=False,label='三年二班')
prop(p,'school_door',10,1,2,2,kind='door_locked',text='這是其他班的教室。')
prop(p,'school_door',14,1,2,2,kind='door_locked',text='這是其他班的教室。')
prop(p,'stairs',18,1,2,3,solid=False)
prop(p,'noticeboard',1,1,2,1,solid=False); prop(p,'plant',2,7,1,1)
person(p,'h3',16,6)

p=room(6,16,13,'school_floor')
prop(p,'blackboard',5,1,6,1,solid=False,kind='blackboard',text='黑板上寫著：「今天的值日生：你」')
prop(p,'noticeboard',1,1,2,1,solid=False)
prop(p,'desk',7,3,2,2)
for y in (6,9):
    for x in (2,5,8,11):
        prop(p,'desk',x,y,2,2)
prop(p,'plant',14,2,1,1)
person(p,'t_lin',3,4); person(p,'cl1',13,4); person(p,'班長 小雯',10,8)

p=room(21,18,13,'school_floor')
prop(p,'noticeboard',7,1,3,1,solid=False)
prop(p,'bookshelf',2,2,3,2); prop(p,'bookshelf',11,2,3,2)
prop(p,'desk',3,5,3,2); prop(p,'desk',12,5,3,2)
prop(p,'sofa',10,9,3,2); prop(p,'plant',1,9,1,1); prop(p,'plant',16,9,1,1)
person(p,'boss_dir',4,7); person(p,'boss_pri',13,4)

p=room(8,22,16,'wood')
prop(p,'noticeboard',1,1,3,1,solid=False)
for x in (5,10,15):
    surface(p,'court',x-1,5,4,6)
    prop(p,'ttable',x,6,2,4,kind='ttable',text='桌球桌。今天也要好好練習！')
prop(p,'bookshelf',8,2,3,2); prop(p,'bench',7,13,2,1); prop(p,'bench',13,13,2,1)
person(p,'桌球陳教練',4,3); person(p,'rival1',3,12); person(p,'tt2',18,4)

# Roads between the northern temple district, western lake and southern school.
p=scene(10,34,30)
path(p,(0,14,28,3),(23,0,3,17),(25,14,3,16),tile='paving')
prop(p,'streetfront',7,6,7,5,kind='building',name='龍潭街屋',locked=True)
prop(p,'streetfront',4,21,7,5,kind='building',name='街角店家',locked=True)
prop(p,'flowers',16,8,4,2); prop(p,'bench',16,20,2,1)
trees(p,(2,2),(8,2),(16,2),(28,2),(2,26),(12,26),(30,26))
person(p,'u1',6,15); person(p,'騎腳踏車的大哥',23,18); person(p,'u3',20,18)

# Longyuan Temple is the city landmark; game services sit around its plaza.
p=scene(11,38,30)
path(p,(18,9,3,21),(6,16,3,12),(5,25,16,3),(20,16,13,3),tile='paving')
surface(p,'paving',12,10,15,16)
prop(p,'longyuan_temple',13,3,13,7,kind='building',name='龍元宮',text='龍元宮。廟前廣場連著商圈，球具店、恢復中心和賽事場館都在附近。')
prop(p,'streetfront',3,3,7,5,kind='building',name='龍元宮老街',locked=True)
prop(p,'streetfront',29,3,7,5,kind='building',name='商圈街屋',locked=True)
prop(p,'school',3,12,9,6,kind='building',name='市立體育館')
prop(p,'red_house',28,12,7,5,kind='building',name='恢復中心')
prop(p,'blue_house',3,22,7,5,kind='building',name='球具店')
prop(p,'market_stall',12,15,3,2); prop(p,'market_stall',24,15,3,2)
prop(p,'bench',23,21,2,1); prop(p,'lamp',12,12,1,2); prop(p,'lamp',26,12,1,2)
for rect in [(13,23,2,1),(23,23,3,1),(12,4,1,3),(27,4,1,3)]:
    prop(p,'flowers',*rect)
trees(p,(1,2),(10,2),(27,2),(35,9),(1,18),(35,23))
prop(p,'hedge',3,2,7,1); prop(p,'hedge',29,2,7,1)
person(p,'u4',19,13); person(p,'逛街的姊姊',28,20); person(p,'市民',15,23)

p=room(12,16,13,'school_floor')
prop(p,'counter',5,4,7,1,kind='counter')
prop(p,'bookshelf',2,2,2,2); prop(p,'bench',2,8,2,1); prop(p,'bench',11,8,2,1)
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
prop(p,'bench',3,14,2,1); prop(p,'bench',16,14,2,1)
prop(p,'plant',2,3,1,1); prop(p,'plant',19,3,1,1)
person(p,'報名櫃檯 小姐',10,4)

# The school uses the same wood texture and shaded furniture palette as the homes.
for mid in (7,20,6,21,8):
    PLANS[mid]['floor']='wood'
    PLANS[mid]['style']='school'


def warp(a,x,y,b,tx,ty,d):
    PLANS[a]['warps'].append(dict(x=x,y=y,to=b,tx=tx,ty=ty,dir=d))


def door(out,x,y,inside,ix,iy):
    # (x,y) is the doorstep; the door itself is the tile above it.
    warp(out,x,y-1,inside,ix,iy-1,'up')
    warp(inside,ix,iy,out,x,y,'down')


def east(a,ay,b,by):
    for offset in (0,1,2):
        warp(a,PLANS[a]['w']-1,ay+offset,b,1,by+offset,'right')
        warp(b,0,by+offset,a,PLANS[a]['w']-2,ay+offset,'left')


def north(a,ax,b,bx):
    for offset in (0,1,2):
        warp(a,ax+offset,0,b,bx+offset,PLANS[b]['h']-2,'up')
        warp(b,bx+offset,PLANS[b]['h']-1,a,ax+offset,1,'down')


east(5,13,1,14)
north(5,23,10,25)
east(18,18,10,14)
north(10,23,11,18)
door(1,6,8,2,6,11); door(1,15,7,17,6,11); door(1,24,10,3,6,11)
for x in (1,2):
    warp(2,x,3,15,x,8,'up'); warp(15,x,9,2,x,4,'down')
for offset in (0,1):
    warp(3,11+offset,3,16,9+offset,8,'up'); warp(16,9+offset,9,3,11+offset,4,'down')
for offset in (0,1,2):
    warp(5,12+offset,0,9,12+offset,34,'up')
    warp(9,12+offset,35,5,12+offset,1,'down')
door(9,13,9,7,10,9)
for hall, classroom in ((7,21),(20,6)):
    door(hall,4,3,classroom,8,12)
    warp(hall,5,2,classroom,8,11,'up')
for x in (18,19):
    warp(7,x,3,20,x,4,'up'); warp(20,x,3,7,x,4,'up')
east(7,6,8,12)
door(11,7,18,14,10,17); door(11,31,17,12,7,12); door(11,6,27,13,7,12)

SPAWN = dict(map=15,x=5,y=5,dir='down')

# Relative positions from the supplied map; the school gate and campus share a region.
REGIONS = {11:(1,0),18:(0,1),10:(1,1),5:(1,2),1:(2,2)}
