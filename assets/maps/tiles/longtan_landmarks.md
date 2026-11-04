# Longtan landmark assets and geographic adaptation

Generated with the built-in imagegen tool. File: longtan_landmarks.png. Four sprites: Longyuan Temple-inspired temple, lake-island shrine, Taiwanese streetfront, and snack stall. The existing outdoor.png is the style reference.

The user-provided map determines the district layout: Longyuan Temple/city to the north, Longtan Pond/park to the west, Shuanglong Elementary School to the south, protagonist home at 大同路58巷3號 to the southeast. Home placement follows the supplied residential marker; no precise address coordinates were fetched. Roads, service buildings, shore outline and landmarks are adapted for gameplay, not reproduced at surveyed scale. The school retains the previously approved campus and interior design. The competition gym, shop and repair center are game locations in the temple district.

## Public landmark references

- [Longyuan Temple commercial district — Taoyuan tourism](https://travel.tycg.gov.tw/zh-tw/Travel/Attraction/1161)
- [Longtan Tourist Pond — Taoyuan tourism](https://travel.tycg.gov.tw/zh-tw/travel/attraction/332)
- [Longyuan Temple — Taoyuan local education material](https://tlc.tyc.edu.tw/temples/longyuan-palace/)

## Rebuild and checks

Run tools/build_maps.py then tools/draw_pixel_maps.py. Region positions live in REGIONS in tools/map_layouts.py. Both water collision and rendering use lake_mask, so the island and bridge stay walkable. The movement test verifies the requested compass relationships, the home label, lake blocking, bridge crossing and all portals.

## Imagegen prompt

Create an original game sprite atlas for a top-down Pokemon Emerald-inspired Taiwanese table-tennis RPG set around Longtan, Taoyuan. Reference image is STYLE and pixel-density reference only: match its stepped dark outlines, limited saturated palette, readable roof tiles and warm wall materials.
EXACT 2 columns by 2 rows, 4 equally-sized cells, transparent background. EVERY asset must stay fully inside its cell with generous 10 percent empty margins on all sides; no object crosses the horizontal or vertical cell centers. Each sprite centered. Four objects only, no labels, no ground or background scene. Landscape within each cell where appropriate.
TOP LEFT: a Taiwanese LONGYUAN TEMPLE-inspired building, ornate traditional red/orange tiled swallowtail roof with upward-curving corners, two small green/gold dragon ornaments on central ridge, red columns, dark gold carved trim, three dark entrance bays with central bay wider, cream stone base and front steps, subtle blue-gray stone lions either side. South-facing front facade visible with top-down roof projection. Roof roughly twice as wide as tall. No written text or signs.
TOP RIGHT: a small Taiwanese lake-island shrine pavilion, warm red double-eaved pagoda-like roof, four red pillars, cream stone platform, no surrounding water or island, a compact secondary landmark.
BOTTOM LEFT: a modest Taiwanese two-shop streetfront with a flat cream concrete parapet, two green and blue awnings, a shutter and open display, warm gray walls, a little tiled entrance, no written signage.
BOTTOM RIGHT: a small traditional temple-plaza snack/market stall, red-orange striped canopy, wooden counter with a few steaming bowls and green produce baskets, compact neat design.
All four must be in the SAME authentic low-resolution GBA 16-bit overworld pixel style, logical atlas around 256x256 pixels enlarged nearest-neighbor; hard crisp square pixels, 3-4 flat shades per material, no gradients, no vector-like flatness, no photorealistic texture, no isometric diagonals. Classic overhead view and visible south-facing fronts, same projection as reference houses. No Pokemon, people, text, letters, grid lines, labels, logos, UI, watermarks, palette swatches or scenery.

