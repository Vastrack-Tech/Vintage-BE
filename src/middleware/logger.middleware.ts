import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    // Initialize the logger with a context name 'HTTP'
    private logger = new Logger('HTTP');

    use(req: Request, res: Response, next: NextFunction): void {
        const { method, originalUrl } = req;
        const userAgent = req.get('user-agent') || '';

        // Track the start time
        const start = Date.now();

        res.on('finish', () => {
            const { statusCode } = res;
            const contentLength = res.get('content-length');
            const duration = Date.now() - start;

            this.logger.log(
                `${method} ${originalUrl} ${statusCode} ${contentLength}b - ${duration}ms - ${userAgent}`
            );
        });

        next();
    }
}