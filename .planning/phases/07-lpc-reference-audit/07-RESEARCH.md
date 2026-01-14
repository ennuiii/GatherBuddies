# Phase 7: LPC Reference Audit - Research Findings

## Problem Statement

The avatar editor currently shows very limited clothing options. For example, male body type shows no top options (only "None"). This is because the manifest only includes `tshirt` for tops, and tshirt assets only exist for female/teen body types.

## Key Discovery: Two Asset Path Patterns

The codebase has assets organized in two different patterns:

1. **Extended Animation Items** (46 rows with idle/sit/run/walk)
   - Have `"animations"` array in sheet_definitions
   - Support all required game animations
   - Example: `torso_clothes_tshirt.json` - has animations array

2. **Basic Animation Items** (21 rows with walk only)
   - No `"animations"` array in sheet_definitions
   - Only have walk cycle, missing idle/sit/run
   - Example: `torso_clothes_longsleeve.json` - no animations array

## LPC Sheet Definition Structure

Each sheet definition JSON file contains:
- `name`: Display name
- `layer_1`: Body type paths with `zPos` for layering
- `variants`: Available color options
- `animations`: (Optional) Extended animation list when present
- `credits`: Asset attribution

**Critical**: The `layer_1` object keys define which body types are supported:
```json
"layer_1": {
  "zPos": 35,
  "female": "torso/clothes/shortsleeve/tshirt/female/",
  "teen": "torso/clothes/shortsleeve/tshirt/teen/"
  // No "male" key = male not supported
}
```

## Body Types in LPC

From `body.json`:
- male
- muscular
- female
- pregnant
- teen
- child

**Current manifest uses**: male, female, muscular, child, teen (missing pregnant)

## Required Animations

The game requires these animations (from AvatarCompositor.ts):
- **walk**: rows 8-11 (9 frames) - always available
- **idle**: rows 22-25 (2 frames) - extended only
- **run**: rows 34-37 (8 frames) - extended only
- **sit**: rows 30-33 (3 frames) - extended only

Items without extended animations use walk fallback for all animations.

## Clothing Analysis

### Tops (torso/clothes)

**WITH Extended Animations (has `animations` array):**
| Item | Body Types | In Game Assets? |
|------|-----------|-----------------|
| tshirt | female, teen | Yes |
| tshirt_buttoned | female, teen | Yes (buttoned folder) |
| tshirt_scoop | female, teen | Yes (scoop folder) |
| tshirt_vneck | female, teen | Yes (vneck folder) |
| longsleeve2 | female, teen | Yes |
| longsleeve2_buttoned | female, teen | Yes |
| longsleeve2_cardigan | female, teen | Yes |
| longsleeve2_polo | female, teen | Yes |
| longsleeve2_scoop | female, teen | Yes |
| longsleeve2_vneck | female, teen | Yes |
| sleeveless2 | female, teen | Yes |
| sleeveless2_buttoned | female, teen | Yes |
| sleeveless2_polo | female, teen | Yes |
| sleeveless2_scoop | female, teen | Yes |
| sleeveless2_vneck | female, teen | Yes |
| shortsleeve_polo | female, male, pregnant, teen | Yes |

**WITHOUT Extended Animations (walk only):**
| Item | Body Types | In Game Assets? |
|------|-----------|-----------------|
| longsleeve | female, male, pregnant, teen | Yes |
| shortsleeve | female, male, pregnant, teen | Yes |
| sleeveless | male, female | Yes |

### Bottoms (legs)

**WITH Extended Animations:**
| Item | Body Types | Notes |
|------|-----------|-------|
| pants | male, muscular, female, teen, pregnant | male/muscular use `male/`, others use `thin/` |
| pants2 | male, muscular, female, teen, pregnant | Same pattern |
| shorts | male, female, teen, pregnant | male uses `male/`, others use `thin/` |
| shorts_short | female, teen | |
| leggings | female | |
| leggings2 | female, teen | |
| pantaloons | male, muscular, female, teen, pregnant | |
| formal | male, female, teen, pregnant | |
| formal_striped | male, female, teen, pregnant | |
| cuffed | male | |
| fur | male | |
| hose | male, muscular | |

### Shoes (feet)

**WITH Extended Animations:**
| Item | Body Types | Notes |
|------|-----------|-------|
| shoes2 | male, female, teen, pregnant | male uses `male/`, others use `thin/` |
| boots2 | male, female, teen, pregnant | Same pattern |
| socks_ankle | female, teen | |
| socks_high | female, teen | |
| socks_tabi | female | |

## Root Cause Analysis

1. **Current Manifest Problem**: Only includes `tshirt` for tops, which only supports female/teen
2. **Male Body Missing Tops**: All items with extended animations only support female/teen for most tops
3. **shortsleeve_polo Exception**: Has extended animations AND supports male body type

## Recommendations

### Option A: Extended Animations Only (Strict)
Only allow items with `animations` array in sheet definition. This ensures proper idle/sit/run animations but limits options severely for male body.

**Valid tops for male**: shortsleeve_polo only
**Valid bottoms for male**: pants, pants2, shorts, pantaloons, formal, formal_striped, cuffed, fur, hose

### Option B: Allow Walk Fallback (Current Behavior)
Allow items without extended animations, using walk cycle as fallback for idle/sit/run. This is what the compositor already does but may look awkward.

**Adds tops for male**: longsleeve, shortsleeve, sleeveless

### Option C: Hybrid Approach (Recommended)
1. Mark items without extended animations in manifest
2. Still show them but with "(walk anim)" suffix
3. User can choose: more options with visual compromise OR proper animations with fewer options

## Path Resolution Patterns

The game assets use complex path patterns. From AvatarAssetLoader.ts analysis:

```
Body-specific assets: avatars/lpc/{category}/{subcategory}/{item}/{bodyType}/
Example: avatars/lpc/torso/clothes/shortsleeve/tshirt/female/white.png

Some items use "thin" instead of specific body type for female/teen/pregnant
Example: avatars/lpc/legs/pants/thin/white.png (used by female/teen)
```

## Implementation Strategy for Phase 8

1. **Update AvatarManifest.ts** to include:
   - All valid clothing items from LPC-Reference
   - `supportedBodyTypes` array from sheet_definition layer_1 keys
   - `hasExtendedAnimations` boolean flag

2. **Update Avatar Editor UI**:
   - Filter options by current body type
   - Gray out incompatible items with tooltip explaining why
   - Optionally indicate items with walk fallback

3. **Add validation in AvatarCompositor**:
   - Log warning when using fallback animations
   - Track which combinations are being used for debugging

## Files to Modify

- `GameBuddiesHub/client/src/services/AvatarManifest.ts` - Add all valid items
- `GameBuddiesHub/client/src/services/AvatarAssetLoader.ts` - May need path fixes
- `GameBuddiesHub/client/src/game/scenes/AvatarEditorScene.ts` - Filtering and UX
