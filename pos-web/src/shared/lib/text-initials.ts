export function getTextInitials(text: string): string {
  return text
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0]?.toLocaleUpperCase('vi') ?? '')
    .join('') || '•'
}
