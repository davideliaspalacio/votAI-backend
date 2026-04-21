import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PdfChunk {
  text: string;
  page: number;
  chunkIndex: number;
}

@Injectable()
export class PdfParserService {
  private readonly logger = new Logger(PdfParserService.name);
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor(private readonly configService: ConfigService) {
    this.chunkSize = this.configService.get<number>('CHUNK_SIZE_TOKENS', 500);
    this.chunkOverlap = this.configService.get<number>(
      'CHUNK_OVERLAP_TOKENS',
      50,
    );
  }

  async parseBuffer(buffer: Buffer): Promise<PdfChunk[]> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');

    const data = await (pdfParse as (buf: Buffer) => Promise<{ numpages: number; text: string }>)(buffer);

    this.logger.log(
      `PDF parseado: ${data.numpages} páginas, ${data.text.length} caracteres`,
    );

    // Dividir texto por saltos de página aproximados
    // pdf-parse no preserva páginas individualmente en modo básico,
    // así que asignamos páginas estimadas por posición en el texto
    const avgCharsPerPage = Math.max(1, Math.floor(data.text.length / data.numpages));
    const pageTexts: { page: number; text: string }[] = [];

    for (let i = 0; i < data.numpages; i++) {
      const start = i * avgCharsPerPage;
      const end = Math.min((i + 1) * avgCharsPerPage, data.text.length);
      const text = data.text.substring(start, end);
      if (text.trim().length > 0) {
        pageTexts.push({ page: i + 1, text });
      }
    }

    if (pageTexts.length === 0) {
      pageTexts.push({ page: 1, text: data.text });
    }

    return this.chunkPages(pageTexts);
  }

  private chunkPages(
    pages: { page: number; text: string }[],
  ): PdfChunk[] {
    const chunks: PdfChunk[] = [];
    let chunkIndex = 0;

    for (const { page, text } of pages) {
      const words = text.split(/\s+/).filter((w) => w.length > 0);

      for (let i = 0; i < words.length; i += this.chunkSize - this.chunkOverlap) {
        const chunkWords = words.slice(i, i + this.chunkSize);
        if (chunkWords.length === 0) break;

        chunks.push({
          text: chunkWords.join(' '),
          page,
          chunkIndex,
        });
        chunkIndex++;
      }
    }

    this.logger.log(`Generados ${chunks.length} chunks`);
    return chunks;
  }
}
