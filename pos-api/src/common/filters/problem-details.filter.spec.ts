/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ProblemDetailsFilter, sanitizeDetail } from './problem-details.filter';
import { MissingTenantContextError } from '../errors/missing-tenant-context.error';

function run(exception: unknown, url = '/api/v1/example') {
  const reply = jest.fn();
  const setHeader = jest.fn();
  const response = { setHeader: jest.fn() };
  const filter = new ProblemDetailsFilter(
    { httpAdapter: { reply, setHeader } } as unknown as HttpAdapterHost,
    { error: jest.fn() } as any,
  );
  filter.catch(exception, {
    switchToHttp: () => ({
      getRequest: () => ({ url, headers: {} }),
      getResponse: () => response,
    }),
  } as any);
  return {
    body: reply.mock.calls[0][1],
    status: reply.mock.calls[0][2],
    setHeader,
  };
}

describe('ProblemDetailsFilter', () => {
  it.each([
    [
      new BadRequestException('Validation failed'),
      400,
      'https://pos.example/errors/validation',
    ],
    [
      new UnauthorizedException('bad'),
      401,
      'https://pos.example/errors/unauthorized',
    ],
    [new ForbiddenException('no'), 403, 'https://pos.example/errors/forbidden'],
    [new NotFoundException('no'), 404, 'https://pos.example/errors/not-found'],
    [new ConflictException('dup'), 409, 'https://pos.example/errors/conflict'],
    [
      new InternalServerErrorException('stack secret'),
      500,
      'https://pos.example/errors/internal',
    ],
    [
      new MissingTenantContextError(),
      403,
      'https://pos.example/errors/missing-tenant-context',
    ],
  ])('maps problem response', (exception, status, type) => {
    const result = run(exception);
    expect(result.status).toBe(status);
    expect(result.body).toMatchObject({
      type,
      status,
      instance: '/api/v1/example',
    });
    expect(result.body.traceId).toBeDefined();
    expect(result.setHeader).toHaveBeenCalledWith(
      expect.anything(),
      'Content-Type',
      'application/problem+json',
    );
  });
  it('sanitizes sensitive details', () => {
    expect(sanitizeDetail('select * from users with JWT secret password')).toBe(
      'Request failed',
    );
  });
});
