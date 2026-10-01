/** Mensaje de error amable: si fue saturación de Google, lo explica sin tecnicismos. */
export function friendlyError(e: unknown): string {
  const err = e as { transient?: boolean; message?: string }
  return err?.transient
    ? 'Google está saturado ahora mismo. Probamos varias veces y con el modelo de respaldo.'
    : (err?.message ?? 'Algo salió mal.')
}
