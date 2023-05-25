export function splitWords(s: string) {
  let prevCaps = s[0] >= "A" && s[0] <= "Z";
  let start = 0;
  const ret = [];

  for (let i = 0; i < s.length; i++) {
    const isCaps = s[i] >= "A" && s[i] <= "Z";

    if (!prevCaps && isCaps) {
      ret.push(s.slice(start, i));
      start = i;
    }

    prevCaps = isCaps;
  }

  ret.push(s.slice(start));
  return ret;
}
