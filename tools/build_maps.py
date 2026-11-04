"""Build map data and verify the complete route.

python tools/build_maps.py
python tools/draw_pixel_maps.py
Geography lives in map_layouts.py; existing story dialogue lives in story_people.json.
"""
import json
import os
from collections import deque
from map_layouts import PLANS, SPAWN, REGIONS, lake_mask

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(ROOT,'tools/story_people.json'),encoding='utf-8') as f:
    story=json.load(f)


def build(mid,p):
    w,h=p['w'],p['h']
    wall=p.get('wall',2)
    # Outdoor edges form a two-tile forest; corridor doors fit inside a taller wall.
    def boundary(x,y):
        return (x==0 or x==w-1 or y<wall or y==h-1) if p['inside'] else (x<2 or x>=w-2 or y<2 or y>=h-2)
    rows=[['#' if boundary(x,y) else '.' for x in range(w)] for y in range(h)]
    objects=[]
    used=set()
    for prop in p['props']:
        x,y,pw,ph=[prop[k] for k in ('x','y','w','h')]
        assert 0<=x<x+pw<=w and 0<=y<y+ph<=h,(mid,prop)
        if prop['solid']:
            mask=lake_mask(prop,2) if prop['art']=='lake' else None
            for yy in range(y,y+ph):
                for xx in range(x,x+pw):
                    if mask is not None and not mask.getpixel(((xx-x)*2+1,(yy-y)*2+1)):
                        continue
                    assert (xx,yy) not in used,(mid,'overlapping props',prop,xx,yy)
                    used.add((xx,yy))
                    rows[yy][xx]='#'
        if prop.get('kind'):
            obj={k:v for k,v in prop.items() if k not in ('art','solid','label')}
            objects.append(obj)
    for warp in p['warps']:
        x,y=warp['x'],warp['y']
        assert 0<=x<w and 0<=y<h,(mid,warp)
        # A boundary exit opens all forest/wall tiles down to the interior.
        cells=[(x,y)]
        if x==0: cells.extend([(1,y),(2,y)])
        if x==w-1: cells.extend([(w-2,y),(w-3,y)])
        if y==0: cells.extend([(x,1),(x,2)])
        if y==h-1:
            cells.append((x,h-2))
            if not p['inside']: cells.append((x,h-3))
        for xx,yy in cells:
            assert not any(o['solid'] and o.get('kind')!='building' and o['x']<=xx<o['x']+o['w'] and o['y']<=yy<o['y']+o['h'] for o in p['props']),(mid,'exit blocked by furniture',xx,yy)
            rows[yy][xx]='.'
    people=story[str(mid)]
    for person in people['npcs']+people['trainers']:
        key=person.get('id',person['name'])
        person['x'],person['y']=p['people'][key]
    return dict(name=people['name'],img=f'assets/maps/pixel/{mid:02d}.png',w=w,h=h,tp=32,inside=p['inside'],cell=1,
                rows=[''.join(row) for row in rows],objects=objects,npcs=people['npcs'],trainers=people['trainers'],warps=p['warps'],
                art=dict(wall=wall,style=p.get('style','default'),**{k:p[k] for k in ('floor','surfaces','props')}))


# Kept separate from rendering so map validity does not depend on image inspection.
def check(mid,m,maps):
    people=m['npcs']+m['trainers']
    taken={(p['x'],p['y']) for p in people}
    for prop in m['art']['props']:
        if prop['art'] in ('door','school_door'):
            threshold=prop['y']+prop['h']
            assert threshold==m['art']['wall'],(mid,'door is not embedded in wall',prop)
            if not prop['solid']:
                for x in range(prop['x'],prop['x']+prop['w']):
                    assert any(w['x']==x and w['y']==threshold-1 for w in m['warps']),(mid,'door panel lacks entrance',x)
    assert len(taken)==len(people),(mid,'people overlap')
    for p in people:
        assert m['rows'][p['y']][p['x']]=='.',(mid,'person on obstacle',p['name'])
    start=(m['warps'][0]['x'],m['warps'][0]['y'])
    seen={start}; q=deque([start])
    while q:
        x,y=q.popleft()
        for xx,yy in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0<=xx<m['w'] and 0<=yy<m['h'] and m['rows'][yy][xx]=='.' and (xx,yy) not in seen and (xx,yy) not in taken:
                seen.add((xx,yy)); q.append((xx,yy))
    for warp in m['warps']:
        assert (warp['x'],warp['y']) in seen,(mid,'unreachable exit',warp)
        target=maps[warp['to']]
        tx,ty=warp['tx'],warp['ty']
        assert 0<=tx<target['w'] and 0<=ty<target['h'] and target['rows'][ty][tx]=='.',(mid,'unsafe arrival',warp)
        assert not any(p['x']==tx and p['y']==ty for p in target['npcs']+target['trainers']),(mid,'arrival on person',warp)
        assert not any(w['x']==tx and w['y']==ty for w in target['warps']),(mid,'arrival immediately warps again',warp)
        assert any(w['to']==mid for w in target['warps']),(mid,'missing return route',warp)
    for p in people:
        x,y=p['x'],p['y']
        near=[(x-1,y),(x+1,y),(x,y-1),(x,y+1)]+([(x,y+2)] if p.get('across') else [])
        assert any(cell in seen for cell in near),(mid,'unreachable person',p['name'])
    if mid==SPAWN['map']:
        assert (SPAWN['x'],SPAWN['y']) in seen,'unreachable starting point'
    floor={(x,y) for y,row in enumerate(m['rows']) for x,c in enumerate(row) if c=='.'}
    assert not floor-seen-taken,(mid,'isolated floor tiles',floor-seen-taken)
    return seen


data={mid:build(mid,p) for mid,p in PLANS.items()}
for mid,m in data.items():
    check(mid,m,data)
# Cardinal road exits must agree with the geographic layout of the supplied map.
for mid,(x,y) in REGIONS.items():
    for warp in data[mid]['warps']:
        if warp['to'] in REGIONS:
            tx,ty=REGIONS[warp['to']]
            assert (tx-x,ty-y)==dict(left=(-1,0),right=(1,0),up=(0,-1),down=(0,1))[warp['dir']],(mid,'road faces wrong region',warp)
# The story route and optional homes/services are one connected world.
reachable={SPAWN['map']}; queue=deque(reachable)
while queue:
    for warp in data[queue.popleft()]['warps']:
        if warp['to'] not in reachable:
            reachable.add(warp['to']); queue.append(warp['to'])
assert reachable==set(data),'disconnected story maps'
js=("'use strict';\n// Generated by tools/build_maps.py; geography: tools/map_layouts.py\n"
    f"const WORLD_MAPS = {json.dumps(data,ensure_ascii=False,separators=(',',':'))};\n"
    f"const WORLD_SPAWN = {json.dumps(SPAWN)};\n"
    "const WORLD_MAP_VERSION = 5;\n")
with open(os.path.join(ROOT,'js/maps.js'),'w',encoding='utf-8') as f:
    f.write(js)
print(f'PASS: {len(data)} maps, {sum(len(m["warps"]) for m in data.values())} exits; all people, arrivals and story areas reachable.')
