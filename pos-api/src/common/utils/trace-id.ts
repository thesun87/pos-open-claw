import { v7 as uuidv7, validate, version } from 'uuid';

export const TRACE_ID_HEADER = 'X-Trace-Id';

export function generateTraceId(): string {
  return uuidv7();
}

export function isUuidV7(value: unknown): value is string {
  return typeof value === 'string' && validate(value) && version(value) === 7;
}

export function getOrCreateTraceId(value: unknown): string {
  return isUuidV7(value) ? value : generateTraceId();
}
