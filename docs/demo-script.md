# Draft Intelligence — demo script

A deterministic draft + swap set for recording a short demo, plus a spoken
script to go with it. All numbers below were pulled live from the frozen
`draft-logreg-v1` model on 2026-09-02 (re-run this before recording if the
model is ever re-frozen — it's a git-committed artifact, so it shouldn't
drift, but verify rather than assume).

## The demo draft

**Blue**: Ornn (Top) / Vi (Jungle) / Ahri (Mid) / Jinx (ADC) / Thresh (Support)
**Red**: Darius (Top) / Elise (Jungle) / Syndra (Mid) / Vayne (ADC) / Nautilus (Support)

**Original result**: Slight Red Edge · 30th percentile · Low confidence · no warnings

This draft was chosen because it's a clean baseline — ordinary, well-supported
champion-role picks on both sides, no rare-combination warnings, and a result
that's interesting (not dead even, not extreme) without needing any caveats
explained before you can move on to the counterfactual feature.

## Counterfactual swaps (Explore Alternatives → Blue Top)

All three compare against the *same* original above — not against each other.

| Champion | Percentile | Δ from original | Advantage | Confidence |
|---|---|---|---|---|
| **Camille** | 44th | **↑ 14 pts** | Slight Red Edge → **Roughly Even** | Low |
| Malphite | 23rd | ↓ 7 pts | Slight Red Edge | Low |
| Gnar | 22nd | ↓ 8 pts | Slight Red Edge | Low |

**Camille is the headline swap** — the largest movement, and the only one of
the three that flips the qualitative label (Slight Red Edge → Roughly Even),
with no confidence caveat to explain. Gnar and Malphite are good second/third
picks to show "test a few, compare side by side" without re-explaining
anything.

*(Not used in the main recording, but worth knowing it's there if a Q&A comes
up: swapping Blue Top to Soraka in this same draft produces 40th percentile,
+10 pts, Slight Red Edge → Roughly Even, but with a `very_low` confidence
warning — a good live example of the rare-pick warning if someone asks to
see it.)*

## Spoken script (~75s)

**1. Hook (5s)**
"This is Draft Intelligence — I trained a model on real ranked matches to
see how much a draft's champion picks alone say about how it stacks up
historically."

**2. Show the draft input (10s)**
"You pick all ten champions — five per side, one per role — with search and
duplicate prevention built in." *(fill the board, or show it pre-filled)*

**3. Analyze (10s)**
"Hit Analyze, and it scores the draft against a reference population of
real ranked games — here, a Slight Red Edge, 30th percentile, low
confidence."

**4. ML honesty (15s)**
"Here's the important part — I tested this pretty rigorously, including
rolling evaluation across future patches, and champion picks alone turned
out to be a real but weak and unstable signal. So instead of pretending to
give you an exact win probability, it reports a relative historical
score — honest about what the data actually supports."

**5. Counterfactual feature (25s)**
"The feature I'm most proud of: Explore Alternatives. I can hold the other
nine picks fixed, swap just Blue Top, and see how the model's assessment
moves." *(swap to Camille)* "Ornn was 30th percentile — Camille moves it to
44th, a 14-point jump, and it actually flips from Slight Red Edge to
Roughly Even. Every comparison is against that same original draft, so
they're all apples-to-apples." *(optionally test Gnar/Malphite too)*

**6. Technical close (10s)**
"End to end: Riot API match data → a Python ML pipeline → a frozen
logistic regression model served by FastAPI → this Next.js UI."
