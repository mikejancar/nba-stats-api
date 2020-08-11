import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { IncomingMessage } from 'http';
import { Observable } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = (context as any).args[0] as IncomingMessage;
    console.log(`Request: ${request.method} ${request.url}`);
    return next.handle();
  }
}