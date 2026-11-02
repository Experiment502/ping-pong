# Map art sources

Original sprite atlases generated with the built-in imagegen tool, then packed by tools/draw_pixel_maps.py. Each atlas has four rows and four columns. Keep these source PNGs when rebuilding.

Art direction reference: Pokémon Emerald GBA overworld, especially [Littleroot Town](https://sunbro.dev/posts/2020-05-15-romhack-map-editing/). No game tiles were downloaded or copied into the project.

## Outdoor prompt

Create a production game sprite atlas for an original Taiwanese school table-tennis RPG. MUST strongly match authentic Pokemon Emerald / Ruby Sapphire Game Boy Advance overworld pixel-art: simple 16-color-per-object palettes, saturated spring grass greens, small hand-clustered pixel leaves, visible square pixels, hard aliased outlines, no gradients, no realistic textures, no modern HD rendering, no isometric camera. Classic overhead view with visible south-facing building facades. Treat the whole image as 256x256 logical pixels enlarged exactly 4x to a 1024x1024 PNG. EXACT 4 columns x 4 rows of equally-sized 256x256 pixel cells, no margins between cells, no captions or labels. Each sprite centered in its cell; no sprite crosses cells. Transparent empty space around isolated sprites. Grid tile cells must fill their entire cell, seamlessly repeat.
Row 1 left to right: (1) seamless bright Emerald light green grass ground with very sparse tiny 3-pixel grass tufts, NO grid lines (2) seamless warm cream sandy walking path, minimal detail, NO outlines (3) seamless muted gray town cobblestone pavement tile (4) seamless clear blue water with simple white pixel ripples.
Row 2: (1) one large dense round Emerald-style TREE with multi-lobed leafy crown three distinct green tones and small brown trunk, flat shadow, fills cell (2) a low rounded green hedge bush cluster (3) small red and yellow flowers in grass, ground tile fills cell (4) horizontal short white wooden fence, transparent below.
Row 3: (1) a small cozy red roof cream wall house, tiled sloped roof, two blue windows, CENTRAL dark entrance doorway at bottom center, facade and roof like Littleroot Town (2) same size blue roof cream house (3) same size orange roof cream house (4) a wide two-storey school facade with teal roof and rows of windows, CENTRAL entrance on bottom, fully visible.
Row 4: (1) circular stone fountain blue water (2) a little wooden signpost blank sign (3) a Victorian simple town lamppost (4) a pale gray boulder cluster.
Keep all house grounds transparent; consistent sprite scale; clean low-resolution game-ready sprites. Do not include Pokemon, characters, logos, UI, text, borders, grid lines, palette swatches.

## Indoor prompt

Create a production INTERIOR sprite atlas for an original Taiwanese school table-tennis RPG, matching Pokemon Emerald GBA houses and schools: true low-resolution hand-pixelled art, simple bounded palettes, hard square pixels, charming warm wood and cream floors, furniture seen from classic overhead view with visible south-facing fronts, NOT isometric, no gradients no photorealism. 256x256 logical pixels enlarged 4x to 1024x1024. EXACT 4 columns x 4 rows equally-sized 256x256 cells, no gutters, no labels, each sprite contained in cell. Transparent empty space around isolated objects; floor and wall tiles fully fill their cell and seamlessly repeat. No outlines around floor tiles.
Row 1 left to right: (1) seamless warm honey wood plank floor (2) seamless cream school floor small speckled tile (3) wall tile with cream upper plaster and muted brown wood paneling at bottom, a simple school window (4) single blue blanket bed with white pillow and wooden frame, overhead Pokemon bedroom style.
Row 2: (1) small wooden student writing desk with tiny open book, green seat tucked below, fits a single room grid space (2) full bookcase with colorful books and visible wooden front (3) green upholstered sofa overhead (4) small television on wooden stand, television facing south, CRT blue screen.
Row 3: (1) overhead oval wooden dining table with tea cup (2) compact kitchen counter with sink stove (3) potted green plant in terracotta pot (4) wooden staircase viewed overhead, going north, ten pale brown steps with dark risers.
Row 4: (1) blue-green table tennis table seen from overhead, white court lines and central net, small legs south, exactly rectangular long north-south (2) green classroom chalkboard with tan frame and illegible tiny chalk strokes (3) service counter wooden top and cream front, facing south (4) wooden wardrobe tall cabinet with two doors.
All objects must be crisp simple authentic 2004 GBA 16-bit tile art, not detailed modern pixel art. Sprites comfortably fit cells with small empty margins. NO characters, text, UI, grids, swatches or labels.

