declare module 'papaparse' {
  export interface ParseConfig<T> {
    header?: boolean;
    skipEmptyLines?: boolean | 'greedy';
    complete?: (results: { data: T[] }) => void;
    error?: (error: any) => void;
  }

  export function parse<T = any>(file: File | string, config?: ParseConfig<T>): void;

  const Papa: {
    parse: typeof parse;
  };

  export default Papa;
}
