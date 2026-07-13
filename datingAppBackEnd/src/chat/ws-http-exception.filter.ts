import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * The services shared between REST controllers and ChatGateway throw regular
 * Nest HttpExceptions (BadRequestException, ForbiddenException, etc). Nest's
 * default WS exception handling doesn't know how to serialize those - it
 * collapses them to a generic "Internal server error" and drops the actual
 * message. This filter forwards the real status + message to the client
 * instead.
 */
@Catch(HttpException)
export class WsHttpExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>();
    const status = exception.getStatus();
    const response = exception.getResponse();
    const message =
      typeof response === 'string'
        ? response
        : ((response as { message?: string }).message ?? exception.message);

    client.emit('exception', { status, message });
  }
}
