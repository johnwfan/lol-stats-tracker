# Draft Intelligence — project explanation

## 30-second explanation

I built an ML-powered feature for my League of Legends stats tracker that
scores a 10-champion draft against a model trained on 14,826 real ranked
matches. Instead of claiming an exact win probability — which my own
evaluation showed the data doesn't support — it reports a relative
historical percentile, and lets you swap one champion at a time to see how
that score moves while the other nine picks stay fixed.

## 2-minute explanation

**Problem.** League drafts get discussed in terms of "good" or "bad"
compositions all the time, usually as gut feeling. I wanted to find out
whether there's real, measurable historical signal in champion-role
composition alone — and if there is, build a feature that surfaces it
honestly rather than overselling it.

**Implementation.** I built the full pipeline myself: a Riot API match
collector, feature engineering (10 champion-role categorical columns,
one-hot encoded, with rare combinations below a frequency threshold grouped
together instead of exploding into hundreds of near-unique sparse columns),
and a logistic regression baseline. From there I spent several days testing
whether more model complexity (CatBoost), more data, a different skill-tier
population, or an additional feature family (bans) would meaningfully
improve it.

**ML evaluation.** The key finding, repeated across every angle I tried:
draft-only composition is a real but weak and unstable signal. Rolling
forward-patch evaluation — training only on patches before the one being
tested, repeated across 5 patches — gave a mean ROC-AUC around 0.51, barely
above chance. Regularization tuning, a gradient-boosted model, more
training data, and different skill-tier cohorts were all tested and none
produced a reliable improvement.

**Product decision.** Rather than ship a model that implies a precise win
probability the evidence doesn't support, I designed the product around
that finding: a relative model-score percentile, qualitative labels
("Slight Blue Edge," etc.), explicit low/very-low confidence, and a
counterfactual explorer that shows how the *same* model's score moves when
one pick changes — always framed as a model-score comparison, never a win
prediction or a recommendation.

## Hard questions I should be able to answer

**Why logistic regression?**
Tested head-to-head against CatBoost in a controlled comparison and it
performed statistically indistinguishably on log loss, Brier score, and
accuracy. It's simpler and more interpretable, and nothing in the
evaluation justified the added complexity.

**Why not CatBoost?**
It did score marginally higher on ROC-AUC, but that edge came from a single
fold out of five rolling evaluation folds — CatBoost actually lost the
other three — and it showed a measurably larger train/test performance gap
(~0.10 AUC), a sign of overfitting on a dataset this size relative to how
sparse the one-hot feature space is (541 columns from 14,826 rows).

**What is overfitting?**
A model fitting noise or idiosyncrasies specific to the training data
rather than a pattern that generalizes. I saw direct evidence of it here:
CatBoost scored noticeably better on training data than on held-out test
data, while logistic regression's train/test gap stayed small.

**Why rolling temporal (forward-patch) validation instead of a single
train/test split?**
Champion balance changes patch to patch. A single random split risks
letting the model "see" future-patch information during training, and a
single split can just get lucky or unlucky. Training only on patches
strictly before the test patch, repeated across 5 patches, mirrors the
actual deployment scenario — predicting on metas the model hasn't seen —
and gives an honest performance estimate instead of an inflated one.

**What is data leakage, and how did you avoid it?**
Information that wouldn't actually be available at prediction time leaking
into training and inflating results. Two disciplines here: draft-only
features (no post-game stats like KDA or gold — the product predicts
*before* the game starts, so training on outcome-adjacent stats would be
leakage), and strict temporal ordering (never training on a patch while
testing on an earlier one).

**Why not show an exact win probability?**
Because the evidence doesn't support it — draft-only signal came out to a
mean ROC-AUC around 0.51 across rolling folds, essentially a weak, unstable
signal barely above chance. Presenting that as a confident win-probability
percentage would overstate what the model can actually tell you. A relative
percentile against a fixed historical reference population is the claim the
data actually supports.

**What does the percentile mean?**
Not a probability. It's where this draft's model score falls within a
fixed reference population of historical draft scores. "72nd percentile"
means the model's score for this draft ranks higher than about 72% of that
reference population — it says nothing about the odds of winning this
specific game.

**What is a counterfactual here?**
Taking an already-analyzed draft, changing exactly one champion pick while
holding the other nine fixed, and re-running the same frozen model to see
how its score moves. It isolates the effect of changing one input on the
model's own output.

**Why is it not causal?**
Because nothing about a real game was controlled or randomized — it's not
an experiment on actual outcomes. It only shows how a fixed, already-frozen
model's score responds to one input changing. It's a statement about the
model's behavior, not a claim about what would happen in a real match if
that pick were made.

**What are the biggest limitations?**
Draft-only signal is weak and shown to be unstable across patches (mean
ROC-AUC ~0.51); the training population is apex-tier (Challenger/GM/Master)
NA1 only, so it may not generalize to lower-elo play (lower-tier cohorts
were collected and compared, but not folded into training); the model is
frozen to a specific patch window (16.10-16.17) and will drift as the game
changes; and it's not a live gameplay coach — no runes, summoner spells,
bans, or in-game state are considered at all, by design.
