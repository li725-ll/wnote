export function shouldScheduleAutoSave(
  enabled: boolean,
  documentPath: string | null,
  dirty: boolean,
): boolean {
  return enabled && dirty && Boolean(documentPath);
}
