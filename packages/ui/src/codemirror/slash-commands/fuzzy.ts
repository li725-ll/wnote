export function fuzzyMatch(query: string, targets: string[]): number {
  if (query.length === 0) return 1;
  const q = query.toLowerCase();

  let bestScore = 0;
  for (const target of targets) {
    const t = target.toLowerCase();
    let qi = 0;
    let score = 0;
    let consecutive = 0;

    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
      if (t[ti] === q[qi]) {
        qi++;
        consecutive++;
        score += consecutive;
        if (ti === 0 || t[ti - 1] === " " || t[ti - 1] === "-") score += 2;
      } else {
        consecutive = 0;
      }
    }

    if (qi === q.length) {
      bestScore = Math.max(bestScore, score);
    }
  }

  return bestScore;
}
