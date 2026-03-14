declare module 'pdf-parse' {
  type PDFMeta = Record<string, unknown>;
  type PDFOutline = unknown[];
  type PDFPage = unknown;

  export interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFMeta;
    metadata: PDFMeta | null;
    version: string;
    text: string;
  }

  function pdf(data: Buffer | Uint8Array, options?: Record<string, unknown>): Promise<PDFData>;
  export default pdf;
}
