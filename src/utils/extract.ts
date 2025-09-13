export const extractLinks = (text: string): string[] => {
  const re = /\bhttps?:\/\/[^\s)]+/gi;
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) set.add(m[0]);
  return [...set];
};
