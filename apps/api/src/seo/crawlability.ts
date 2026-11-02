/**
 * Global off forces every page out of the index.
 * Global on defers to the content's own switch (missing means allowed).
 */
export function allowsCrawl(globalOn: boolean, own?: boolean | null): boolean {
  return globalOn && own !== false;
}
