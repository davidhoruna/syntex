declare module 'pdfjs-dist/build/pdf' {
  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
    destroy(): Promise<void>;
  }

  export interface PDFPageProxy {
    getTextContent(): Promise<TextContent>;
    getViewport(options: { scale: number }): { width: number; height: number };
    render(options: {
      canvasContext: CanvasRenderingContext2D;
      viewport: { width: number; height: number };
    }): { promise: Promise<void> };
  }

  export interface TextContent {
    items: TextItem[];
  }

  export interface TextItem {
    str: string;
    transform: number[];
    width: number;
    height: number;
  }

  export interface PDFLoadingTask {
    promise: Promise<PDFDocumentProxy>;
    destroy(): Promise<void>;
  }

  export interface GetDocumentParams {
    url?: string;
    data?: ArrayBuffer | Uint8Array;
    httpHeaders?: Record<string, string>;
    withCredentials?: boolean;
    disableWorker?: boolean;
    disableFontFace?: boolean;
    cMapUrl?: string;
    cMapPacked?: boolean;
    standardFontDataUrl?: string;
  }

  export function getDocument(params: GetDocumentParams): PDFLoadingTask;

  export const GlobalWorkerOptions: {
    workerSrc: string;
  };
  
  export const version: string;
}

declare module 'pdfjs-dist/legacy/build/pdf' {
  export * from 'pdfjs-dist/build/pdf';
}

declare module 'pdfjs-dist/build/pdf.worker.entry' {
  const workerEntry: any;
  export default workerEntry;
} 