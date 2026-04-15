# Line-Art Asset Prompts

Authoritative prompts for AI-generated line art assets. Governed by `projects/mosque-connect/DESIGN.md` § Imagery. Reviewed by Seat 23 (Khadija Benali) before landing in the repo.

## Status (2026-04-15)

Council narrowed the line-art programme. Current policy:

- **Active**: Asset 1 only (Marinid zellige watermark for `support.tsx` hadith card). Test the pipeline end-to-end on one asset, see it on-device, decide whether to expand.
- **Deferred (not blocked)**: Assets 2, 3, 5 — abstract geometric / calligraphic-form patterns. Pipeline-ready; only ship after Asset 1 is validated.
- **BLOCKED by Seat 23 (Khadija)**: Assets 4 and 6 (Masjid exterior, minbar silhouette). AI-generated architectural representation risks orientalist pastiche. Re-consider only with a named photographic reference and a human review pass.

## Model policy (Option B, chosen 2026-04-15)

Right tool per job, not one-model-for-everything:

- **Geometric / pattern work (Asset 1, 2)**: **Flux** on Runware (model `runware:100@1`), ideally with a real zellige/girih photo as image-conditioning reference so the pattern comes from the tradition, not from model invention.
- **Calligraphic-form work (Asset 3)**: Flux with strict negative prompting on "readable Arabic" — no model attempts legible Arabic text on this project.
- **Photoreal / editorial imagery (Assets 4-6 when unblocked)**: **Google Nano Banana 2** (`gemini-3.0-pro-image`) on Runware. Stronger for scene composition; layout-aware.
- **Never use**: generic "Midjourney-default" style. Never prompt without a named tradition (Marinid, Safavid, etc.).

Authority: Seat 25 (Kira Takahashi, Technical Prompt Engineering). This split is written into COUNCIL.md seat mandates and is not a per-asset judgement call.

## Palette reference for prompts (Candidate A, shipped 2026-04-15)

- **Ground (paper)**: warm paper `#F2EBD8` (Stone-100). Older value `#F9F7F2` is obsolete.
- **Line (primary)**: deep sapphire `#0F2D52` (Sapphire-700) or midnight `#06101F` (Midnight-950) for on-midnight surfaces
- **Line (accent) on paper**: divine gold `#C99A2E` — use sparingly, one emphasis element max
- **Line (accent) on midnight**: gilt `#D4A03A` — reserved for midnight surfaces
- **Forbidden**: gradients, full-colour fills, photorealistic textures, outer glow, emboss, shadow stacks

## Output spec

- **Dimensions**: 2048×2048 square (tile-able); for full-bleed heroes, 2560×1440 landscape.
- **Format**: PNG with transparent background. WebP for final web delivery (converted downstream).
- **Style**: line art only. No shading, no fill, no gradient. "Restrained woodcut" or "architectural drawing" register.

---

## Asset 1 — Marinid zellige geometric tile (`pattern-zellige-fez.png`) — **ACTIVE**

**Status**: Council-approved for generation. First asset to ship.

**Use**: `support.tsx` hadith card background at 8% opacity — decorative paper-texture watermark behind the hadith text. Other potential uses (web about section divider, mobile splash ambient) require a separate review after Asset 1 ships and is validated in context.

**Model**: **Flux** on Runware (`runware:100@1`). Not Nano Banana — geometric patterns respond better to Flux, especially with an image-conditioning reference photo of real Fes zellige.

**Runware prompt** (Flux):

```
Moroccan zellige geometric tile, Marinid Fes tradition 13th-14th c.,
8-fold rotational symmetry, interlocking 8-pointed stars and hexagonal
polygons, single tile repeat pattern photographed flat on a limewashed
wall, natural daylight single source no harsh shadows, 1.5px hairline
line art on warm paper ground (#F2EBD8), lines in deep sapphire blue
(#0F2D52), no fill, no colour beyond line and ground, flat vector
illustration style, traditional zellige tilework precision, Qarawiyyin
mosque reference aesthetic, architectural drawing quality, minimal,
elegant, 2048x2048 square tile, transparent background
```

**Negative prompt** (if the platform accepts one):

```
photographic, photorealistic, colorful, rainbow, gradient, emboss, 3d,
shading, drop shadow, glow, lens flare, instagram, western geometric,
generic islamic pattern, clipart, tourist art, oversaturated
```

---

## Asset 2 — Persian girih strapwork (`pattern-girih-isfahan.png`) — **DEFERRED**

**Status**: Pipeline-ready, awaiting Asset 1 validation before generating.

**Use**: splash screen ambient pattern (replaces current 8-point star on splash). Prayer-change transition overlay at 10–12% opacity during the sacred-moment sequence (see DESIGN.md § Motion Vocabulary).

**Model**: Flux on Runware — same reasoning as Asset 1.

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

## Asset 3 — Cufic square calligraphic composition (`pattern-kufic-square.png`) — **DEFERRED**

**Status**: Pipeline-ready, awaiting Asset 1 validation before generating.

**Use**: about page section dividers, 404 page atmospheric element, prayer-tab ambient texture on live-lesson screen.

**Model**: Flux on Runware with strict negative prompting on readable Arabic (see note below).

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

## Asset 4 — Masjid exterior line drawing (`masjid-exterior-line.png`) — **BLOCKED**

**Status**: BLOCKED by Seat 23 (Khadija Benali, Islamic Visual Tradition) on 2026-04-15. AI-generated architectural representation of a specific masjid risks orientalist pastiche, even with the "no dome, no minaret" guardrail. Unblocking requires a real photographic reference of the actual Salafi Masjid Birmingham building and a human review pass. Not a modelling failure — a doctrine choice.

**Use (if/when unblocked)**: full-bleed moment on web `/about.html` (replaces the absent photography), section break on web `/index.html`. Optional: mobile welcome screen background at 15% opacity.

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

## Asset 5 — Mihrab arch line detail (`mihrab-arch-line.png`) — **DEFERRED**

**Status**: Pipeline-ready, awaiting Asset 1 validation. Weaker orientalism risk than Assets 4/6 because the mihrab is a universal-classical Islamic architectural element rather than a representation of a specific building.

**Use**: web `/404.html` as the single visual moment — a quiet architectural detail over the midnight field. Mobile splash alternative variant.

**Model**: Nano Banana 2 — architectural composition benefits from the photoreal/editorial model. Still prompted with line-art style directive.

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

## Asset 6 — Minbar silhouette (`minbar-silhouette-line.png`) — **BLOCKED**

**Status**: BLOCKED by Seat 23 on 2026-04-15. Same reasoning as Asset 4: architectural representation requires real reference, not model invention. A minbar is too specific a liturgical object to AI-generate in its first pass. Unblocking requires a photo reference of a minbar in a comparable Salafi tradition.

**Use (if/when unblocked)**: web `/about.html` section break. Possibly mobile `/about.tsx` section divider.

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
