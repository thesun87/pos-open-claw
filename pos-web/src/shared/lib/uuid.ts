import { v7 as uuidv7FromPackage } from 'uuid'

export function uuidv7(): string {
  return uuidv7FromPackage()
}

export function createUuidV7(): string {
  return uuidv7()
}
