export function shouldScheduleAutoSave(enabled: boolean, documentPath: string | null): boolean {
  return enabled && Boolean(documentPath);
}
