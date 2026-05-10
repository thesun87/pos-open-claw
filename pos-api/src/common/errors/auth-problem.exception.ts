import { HttpException, HttpStatus } from '@nestjs/common';

export class AuthProblemException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly problemType: string,
    title: string,
    detail = title,
  ) {
    super({ type: problemType, title, detail }, status);
  }
}
