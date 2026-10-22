import { Share } from '@capacitor/share'
import { useEffect, useState } from 'react'
import { APP_BUILD, APP_DATE, APP_VERSION, findRelease, formatDate, latestEntry, RELEASES, type Release } from '../lib/changelog'
import type { Settings } from '../lib/settings'
import { loadAudioCredits, loadSounds, type AudioCredit } from '../lib/sounds'
import { Icon, type IconName } from '../ui/icons'
import Mascot from '../ui/Mascot'
import { THEME_INFO, type ThemeVars } from '../ui/theme'

type Page = 'main' | 'news' | 'credits' | 'privacy' | 'help' | 'licenses' | 'audio'

const TITLES: Record<Page, string> = {
  main: 'Acerca de',
  news: 'Novedades',
  credits: 'Créditos',
  privacy: 'Privacidad',
  help: 'Ayuda y contacto',
  licenses: 'Licencias',
  audio: 'Audios de los sonidos',
}

const AUTHOR = 'Shift'

function Rows({ items }: { items: [string, string][] }) {
  return (
    <div className="glass rounded-[26px] px-4 py-1">
      {items.map(([k, v], i) => (
        <div key={k} className="flex justify-between gap-3 py-3 text-sm" style={{ borderTop: i ? '1px solid var(--gb)' : 0 }}>
          <span className="txt-sub">{k}</span>
          <span className="text-right font-medium">{v}</span>
        </div>
      ))}
    </div>
  )
}

/** Acerca de (diseño "AcercaDe"): versión, novedades, créditos, privacidad y ayuda. */
export default function AboutScreen({
  settings,
  initialPage = 'main',
  onBack,
}: {
  settings: Settings
  t: ThemeVars
  initialPage?: Page
  onBack: () => void
}) {
  const [page, setPage] = useState<Page>(initialPage)
  // Se abren solas la versión instalada y, si es un parche, ese parche.
  const [open, setOpen] = useState(() => {
    const f = findRelease(APP_VERSION)
    return Math.max(0, RELEASES.indexOf(f?.parent ?? f?.release ?? RELEASES[0]))
  })
  const [openPatches, setOpenPatches] = useState<string[]>(() => (findRelease(APP_VERSION)?.parent ? [APP_VERSION] : []))
  const [taps, setTaps] = useState(0)
  const latest = latestEntry()
  const egg = taps >= 5

  const share = (subject: string) =>
    Share.share({
      title: subject,
      text: `${subject} — Habla v${APP_VERSION} (build ${APP_BUILD}) · modelo ${settings.geminiModel} · ${navigator.userAgent}\n\nCuéntanos aquí qué pasó o qué te gustaría:\n`,
    }).catch(() => {})

  // 5.11 (S-04): desde «Audios de los sonidos» se vuelve a Créditos, no al principio.
  const back = () => (page === 'audio' ? setPage('credits') : page === 'main' || initialPage !== 'main' ? onBack() : setPage('main'))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-[54px] items-center gap-3">
        <button onClick={back} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Atrás">
          <Icon name="back" size={20} stroke={1.8} />
        </button>
        <div className="text-2xl font-semibold tracking-[-.4px]">{TITLES[page]}</div>
      </div>

      {page === 'main' && (
        <div className="anim-up flex flex-col gap-3">
          <div className="glass flex flex-col items-center rounded-[30px] px-[18px] pt-[22px] pb-[18px] text-center">
            <button onClick={() => setTaps((x) => x + 1)} aria-label="Logo">
              <div style={egg ? { animation: 'hb-spin 1s linear infinite' } : undefined}>
                <Mascot element={THEME_INFO[settings.theme].mascot} size={96} mood={egg ? 'happy' : 'idle'} interactive={false} />
              </div>
            </button>
            <div className="mt-3.5 fs-30 font-bold tracking-[-.8px]">
              Habla<span className="txt-acc">.</span>
            </div>
            <div className="txt-sub mt-0.5 text-sm">Tu profe virtual de inglés</div>
            <div className="mt-3.5 flex flex-wrap justify-center gap-2">
              <span className="btn-acc flex h-8 items-center rounded-2xl px-3 fs-13">v{APP_VERSION}</span>
              <span className="field flex h-8 items-center rounded-2xl px-3 fs-13">Build {APP_BUILD}</span>
              <span className="field flex h-8 items-center gap-1.5 rounded-2xl px-3 fs-13">
                <span className="h-[7px] w-[7px] rounded-full" style={{ background: '#5fe3a1' }} />
                Instalada
              </span>
            </div>
            {egg && <div className="txt-acc2 anim-up mt-2.5 fs-12.5">Hecho con paciencia, café y muchos "could you repeat that?"</div>}
          </div>

          <button onClick={() => setPage('news')} className="glass rounded-[26px] p-4 text-left">
            <span className="flex items-center justify-between">
              <span className="txt-acc2 fs-11 tracking-[1.2px] uppercase">Novedades · {formatDate(latest.date)}</span>
              <Icon name="chevR" size={16} stroke={1.8} color="var(--sub)" />
            </span>
            <span className="mt-1.5 block fs-17 font-semibold">{latest.title}</span>
            <span className="txt-sub mt-1 block fs-13">
              {[
                latest.added?.length && `${latest.added.length} ${latest.added.length === 1 ? 'novedad' : 'novedades'}`,
                latest.improved?.length && `${latest.improved.length} ${latest.improved.length === 1 ? 'mejora' : 'mejoras'}`,
                latest.fixed?.length && `${latest.fixed.length} ${latest.fixed.length === 1 ? 'corrección' : 'correcciones'}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </button>

          <Rows
            items={[
              ['Última actualización', formatDate(APP_DATE)],
              ['Creado por', AUTHOR],
              ['Motor de IA', settings.geminiModel || 'Google Gemini'],
              ['Plataforma', 'Android 7+'],
            ]}
          />

          <div className="grid grid-cols-3 gap-2.5">
            {(
              [
                ['Créditos', 'heart', 'credits'],
                ['Privacidad', 'shield', 'privacy'],
                ['Ayuda', 'help', 'help'],
              ] as [string, IconName, Page][]
            ).map(([label, icon, p]) => (
              <button key={p} onClick={() => setPage(p)} className="glass flex h-[86px] flex-col items-center justify-center gap-2 rounded-3xl fs-13">
                <span className="field txt-acc2 grid h-9 w-9 place-items-center rounded-full">
                  <Icon name={icon} size={18} stroke={1.6} />
                </span>
                {label}
              </button>
            ))}
          </div>
          <div className="txt-sub text-center text-xs">© 2026 · Hecho en español, para hablar en inglés</div>
        </div>
      )}

      {page === 'news' && (
        <div className="anim-in flex flex-col gap-2.5">
          {RELEASES.map((r, i) => {
            const isOpen = open === i
            const patches = r.patches ?? []
            const installedPatch = patches.find((p) => p.v === APP_VERSION)
            return (
              <div key={r.v} className="glass overflow-hidden rounded-[26px]">
                <button onClick={() => setOpen(isOpen ? -1 : i)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                  <span
                    className={`grid h-[30px] min-w-[54px] flex-none place-items-center rounded-[15px] px-2.5 fs-12.5 font-semibold ${i === 0 ? 'btn-acc' : 'field'}`}
                  >
                    {r.v}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate fs-15 font-semibold">{r.title}</span>
                    <span className="txt-sub block fs-12.5">
                      {formatDate(r.date)}
                      {r.v === APP_VERSION ? ' · instalada' : installedPatch ? ` · instalada (${installedPatch.v})` : ''}
                      {patches.length ? ` · ${patches.length} ${patches.length === 1 ? 'parche' : 'parches'}` : ''}
                    </span>
                  </span>
                  <Chevron open={isOpen} />
                </button>
                {isOpen && (
                  <div className="anim-up flex flex-col gap-3 px-4 pb-4">
                    <ReleaseGroups r={r} />
                    {patches.length > 0 && (
                      // Parches de seguridad y corrección de esta versión: debajo de lo que trajo, cada uno en su
                      // propio desplegable (petición del dueño, 2026-10-06).
                      <div className="flex flex-col gap-2">
                        <div className="txt-acc2 flex items-center gap-2 fs-11 tracking-[1.2px] uppercase">
                          <Icon name="shield" size={14} stroke={1.8} />
                          Parches de seguridad y corrección
                        </div>
                        {patches.map((p) => {
                          const pOpen = openPatches.includes(p.v)
                          return (
                            <div key={p.v} className="field overflow-hidden rounded-[18px]" style={{ border: 0 }}>
                              <button
                                onClick={() => setOpenPatches((l) => (pOpen ? l.filter((x) => x !== p.v) : [...l, p.v]))}
                                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
                                aria-expanded={pOpen}
                              >
                                <span className="glass grid h-[26px] min-w-[50px] flex-none place-items-center rounded-[13px] px-2 fs-12 font-semibold">
                                  {p.v}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block fs-13.5 leading-snug font-semibold">Parche de seguridad {p.v}</span>
                                  <span className="txt-sub block fs-12">
                                    {formatDate(p.date)}
                                    {p.v === APP_VERSION ? ' · instalado' : ''}
                                  </span>
                                </span>
                                <Chevron open={pOpen} small />
                              </button>
                              {pOpen && (
                                <div className="anim-up flex flex-col gap-3 px-3 pb-3">
                                  <ReleaseGroups r={p} />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {page === 'credits' && (
        <div className="anim-in flex flex-col gap-3">
          <div className="glass flex items-center gap-3.5 rounded-[26px] p-[18px]">
            <span className="btn-acc grid h-14 w-14 flex-none place-items-center rounded-full text-xl">{AUTHOR.slice(0, 1)}</span>
            <span>
              <span className="txt-sub block text-xs">Idea, diseño y desarrollo</span>
              <span className="block fs-19 font-semibold">{AUTHOR}</span>
              <span className="txt-sub block fs-13">Creado con Claude</span>
            </span>
          </div>
          <Rows
            items={[
              ['Voces', 'Síntesis de voz del sistema'],
              ['IA conversacional', 'Google Gemini'],
              ['Diseño', 'Claude Design'],
              ['Tipografía', 'Outfit (OFL)'],
              ['Iconos', 'Diseño propio'],
            ]}
          />
          <div className="txt-sub mt-1 px-1 text-sm">Tecnología con la que está hecha</div>
          <Rows
            items={[
              ['Desarrollo', 'Claude Code (Anthropic)'],
              ['App Android', 'Capacitor 8 · Java (plugin de audio propio)'],
              ['Interfaz', 'React 19 · TypeScript · Tailwind CSS 4'],
              ['Compilación', 'Vite 8 · Gradle'],
              ['Datos en el teléfono', 'IndexedDB (Dexie) · Preferences'],
              ['Voz del profe', 'Texto a voz del sistema Android'],
              ['Test de nivel', 'Banco propio de 450 preguntas (estilo IELTS y Cambridge)'],
            ]}
          />
          {/* 5.11 (S-04): los sonidos sueltos de Wikimedia Commons, con su autor y su licencia (CC BY-SA pide atribución). */}
          <button onClick={() => setPage('audio')} className="glass flex min-h-[62px] items-center gap-3 rounded-[31px] px-3 py-2 text-left">
            <span className="field txt-acc2 grid h-10 w-10 flex-none place-items-center rounded-full">
              <Icon name="soundwave" size={18} stroke={1.6} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block fs-15 font-semibold">Audios de los sonidos</span>
              <span className="txt-sub block fs-12.5 leading-snug">Grabaciones de Wikimedia Commons: autor y licencia de cada una</span>
            </span>
            <Icon name="chevR" size={16} stroke={1.8} color="var(--sub)" />
          </button>
          {/* 5.11 (boca): los cortes de la ficha de cada sonido salen de unos dibujos de dominio público (CC0). No hace
              falta citarlos, pero se agradece: el mérito anatómico es suyo. */}
          <div className="glass flex gap-3 rounded-[31px] px-3 py-2.5">
            <span className="field txt-acc2 grid h-10 w-10 flex-none place-items-center rounded-full fs-18" aria-hidden>
              👄
            </span>
            <span className="min-w-0 flex-1 fs-12.5 leading-snug">
              <span className="block fs-15 font-semibold">Dibujos de la boca</span>
              <span className="txt-sub block">
                Basados en los cortes anatómicos de Richard Wright y Dan McCloy (Universidad de Washington), de dominio público (CC0).
              </span>
              <a href="https://github.com/drammock/phonetics-teaching-assets" className="txt-acc2 mt-0.5 inline-flex items-center gap-1 break-all underline">
                github.com/drammock/phonetics-teaching-assets
                <Icon name="arrowUR" size={12} />
              </a>
            </span>
          </div>
          <div className="txt-sub px-4 text-center fs-12 leading-snug">Versión {APP_VERSION} · build {APP_BUILD}</div>
          <div className="txt-sub px-4 text-center fs-13 leading-snug">
            Las noticias de los temas vienen de fuentes públicas y se resumen con IA.
          </div>
        </div>
      )}

      {page === 'privacy' && (
        <div className="anim-in flex flex-col gap-2.5">
          {(
            [
              ['key', 'Tu clave se queda en el teléfono', 'La clave de Gemini no sale del dispositivo salvo para hablar con Google, y no entra en las copias de seguridad.'],
              [
                'mic',
                'Audio solo mientras hablas',
                'El micrófono solo graba mientras mantienes pulsado o bloqueas el botón. El audio se envía a Google Gemini para transcribirlo y corregirte; la app no guarda grabaciones.',
              ],
              ['data', 'Tu progreso es tuyo', 'Se guarda en el teléfono. Puedes exportarlo o importarlo desde Ajustes → Mis datos.'],
              ['eye', 'Sin anuncios ni rastreo', 'La app no usa publicidad ni analíticas de terceros.'],
            ] as [IconName, string, string][]
          ).map(([icon, title, desc]) => (
            <div key={title} className="glass flex gap-3 rounded-3xl px-4 py-3.5">
              <span className="field txt-acc2 grid h-9 w-9 flex-none place-items-center rounded-full">
                <Icon name={icon} size={17} stroke={1.6} />
              </span>
              <span>
                <span className="block fs-15 font-semibold">{title}</span>
                <span className="txt-sub mt-0.5 block fs-13 leading-snug">{desc}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {page === 'help' && (
        <div className="anim-in flex flex-col gap-2.5">
          {(
            [
              ['bug', 'Reportar un error', 'Comparte la versión y el modelo automáticamente', () => share('Error en Habla')],
              ['star', 'Sugerir una mejora', 'Nuevos temas, prácticas o voces', () => share('Sugerencia para Habla')],
              ['book', 'Licencias de código abierto', 'Librerías usadas por la app', () => setPage('licenses')],
            ] as [IconName, string, string, () => void][]
          ).map(([icon, title, desc, action]) => (
            <button key={title} onClick={action} className="glass flex h-[62px] items-center gap-3 rounded-[31px] px-3 text-left">
              <span className="field txt-acc2 grid h-10 w-10 flex-none place-items-center rounded-full">
                <Icon name={icon} size={18} stroke={1.6} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block fs-15 font-semibold">{title}</span>
                <span className="txt-sub block fs-12.5">{desc}</span>
              </span>
              <Icon name="chevR" size={16} stroke={1.8} color="var(--sub)" />
            </button>
          ))}
        </div>
      )}

      {page === 'audio' && <AudioCredits />}

      {page === 'licenses' && (
        <Rows
          items={[
            ['React', 'MIT'],
            ['Capacitor', 'MIT'],
            ['Text to Speech (Capacitor Community)', 'MIT'],
            ['Dexie.js', 'Apache 2.0'],
            ['Tailwind CSS', 'MIT'],
            ['Vite', 'MIT'],
            ['Outfit (tipografía)', 'SIL OFL 1.1'],
          ]}
        />
      )}
    </div>
  )
}

/**
 * 5.11 (S-04): «Créditos de audio». Un registro por sonido suelto (src/sounds/credits.json): autor, licencia con enlace
 * y el archivo original en Wikimedia Commons. Los JSON se cargan al abrir esta página (no en el arranque).
 */
function AudioCredits() {
  const [rows, setRows] = useState<{ credit: AudioCredit; ipa?: string }[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    Promise.all([loadAudioCredits(), loadSounds().catch(() => null)])
      .then(([credits, cat]) => {
        if (alive) setRows(credits.map((credit) => ({ credit, ipa: cat?.phonemes.find((p) => p.id === credit.phoneme)?.ipa })))
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [])
  return (
    <div className="anim-in flex flex-col gap-2.5">
      <div className="glass rounded-3xl px-4 py-3.5 fs-13.5 leading-snug">
        Los sonidos sueltos de la pestaña Sonidos son grabaciones de <b>Wikimedia Commons</b>. Siguen bajo su licencia: se
        pueden copiar y compartir citando al autor y con la misma licencia.
      </div>
      {failed && <div className="txt-sub px-2 fs-13">No se pudieron cargar los créditos. Vuelve a abrir esta página.</div>}
      {!rows && !failed && <div className="txt-sub px-2 fs-13">Cargando…</div>}
      {rows?.map(({ credit: c, ipa }) => (
        <div key={c.id} className="glass flex gap-3 rounded-3xl px-4 py-3">
          <span className="field txt-acc2 grid h-10 min-w-10 flex-none place-items-center rounded-full px-1.5 fs-15 font-semibold">{ipa ? `/${ipa}/` : '♪'}</span>
          <span className="min-w-0 flex-1 fs-13 leading-snug">
            <span className="block font-semibold break-words">{c.title}</span>
            <span className="txt-sub block">Autor: {c.author}</span>
            <span className="txt-sub block">
              Licencia:{' '}
              <a href={c.licenseUrl} className="txt-acc2 underline">
                {c.license}
              </a>
            </span>
            {c.modified && c.modifiedEs && <span className="txt-sub block">Modificado: {c.modifiedEs}</span>}
            {c.versionEs && <span className="txt-sub block">{c.versionEs}</span>}
            <a href={c.page} className="txt-acc2 mt-0.5 inline-flex items-center gap-1 underline">
              Archivo original en Commons
              <Icon name="arrowUR" size={12} />
            </a>
          </span>
        </div>
      ))}
    </div>
  )
}

/** Nuevo · Mejorado · Corregido de una versión o de un parche. */
function ReleaseGroups({ r }: { r: Release }) {
  const groups: [string, IconName, string[] | undefined][] = [
    ['Nuevo', 'spark', r.added],
    ['Mejorado', 'bolt', r.improved],
    ['Corregido', 'wrench', r.fixed],
  ]
  return (
    <>
      {groups
        .filter(([, , items]) => items?.length)
        .map(([label, icon, items]) => (
          <div key={label}>
            <div className="txt-acc2 flex items-center gap-2 fs-11 tracking-[1.2px] uppercase">
              <Icon name={icon} size={14} stroke={1.8} />
              {label}
            </div>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {items!.map((it) => (
                <div key={it} className="field rounded-[14px] px-3 py-2 fs-13.5 leading-snug" style={{ border: 0 }}>
                  {it}
                </div>
              ))}
            </div>
          </div>
        ))}
    </>
  )
}

function Chevron({ open, small = false }: { open: boolean; small?: boolean }) {
  const size = small ? 26 : 30
  return (
    <span
      className="txt-sub grid flex-none place-items-center rounded-full transition-transform duration-300"
      style={{ width: size, height: size, border: '1px solid var(--gb)', transform: open ? 'rotate(180deg)' : 'none' }}
    >
      <Icon name="chevD" size={small ? 13 : 15} stroke={2} />
    </span>
  )
}
