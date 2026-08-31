# Scoring and Assessment

- **Questions**: Exactly 50 questions, 10 per OCEAN trait.
- **Scale**: 5-point Likert scale (1 = Strongly Disagree, 5 = Strongly Agree).
- **Reverse Scoring**: Specific questions are marked with `reverse: true`. The engine inverts these scores (e.g., 5 becomes 1).
- **Normalization**: Raw scores are summed per trait and mapped to a 0-100 percentage.
- **Classification**: Scores are categorized as LOW (0-33), MEDIUM (34-66), or HIGH (67-100) to pull deterministic interpretation text from the dictionary.
