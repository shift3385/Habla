import { useEffect, useRef } from 'react'

/** Barras que siguen tu voz mientras grabas (AnalyserNode sobre el stream del micrófono). */
export default function LiveWave({ stream, active }: { stream: MediaStream | null; active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active || !stream || !canvas.current) return
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)
    const el = canvas.current
    const g = el.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    el.width = el.clientWidth * dpr
    el.height = el.clientHeight * dpr
    const BARS = 28
    const levels = new Array(BARS).fill(0)
    let raf = 0

    const draw = () => {
      analyser.getByteTimeDomainData(data)
      let peak = 0
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128)
      levels.shift()
      levels.push(Math.min(1, peak * 2.2))
      g.clearRect(0, 0, el.width, el.height)
      const w = el.width / BARS
      levels.forEach((lv, i) => {
        const h = Math.max(4 * dpr, lv * el.height)
        g.fillStyle = `rgba(248, 113, 113, ${0.35 + lv * 0.65})`
        const x = i * w + w * 0.2
        const y = (el.height - h) / 2
        g.beginPath()
        g.roundRect(x, y, w * 0.6, h, 3 * dpr)
        g.fill()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(raf)
      source.disconnect()
      ctx.close().catch(() => {})
    }
  }, [stream, active])

  return <canvas ref={canvas} className={`h-10 w-56 transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`} />
}
