export function info(message: string, ...optional: unknown[]): void {
  console.info('[INFO]', message, ...optional);
}

export function debug(message: string, ...optional: unknown[]): void {
  console.debug('[DEBUG]', message, ...optional);
}
