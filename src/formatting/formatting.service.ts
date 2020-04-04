import { Injectable } from '@nestjs/common';
import { addDays, format, parseISO } from 'date-fns';

export enum DateFormats {
  Numeric = 'yyyyMMdd'
}

@Injectable()
export class FormattingService {
  addDaysToDate(source: Date, daysToAdd: number): Date {
    return addDays(source, daysToAdd);
  }

  formatDate(source: Date, pattern: string): string {
    return format(source, pattern);
  }

  formatDateForStatsCall(dateToFormat: string): string {
    return `${dateToFormat.substring(4, 6)}/${dateToFormat.substring(6)}/${dateToFormat.substring(0, 4)}`;
  }

  formatDateForFileName(dateToFormat: string): string {
    return `${dateToFormat.substring(0, 4)}-${dateToFormat.substring(4, 6)}-${dateToFormat.substring(6)}`;
  }

  parseDate(dateToParse: string): Date {
    return parseISO(dateToParse);
  }

  roundToNthDigit(num: number, numOfDigits: number): number {
    return Math.round(num * Math.pow(10, numOfDigits)) / Math.pow(10, numOfDigits);
  }
}
