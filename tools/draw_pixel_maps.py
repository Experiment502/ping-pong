"""Pack the approved art into the authored plans; never infer scenery from collision.

python tools/build_maps.py && python tools/draw_pixel_maps.py
"""
import json
import os
import re
from collections import deque
from PIL import Image, ImageDraw, ImageFont

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST=os.path.join(ROOT,'assets/maps/pixel')
os.makedirs(DEST,exist_ok=True)
with open(os.path.join(ROOT,'js/maps.js'),encoding='utf-8') as f:
    maps=json.loads(re.search(r'const WORLD_MAPS = (.*);',f.read()).group(1))
N=Image.Resampling.NEAREST
FONT='/System/Library/Fonts/STHeiti Light.ttc'

def font(size):
    return ImageFont.truetype(FONT,size) if os.path.exists(FONT) else ImageFont.load_default()


def atlas(name):
    im=Image.open(os.path.join(ROOT,'assets/maps/tiles',name+'.png')).convert('RGBA')
    cells=[]
    for y in range(4):
        for x in range(4):
            cell=im.crop((round(x*im.width/4),round(y*im.height/4),round((x+1)*im.width/4),round((y+1)*im.height/4)))
            # The atlas has faint detached pixels: crop single objects to their main cluster.
            alpha=cell.getchannel('A').point(lambda a:255 if a>160 else 0)
            bounds=alpha.getbbox()
            index=y*4+x
            if (name=='outdoor' and index not in (0,1,2,3,6)) or (name=='indoor' and index not in (0,1)):
                pixels=alpha.tobytes(); seen=bytearray(len(pixels)); largest=[]
                for seed,value in enumerate(pixels):
                    if not value or seen[seed]: continue
                    seen[seed]=1; group=[]; queue=deque([seed])
                    while queue:
                        pos=queue.popleft(); group.append(pos)
                        px,py=pos%cell.width,pos//cell.width
                        for xx,yy in ((px-1,py),(px+1,py),(px,py-1),(px,py+1)):
                            if 0<=xx<cell.width and 0<=yy<cell.height:
                                nxt=yy*cell.width+xx
                                if pixels[nxt] and not seen[nxt]: seen[nxt]=1; queue.append(nxt)
                    if len(group)>len(largest): largest=group
                if largest:
                    xs=[pos%cell.width for pos in largest]; ys=[pos//cell.width for pos in largest]
                    bounds=(min(xs),min(ys),max(xs)+1,max(ys)+1)
            cells.append(cell.crop(bounds))
    return cells


out,inside=atlas('outdoor'),atlas('indoor')
SPRITES={name:out[i] for i,name in enumerate(['grass','sand','paving','water','tree','hedge','flowers','fence','red_house','blue_house','orange_house','school','fountain','sign','lamp','boulder'])}
SPRITES.update({name:inside[i] for i,name in enumerate(['wood','school_floor','window','bed','desk','bookshelf','sofa','tv','dining','kitchen','plant','stairs','ttable','blackboard','counter','wardrobe'])})
T=32


def render(m):
    w,h=m['w'],m['h']
    im=Image.new('RGBA',(w*T,h*T),'#76b85b')
    d=ImageDraw.Draw(im)

    def rect(x,y,ww,hh,color,outline=None):
        d.rectangle((round(x*T),round(y*T),round((x+ww)*T)-1,round((y+hh)*T)-1),fill=color,outline=outline)

    def sprite(name,x,y,ww=1,hh=1,stretch=False):
        asset=SPRITES[name]
        aw,ah=round(ww*T),round(hh*T)
        if not stretch:
            scale=min(aw/asset.width,ah/asset.height)
            aw,ah=max(1,round(asset.width*scale)),max(1,round(asset.height*scale))
        asset=asset.resize((aw,ah),N)
        im.alpha_composite(asset,(round((x+ww/2)*T-aw/2),round((y+hh)*T-ah)))

    def terrain(name,x,y,ww,hh):
        asset=SPRITES[name]
        a,b=asset.size
        tile=asset.crop((a//4,b//4,a*3//4,b*3//4)).resize((T,T),N)
        for yy in range(y,y+hh):
            for xx in range(x,x+ww):
                im.alpha_composite(tile,(xx*T,yy*T))

    terrain(m['art']['floor'],0,0,w,h)
    for s in m['art']['surfaces']:
        tile,x,y,ww,hh=[s[k] for k in ('tile','x','y','w','h')]
        if tile.startswith('rug_'):
            color={'rug_blue':'#7798ab','rug_red':'#b66c63','rug_green':'#7e9a70'}[tile]
            rect(x,y,ww,hh,color,'#ebd29c')
            d.rectangle((x*T+4,y*T+4,(x+ww)*T-5,(y+hh)*T-5),outline='#d8c8a2',width=2)
        elif tile=='court':
            rect(x,y,ww,hh,'#97ac9a')
            d.rectangle((x*T+3,y*T+3,(x+ww)*T-4,(y+hh)*T-4),outline='#ecddba',width=2)
        elif tile=='track':
            bounds=(x*T,y*T,(x+ww)*T-1,(y+hh)*T-1)
            d.rounded_rectangle(bounds,radius=hh*T//2,fill='#c48b65')
            for inset in (7,18,29):
                d.rounded_rectangle((bounds[0]+inset,bounds[1]+inset,bounds[2]-inset,bounds[3]-inset),radius=max(1,hh*T//2-inset),outline='#ead6a5',width=2)
            d.rounded_rectangle((bounds[0]+46,bounds[1]+46,bounds[2]-46,bounds[3]-46),radius=max(1,hh*T//2-46),fill='#83ba64')
            # One center line and goals identify the clear grass playing field.
            d.line(((x+ww/2)*T,(y+2)*T,(x+ww/2)*T,(y+hh-2)*T),fill='#cddd9d',width=2)
            d.ellipse(((x+ww/2-1.5)*T,(y+hh/2-1.5)*T,(x+ww/2+1.5)*T,(y+hh/2+1.5)*T),outline='#cddd9d',width=2)
        elif tile=='flowers':
            for yy in range(y,y+hh):
                for xx in range(x,x+ww): sprite('flowers',xx,yy)
        else:
            terrain(tile,x,y,ww,hh)
            if tile=='sand':
                d.rectangle((x*T,y*T,(x+ww)*T-1,(y+hh)*T-1),outline='#c9bb78')

    if m['inside']:
        # One continuous back wall, with two windows; furniture has its own positions.
        rect(0,0,w,2,'#e2ddbf')
        rect(0,1.65,w,.35,'#9c7f58')
        rect(0,2,w,.08,'#635a4c')
        for xx in (3,w-6):
            if not any(p['x']<xx+2 and p['x']+p['w']>xx and p['y']<2 for p in m['art']['props']):
                sprite('window',xx,.15,2,1.5)
        rect(0,2,1,h-2,'#625e4d'); rect(w-1,2,1,h-2,'#625e4d')
        rect(0,h-1,w,1,'#625e4d')
    else:
        # Only the forest perimeter is filled automatically; lawns remain open space.
        used=set()
        props=m['art']['props']
        blocked={(xx,yy) for p in props for yy in range(p['y'],p['y']+p['h']) for xx in range(p['x'],p['x']+p['w'])}
        for y in range(0,h,2):
            for x in range(0,w,2):
                cells={(xx,yy) for yy in range(y,min(y+2,h)) for xx in range(x,min(x+2,w))}
                if len(cells)==4 and all(m['rows'][yy][xx]=='#' and (xx<2 or xx>=w-2 or yy<2 or yy>=h-2) for xx,yy in cells) and not cells&blocked:
                    sprite('tree',x,y,2,2)
                    used.update(cells)
        for y,row in enumerate(m['rows']):
            for x,c in enumerate(row):
                if c=='#' and (x<2 or x>=w-2 or y<2 or y>=h-2) and (x,y) not in used|blocked:
                    sprite('hedge',x,y)

    for p in sorted(m['art']['props'],key=lambda p:p['y']+p['h']):
        name,x,y,ww,hh=[p[k] for k in ('art','x','y','w','h')]
        if name=='bench':
            rect(x,y+.1,ww,.3,'#665841'); rect(x+.12,y+.18,ww-.24,.22,'#b9935f')
            rect(x+.12,y+.55,ww-.24,.25,'#c4a06c'); rect(x+.18,y+.8,.2,.2,'#65553f'); rect(x+ww-.38,y+.8,.2,.2,'#65553f')
        elif name=='pillar':
            rect(x,y+.2,ww,hh-.2,'#7f8a82'); rect(x+.12,y+.15,ww-.24,hh-.35,'#c2c8a7')
            rect(x-.08,y,ww+.16,.3,'#dde0bf')
        elif name=='door':
            rect(x,y,ww,hh,'#7b654b'); rect(x+.1,y+.08,ww-.2,hh-.08,'#b79160')
            rect(x+ww-.3,y+.6,.1,.1,'#e9d9a1')
        elif name=='water':
            rect(x-.08,y-.08,ww+.16,hh+.16,'#c1bd81')
            terrain('water',x,y,ww,hh)
            d.rectangle((x*T+2,y*T+2,(x+ww)*T-3,(y+hh)*T-3),outline='#9dd7ba',width=3)
        elif name in ('fence','flowers','counter'):
            step=2 if name!='flowers' else 1
            for xx in range(x,x+ww,step):
                sprite(name,xx,y,min(step,x+ww-xx),hh,stretch=name=='counter')
        else:
            sprite(name,x,y,ww,hh)
        if p.get('label'):
            label=p['label']; f=font(12)
            bounds=d.textbbox((0,0),label,font=f)
            tw=bounds[2]-bounds[0]
            xx=round((x+ww/2)*T-tw/2); yy=round(y*T-14)
            d.rectangle((xx-3,yy-2,xx+tw+3,yy+13),fill='#e7ddb2',outline='#6b6c50')
            d.text((xx,yy),label,font=f,fill='#405842')

    for warp in m['warps']:
        x,y=warp['x'],warp['y']
        target=maps[str(warp['to'])]
        if m['inside'] and (x in (0,w-1) or y in (0,h-1)):
            terrain(m['art']['floor'],x,y,1,1)
        if m['inside'] and not target['inside']:
            rect(x,y,1,1,'#ae6e60')
            d.line((x*T+2,y*T+4,(x+1)*T-3,y*T+4),fill='#d6bd90',width=2)
        elif not m['inside'] and target['inside']:
            rect(x,y,1,.18,'#a79e7b')
    return im.convert('RGB')


char_img=Image.open(os.path.join(ROOT,'assets/chars.png')).convert('RGBA')
with open(os.path.join(ROOT,'js/chars.js'),encoding='utf-8') as f:
    sheets=json.loads(re.search(r'const CHAR_SHEETS = (.*);',f.read()).group(1))


def with_people(im,m,player=None):
    im=im.convert('RGBA')
    people=m['npcs']+m['trainers']+([dict(x=player[0],y=player[1],sprite='player_m',dir='down')] if player else [])
    d=ImageDraw.Draw(im)
    for p in sorted(people,key=lambda p:p['y']):
        sh=sheets[p['sprite']]
        sx,sy=sh['x']+72,sh['y']+sh['dirs'][p['dir']]*104
        sp=char_img.crop((sx,sy,sx+72,sy+104)).resize((36,52),N)
        x,y=round((p['x']+.5)*T-18),round((p['y']+1)*T-50)
        d.ellipse((x+7,y+45,x+29,y+51),fill='#526c4b')
        im.alpha_composite(sp,(x,y))
    return im.convert('RGB')


order=[15,2,1,18,5,9,19,7,21,8,20,6,10,11,14,12,13,17,3,16]
sheet=Image.new('RGB',(1920,5*440+80),'#203d41')
sd=ImageDraw.Draw(sheet)
sd.text((24,18),'冠軍之路  /  社區・校園・市區',font=font(26),fill='#eee1b3')
for i,mid in enumerate(order):
    m=maps[str(mid)]; im=render(m)
    assert im.size==(m['w']*T,m['h']*T)
    im.save(os.path.join(DEST,f'{mid:02d}.png'))
    image=with_people(im,m,(5,5) if mid==15 else None)
    image.thumbnail((456,380),N)
    x,y=(i%4)*480,(i//4)*440+70
    sd.text((x+12,y+8),f'{i+1:02d}  {m["name"]}',font=font(18),fill='#ecdeb3')
    sheet.paste(image,(x+12+(456-image.width)//2,y+42))
sheet.save(os.path.join(DEST,'overview.png'))
# Four full-size representative scenes for art/layout review.
for mid in (1,15,18,11):
    m=maps[str(mid)]
    im=Image.open(os.path.join(DEST,f'{mid:02d}.png'))
    with_people(im,m,(5,5) if mid==15 else None).save(os.path.join(DEST,f'preview-{mid:02d}.png'))
# Preserve the previous preview link while showing the latest layout.
Image.open(os.path.join(DEST,'preview-01.png')).save(os.path.join(DEST,'character-preview.png'))
print('PASS: 20 authored scenes rendered at 32px/tile; character previews and overview written.')
