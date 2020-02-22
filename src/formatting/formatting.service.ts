import { Injectable } from '@nestjs/common';

@Injectable()
export class FormattingService {
  formatDateForStatsCall(dateToFormat: string): string {
    return `${dateToFormat.substring(4, 6)}/${dateToFormat.substring(6)}/${dateToFormat.substring(0, 4)}`;
  }

  formatDateForFileName(dateToFormat: string): string {
    return `${dateToFormat.substring(0, 4)}-${dateToFormat.substring(4, 6)}-${dateToFormat.substring(6)}`;
  }
}
