# Avatar Assets

This directory contains LPC (Liberated Pixel Cup) sprite sheets for the avatar customization system.

## Directory Structure

```
avatars/
├── bodies/
│   ├── masculine/  (light.png, fair.png, olive.png, tan.png, dark.png)
│   ├── feminine/   (same skin tones)
│   └── neutral/    (same skin tones)
├── hair/           (short.png, long.png, curly.png, etc.)
├── tops/           (tshirt.png, hoodie.png, jacket.png)
├── bottoms/        (jeans.png, shorts.png, skirt.png)
├── shoes/          (sneakers.png, boots.png)
└── accessories/    (glasses.png, hat_cap.png)
```

## Asset Format

All sprites must follow the LPC Universal format:
- **Dimensions**: 64x64 pixels per frame
- **Layout**: 13 columns x 21 rows (standard LPC Universal)
- **Format**: PNG with transparency

## Getting Assets

Use the Universal LPC Spritesheet Character Generator:
https://sanderfrenken.github.io/Universal-LPC-Spritesheet-Character-Generator/

### Body Sprites
1. Select a body type and skin color
2. Remove all other layers (hair, clothes, etc.)
3. Export as PNG
4. Save as `bodies/{bodyType}/{skinTone}.png`

### Hair Sprites
1. Start with transparent body option
2. Add desired hair style
3. Export as PNG (hair layer only)
4. Save as `hair/{style}.png`

For hair styles with back layers (long, ponytail):
- Export the back portion separately as `hair/{style}_back.png`

### Clothing Sprites
Export each clothing item separately:
- Base color should be white/neutral for tinting
- Tops: `tops/{item}.png`
- Bottoms: `bottoms/{item}.png`
- Shoes: `shoes/{item}.png`

### Accessories
Export each accessory on transparent background:
- Save as `accessories/{type}.png`

## Required Assets (MVP)

### Bodies (15 files)
- `bodies/masculine/{light,fair,olive,tan,dark}.png`
- `bodies/feminine/{light,fair,olive,tan,dark}.png`
- `bodies/neutral/{light,fair,olive,tan,dark}.png`

### Hair (8 files)
- `hair/short.png`
- `hair/long.png`, `hair/long_back.png`
- `hair/curly.png`
- `hair/ponytail.png`, `hair/ponytail_back.png`
- `hair/mohawk.png`
- `hair/afro.png`
- `hair/bob.png`

### Tops (6 files)
- `tops/tshirt.png`
- `tops/hoodie.png`
- `tops/jacket.png`
- `tops/dress.png`
- `tops/tanktop.png`
- `tops/suit.png`

### Bottoms (5 files)
- `bottoms/jeans.png`
- `bottoms/shorts.png`
- `bottoms/skirt.png`
- `bottoms/pants.png`
- `bottoms/sweatpants.png`

### Shoes (4 files)
- `shoes/sneakers.png`
- `shoes/boots.png`
- `shoes/sandals.png`
- `shoes/dress_shoes.png`

### Accessories (6 files)
- `accessories/glasses.png`
- `accessories/hat_cap.png`
- `accessories/hat_beanie.png`
- `accessories/earrings.png`
- `accessories/necklace.png`
- `accessories/mask.png`

## License

LPC assets are licensed under CC-BY-SA 3.0 / GPL 3.0.
Attribution must be provided in the game credits.
