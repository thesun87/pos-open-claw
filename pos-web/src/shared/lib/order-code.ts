function pad(value: number, length: number) {
  return String(value).padStart(length, '0')
}

export function localOrderDatePart(date = new Date()): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1, 2)}${pad(date.getDate(), 2)}`
}

export function generateOrderCode(deviceId: string, sequence: number, date = new Date()): string {
  const safeSequence = Math.max(0, Math.trunc(sequence))
  return `${localOrderDatePart(date)}-${deviceId}-${pad(safeSequence, 4)}`
}
