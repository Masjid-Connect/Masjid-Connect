# Line-Art Asset Prompts

Authoritative prompts for AI-generated line art assets — run on **Runware** or **Google Nano Banana 2 (Gemini 3 Pro Image)**.

Every asset is one motif, palette-matched, regional-provenance-grounded. Reviewed by Seat 23 (Khadija Benali, Islamic Visual Tradition) before landing. See `projects/mosque-connect/DESIGN.md` § Imagery for the governing doctrine.

## Palette reference for prompts

- **Ground**: warm off-white `#F9F7F2` (Stone-100) — "aged paper" or "masjid marble"
- **Line (primary)**: deep sapphire `#0F2D52` (Sapphire-700) or near-black `#121216` (Onyx-900)
- **Line (accent)**: divine gold `#D4AF37` — use sparingly, for a single emphasis element
- **Forbidden**: gradients, full-colour fills, photorealistic textures, outer glow, emboss, shadow stacks

## Output spec

- **Dimensions**: 2048×2048 (square); crop as needed downstream. For full-bleed heroes, generate 2560×1440 landscape variant.
- **Format**: PNG with transparent background where possible (Runware supports this). WebP for final web delivery (converted downstream).
- **Style**: line art only. No shading, no fill, no gradient. Think "restrained woodcut" or "architectural drawing."

---

## Asset 1 — Moroccan zellige geometric pattern (`pattern-zellige-fez.png`)

**Use**: mobile prayer hero backdrop at 8–10% opacity (single visible moment), about-page section divider, web landing atmospheric watermark. Replaces the generic 8-point star pattern currently used as wallpaper.

**Runware / Nano Banana prompt**:

```
Moroccan zellige geometric pattern, Fez tradition, 8-fold rotational
symmetry, interlocking stars and polygons, single tile repeat pattern,
1.5px hairline line art on warm off-white ground (#F9F7F2), lines in
deep sapphire blue (#0F2D52), no fill, no shading, no gradient, no
color beyond line and ground, flat vector illustration style,
traditional zellige tilework precision, Alhambra-adjacent aesthetic,
architectural drawing quality, minimal, elegant, 2048x2048 square tile,
transparent background
```

**Negative prompt** (if the platform accepts one):

```
photographic, photorealistic, colorful, rainbow, gradient, emboss, 3d,
shading, drop shadow, glow, lens flare, instagram, western geometric,
generic islamic pattern, clipart, tourist art, oversaturated
```

---

## Asset 2 — Persian girih strapwork (`pattern-girih-isfahan.png`)

**Use**: splash screen ambient pattern (replaces current 8-point star on splash). Prayer-change transition overlay at 10–12% opacity during the sacred-moment sequence (see DESIGN.md § Motion Vocabulary).

**Runware / Nano Banana prompt**:

```
Persian girih strapwork pattern, Isfahan Safavid tradition, interlaced
polygonal strapwork, pentagonal and decagonal units, woven-over-under
linework, 1.5px hairline line art on warm off-white ground (#F9F7F2),
lines in deep sapphire blue (#0F2D52), no fill, no shading, no
gradient, flat vector illustration, traditional Islamic geometric
mathematics, Shaykh Baha'i era precision, architectural drawing
quality, minimal, 2048x2048 square, transparent background
```

**Negative prompt**: same as Asset 1.

---

## Asset 3 — Cufic square calligraphic composition (`pattern-kufic-square.png`)

**Use**: about page section dividers, 404 page atmospheric element, prayer-tab ambient texture on live-lesson screen.

**Runware / Nano Banana prompt**:

```
Square Kufic calligraphy composition, decorative geometric Kufic
lettering, abstract rectilinear Arabic letterforms forming a square
arabesque, Mamluk or Ayyubid architectural tradition, 2px line weight
on warm off-white ground (#F9F7F2), lines in deep sapphire blue
(#0F2D52), no fill, no shading, no Arabic text readable content (pure
decorative form only — do NOT attempt legible Arabic words), flat
vector geometric calligraphy style, architectural stone-inlay
aesthetic, minimal, 2048x2048 square, transparent background
```

**Important note**: specifically instructs "no readable Arabic" because AI models produce unreliable (often wrong or nonsense) Arabic calligraphy. Khadija (Seat 23) mandate: Arabic-as-content is sourced from a calligrapher, never AI. This asset is abstract square-Kufic *form*, not legible text.

**Negative prompt**: same as Asset 1 + "readable arabic text, arabic calligraphy content, wrong diacritics, distorted arabic letters".

---

## Asset 4 — Masjid exterior line drawing (`masjid-exterior-line.png`)

**Use**: full-bleed moment on web `/about.html` (replaces the absent photography), section break on web `/index.html`. Optional: mobile welcome screen background at 15% opacity.

**Runware / Nano Banana prompt**:

```
Line drawing of a small British urban Salafi masjid exterior, red-brick
terraced street context (Birmingham Small Heath), minaret subordinate
or absent (Salafi masjids typically modest architectural form — a
converted terraced building with a single Islamic archway entrance, no
dome-and-minaret cliché), evening light direction implied by line
weight variation only, 1.5–2px hairline line art, lines in deep
sapphire blue (#0F2D52) on warm off-white ground (#F9F7F2), no fill,
no tonal shading, contour drawing with minimal architectural detail,
wide landscape composition 2560x1440, transparent background, feels
drawn by an architect not a tourist
```

**Important**: the prompt explicitly rejects the "dome-and-minaret" cliché because Salafi masjids in British urban contexts are typically converted buildings — modest, architectural, not fantasy-Orientalist. User memory already flags this: "No Dome Silhouette — user rejected generic mosque dome as too generic."

**Negative prompt**: same as Asset 1 + "dome, golden dome, tall minaret, desert palm tree, crescent moon in sky, orientalist, arabian nights, disney aladdin".

---

## Asset 5 — Mihrab arch line detail (`mihrab-arch-line.png`)

**Use**: web `/404.html` as the single visual moment — a quiet architectural detail over the sapphire field. Mobile splash alternative variant.

**Runware / Nano Banana prompt**:

```
Single Islamic mihrab arch, line drawing, architectural detail,
classical pointed arch with muqarnas stalactite honeycombing in the
niche, Moroccan or Andalusian proportions, 1.5px hairline line art,
lines in deep sapphire blue (#0F2D52) on warm off-white ground
(#F9F7F2), no fill, no shading, no gradient, contour drawing with
restrained decorative detail on the arch face only, centered
composition, 2048x2048, transparent background, architectural drawing
precision, Alhambra-adjacent
```

**Negative prompt**: same as Asset 4.

---

## Asset 6 — Minbar silhouette (`minbar-silhouette-line.png`)

**Use**: web `/about.html` section break between "The Masjid" and "Why This App Exists." Possibly mobile `/about.tsx` section divider.

**Runware / Nano Banana prompt**:

```
Traditional Islamic minbar (pulpit) silhouette, line drawing, side
profile, classical wooden stepped design with pointed-arch canopy,
Mamluk or Ottoman tradition, 1.5px hairline line art, lines in deep
sapphire blue (#0F2D52) on warm off-white ground (#F9F7F2), no fill,
no shading, restrained geometric carving suggested through line
alone, tall vertical composition 1024x2048, transparent background,
architectural drawing quality
```

**Negative prompt**: same as Asset 4.

---

## Runware API usage notes (for automated batch generation)

- Endpoint: `POST https://api.runware.ai/v1`
- Auth: `Authorization: Bearer <RUNWARE_API_KEY>`
- Model: recommend `runware:97@1` (Gemini-compatible photo-real) OR `runware:100@1` (Flux Schnell for fast iteration). Test both per prompt; line art often responds better to different models.
- Task type: `imageInference`
- Request shape (one image):

```json
{
  "taskType": "imageInference",
  "taskUUID": "<uuid>",
  "positivePrompt": "<prompt from above>",
  "negativePrompt": "<negative prompt>",
  "width": 2048,
  "height": 2048,
  "model": "runware:100@1",
  "numberResults": 4,
  "outputFormat": "PNG"
}
```

- Generate 4 candidates per prompt (`numberResults: 4`), select best manually.
- Iterate the prompt; line art often needs 2–3 revisions to land cleanly.

## Nano Banana 2 / Gemini 3 Pro Image usage notes

- Model: `gemini-3.0-pro-image` (confirm exact model ID at generation time; Google changes these).
- Endpoint: via Google AI Studio or `generativelanguage.googleapis.com`.
- Prompts above work as-is — Nano Banana 2 takes long natural-language prompts well. It tends to produce cleaner line art than Flux-family models, especially for geometric content.
- Watermarking: Nano Banana 2 applies SynthID invisible watermarking to all outputs. Acceptable for our use.

## Versioning

Each prompt above is version 1. If a prompt is revised (e.g. zellige v2 to emphasise certain proportions), create a versioned heading (`### Asset 1 v2`) and keep the v1 below for diff-ability. Don't silently overwrite.

## Review gate

No generated asset lands in the repo without Seat 23 sign-off. When a batch of candidates is generated, post them to the review flow (or paste into this conversation for me to review with Khadija's mandate applied) before committing.
