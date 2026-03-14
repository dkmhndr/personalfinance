declare module 'uuid' {
  export function v4(options?: {
    random?: Uint8Array;
    rng?: () => Uint8Array;
  }): string;
}
