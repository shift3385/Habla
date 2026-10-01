/** Interruptor del diseño (Modo oído por defecto, etc.). */
export default function Switch({ on }: { on: boolean }) {
  return (
    <span
      className="relative h-[30px] w-[50px] flex-none rounded-full transition-colors"
      style={{ background: on ? 'var(--acc)' : 'var(--gb)' }}
    >
      <span
        className="absolute top-[3px] h-6 w-6 rounded-full bg-white shadow transition-all"
        style={{ left: on ? 23 : 3 }}
      />
    </span>
  )
}
