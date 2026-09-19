# Scoring

**Audience:** developer. The [plain-language summary](#plain-language-summary) is for admins.

Scoring is deterministic: the same answers always give the same scores and the same report text. Nothing in scoring or reporting calls an AI model or an external service.

## Contents

- [The instrument](#the-instrument)
- [Formula](#formula)
- [Worked example](#worked-example)
- [Levels](#levels)
- [Response-quality flags](#response-quality-flags)
- [How the report is built](#how-the-report-is-built)
- [Limitations and disclaimer](#limitations-and-disclaimer)
- [Plain-language summary](#plain-language-summary)

## The instrument

Defined in `src/data/questions.ts`.

| Property | Value |
|---|---|
| Model | Big Five (OCEAN) |
| Items | 50 |
| Items per trait | 10 |
| Answer scale | 1 Strongly Disagree, 2 Disagree, 3 Neutral, 4 Agree, 5 Strongly Agree |
| Reverse-keyed items | 15, three per trait |

| Trait | Item IDs | Reverse-keyed |
|---|---|---|
| Openness | `O1` to `O10` | `O7`, `O8`, `O10` |
| Conscientiousness | `C1` to `C10` | `C6`, `C8`, `C10` |
| Extraversion | `E1` to `E10` | `E5`, `E7`, `E10` |
| Agreeableness | `A1` to `A10` | `A5`, `A7`, `A9` |
| Neuroticism | `N1` to `N10` | `N4`, `N6`, `N9` |

A high Neuroticism score means more sensitivity to stress, not more stability.

Question IDs are stored in the `Response` table. Never change the ID of an existing question once data has been collected.

The questions API returns only `id`, `text` and `order`. The trait and reverse key stay on the server.

## Formula

Implemented in `src/lib/scoring/engine.ts`. For each trait:

1. **Validate.** Every one of the 50 questions must have an integer answer from 1 to 5, or scoring throws.
2. **Reverse.** For a reverse-keyed item, `scored = 6 - answer`. Otherwise `scored = answer`.
3. **Sum.** Add the 10 scored values. The sum is between 10 and 50.
4. **Normalise.** `score = (sum - 10) / (50 - 10) * 100`.
5. **Round** to one decimal place.

## Worked example

Openness, for one participant:

| Item | Answer | Reverse-keyed | Scored |
|---|---|---|---|
| `O1`, `O2`, `O3`, `O4`, `O5`, `O6`, `O9` | 4 each | No | 4 each, total 28 |
| `O7`, `O8`, `O10` | 2 each | Yes | 6 - 2 = 4 each, total 12 |

- Sum: 28 + 12 = 40
- Normalised: (40 - 10) / 40 * 100 = 75
- Stored in `Result.openness`: 75
- Level: High

Two checks you can do by hand, both covered by the test suite: answering 3 to every item gives exactly 50 for every trait, and a trait's score for all-1 answers plus its score for all-5 answers is always 100.

## Levels

Implemented as `classify()` in `src/lib/scoring/interpret.ts`:

| Level | Rule | Achievable scores | Sums |
|---|---|---|---|
| Low | `score < 40` | 0 to 37.5 | 10 to 25 |
| Moderate | `40 <= score < 70` | 40 to 67.5 | 26 to 37 |
| High | `score >= 70` | 70 to 100 | 38 to 50 |

**The 2.5-point step.** The sum is a whole number from 10 to 50, and each point of sum is worth 100 / 40 = 2.5 points of score. So every score is a multiple of 2.5: 0, 2.5, 5, … 97.5, 100. That is 41 possible values, and rounding to one decimal never changes them.

**No gaps between levels.** The rules use strict `<` comparisons, so every number belongs to exactly one level. Both boundaries, 40 and 70, are themselves achievable scores and belong to the higher level. No achievable score falls between 37.5 and 40 or between 67.5 and 70, so the legend ranges printed in the report (`0–39`, `40–69`, `70–100`) cover every score a participant can get.

Other thresholds used when building the report:

| Report item | Rule |
|---|---|
| Primary and secondary strength | Highest and second-highest trait, shown only if 70 or above |
| Balanced dimensions | Traits from 40 up to, not including, 70 |
| Development focus | Traits below 40 |
| Trait ranking | All five traits sorted by score, highest first; ties keep the order O, C, E, A, N |

## Response-quality flags

Implemented as `deriveResponseQuality()` in `src/lib/scoring/interpret.ts`. The checks use all 50 raw answers, before reverse keying.

| Flag text | Rule |
|---|---|
| `Low variance detected (potential straight-lining)` | Population standard deviation of the answers is below 0.5 |
| `Unusually high rate of extreme responses (1 or 5)` | More than 80% of answers are 1 or 5 |
| `Unusually high rate of neutral responses (3)` | More than 80% of answers are 3 |

The response set is `valid` when no flag is raised.

Flags do not change any score. They are stored in `Report.content.responseQuality`, printed in a highlighted box near the top of the PDF, and counted on the admin **User Input Analysis** page. The web report page does not display them.

## How the report is built

`interpretScores()` in `src/lib/scoring/interpret.ts` turns the five scores into the `ReportData` object stored in `Report.content`. **All report text comes from fixed dictionaries and rules in that file. No AI is involved.**

| Section | How it is chosen |
|---|---|
| Methodology | Fixed text, including three limitations |
| Response quality | Flags above |
| Scores, levels, legend, ranking, profile at a glance | Computed as above |
| Personality type summary | The first match among 8 level combinations, otherwise "The Balanced Professional" |
| Overall profile | The first match among 4 level combinations, otherwise a balanced-profile paragraph |
| Trait insights | One fixed meaning and implication per trait and level (15 entries) |
| Strengths | One per qualifying level (for example, High Conscientiousness gives "Reliable Execution"); three generic ones are added when fewer than three apply; at most 5 |
| Leadership, communication, decision making, career suitability, learning style, stress and coping | The first matching rule for each section, with a fallback |
| Motivational drivers | One per qualifying level, at most 4 |
| Development areas | One per qualifying level, at most 3, with a fallback |
| Action plan | One per qualifying rule, padded to at least 3, at most 5 |
| Summary | The two highest-scoring traits, named in a fixed sentence with the participant's name |
| Disclaimer | Fixed text |

To see the text that a given score profile produces, run the script in [TESTING.md](TESTING.md#scripts).

Reports created before the current format (no `methodology` field) are converted on the fly by `normalizeReport()` in `src/app/report/[id]/page.tsx` for the web page.

## Limitations and disclaimer

The report lists these limitations in its methodology section (PDF only):

- Self-report tendencies without normative comparisons (not a clinical assessment)
- State vs Trait variance (responses may reflect current mood)
- Lack of behavioral verification (reflects self-perception, not peer-rated performance)

Every report ends with this disclaimer:

> This assessment is intended for educational, self-development, and personality-awareness purposes only. It is not a clinical psychological diagnosis or medical assessment. Results reflect self-reported tendencies and should be interpreted as indicative patterns, not absolute classifications. Please consult a qualified professional for any occupational psychology or clinical needs.

Scores are not compared with any population norm. A score of 75 means the answers sit 75% of the way from the lowest possible answers to the highest, not that the participant scored higher than 75% of people.

## Plain-language summary

Something an admin can read to a participant:

> You answered 50 statements, 10 for each of five personality traits. For each trait we added up your answers. Some statements are worded the opposite way, so we flipped those answers first. We then turned each total into a score from 0 to 100, where 0 is the lowest possible and 100 the highest possible. Below 40 is described as Low, 40 to below 70 as Moderate, and 70 or above as High. The written parts of your report are chosen by fixed rules based on those levels. No person or AI writes them. Your scores are not compared with other people. This is a self-awareness tool, not a clinical or medical assessment.
