// wawoff2 ships no typings; only decompress is used (scripts/build-og-image.ts).
declare module 'wawoff2' {
  export function decompress(woff2: Uint8Array): Promise<Uint8Array>
}
