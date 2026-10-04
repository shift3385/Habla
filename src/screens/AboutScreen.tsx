import { Share } from '@capacitor/share'
import { useState } from 'react'
import { APP_BUILD, APP_DATE, APP_VERSION, formatDate, RELEASES } from '../lib/changelog'
import type { Settings } from '../lib/settings'
import { Icon, type IconName } from '../ui/icons'
import Mascot from '../ui/Mascot'
import { THEME_INFO, type ThemeVars } from '../ui/theme'

type Page = 'main' | 'news' | 'credits' | 'privacy' | 'help' | 'licenses'

const TITLES: Record<Page, string> = {
  main: 'Acerca de',
  news: 'Novedades',
  credits: 'Créditos',
  privacy: 'Privacidad',
  help: 'Ayuda y contacto',
  licenses: 'Licencias',
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
  const [open, setOpen] = useState(0)
  const [taps, setTaps] = useState(0)
  const latest = RELEASES[0]
  const egg = taps >= 5

  const share = (subject: string) =>
    Share.share({
      title: subject,
      text: `${subject} — Habla v${APP_VERSION} (build ${APP_BUILD}) · modelo ${settings.geminiModel} · ${navigator.userAgent}\n\nCuéntanos aquí qué pasó o qué te gustaría:\n`,
    }).catch(() => {})

  const back = () => (page === 'main' || initialPage !== 'main' ? onBack() : setPage('main'))

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
            <div className="mt-3.5 text-[30px] font-bold tracking-[-.8px]">
              Habla<span className="txt-acc">.</span>
            </div>
            <div className="txt-sub mt-0.5 text-sm">Tu profe virtual de inglés</div>
            <div className="mt-3.5 flex flex-wrap justify-center gap-2">
              <span className="btn-acc flex h-8 items-center rounded-2xl px-3 text-[13px]">v{APP_VERSION}</span>
              <span className="field flex h-8 items-center rounded-2xl px-3 text-[13px]">Build {APP_BUILD}</span>
              <span className="field flex h-8 items-center gap-1.5 rounded-2xl px-3 text-[13px]">
                <span className="h-[7px] w-[7px] rounded-full" style={{ background: '#5fe3a1' }} />
                Instalada
              </span>
            </div>
            {egg && <div className="txt-acc2 anim-up mt-2.5 text-[12.5px]">Hecho con paciencia, café y muchos "could you repeat that?"</div>}
          </div>

          <button onClick={() => setPage('news')} className="glass rounded-[26px] p-4 text-left">
            <span className="flex items-center justify-between">
              <span className="txt-acc2 text-[11px] tracking-[1.2px] uppercase">Novedades · {formatDate(latest.date)}</span>
              <Icon name="chevR" size={16} stroke={1.8} color="var(--sub)" />
            </span>
            <span className="mt-1.5 block text-[17px] font-semibold">{latest.title}</span>
            <span className="txt-sub mt-1 block text-[13px]">
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
              <button key={p} onClick={() => setPage(p)} className="glass flex h-[86px] flex-col items-center justify-center gap-2 rounded-3xl text-[13px]">
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
            const groups: [string, IconName, string[] | undefined][] = [
              ['Nuevo', 'spark', r.added],
              ['Mejorado', 'bolt', r.improved],
              ['Corregido', 'wrench', r.fixed],
            ]
            return (
              <div key={r.v} className="glass overflow-hidden rounded-[26px]">
                <button onClick={() => setOpen(isOpen ? -1 : i)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                  <span
                    className={`grid h-[30px] min-w-[54px] flex-none place-items-center rounded-[15px] px-2.5 text-[12.5px] font-semibold ${i === 0 ? 'btn-acc' : 'field'}`}
                  >
                    {r.v}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{r.title}</span>
                    <span className="txt-sub block text-[12.5px]">
                      {formatDate(r.date)}
                      {r.v === APP_VERSION ? ' · instalada' : ''}
                    </span>
                  </span>
                  <span
                    className="txt-sub grid h-[30px] w-[30px] flex-none place-items-center rounded-full transition-transform duration-300"
                    style={{ border: '1px solid var(--gb)', transform: isOpen ? 'rotate(180deg)' : 'none' }}
                  >
                    <Icon name="chevD" size={15} stroke={2} />
                  </span>
                </button>
                {isOpen && (
                  <div className="anim-up flex flex-col gap-3 px-4 pb-4">
                    {groups
                      .filter(([, , items]) => items?.length)
                      .map(([label, icon, items]) => (
                        <div key={label}>
                          <div className="txt-acc2 flex items-center gap-2 text-[11px] tracking-[1.2px] uppercase">
                            <Icon name={icon} size={14} stroke={1.8} />
                            {label}
                          </div>
                          <div className="mt-1.5 flex flex-col gap-1.5">
                            {items!.map((it) => (
                              <div key={it} className="field rounded-[14px] px-3 py-2 text-[13.5px] leading-snug" style={{ border: 0 }}>
                                {it}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
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
              <span className="block text-[19px] font-semibold">{AUTHOR}</span>
              <span className="txt-sub block text-[13px]">Creado con Claude</span>
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
          <div className="txt-sub px-4 text-center text-[12px] leading-snug">Versión {APP_VERSION} · build {APP_BUILD}</div>
          <div className="txt-sub px-4 text-center text-[13px] leading-snug">
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
                <span className="block text-[15px] font-semibold">{title}</span>
                <span className="txt-sub mt-0.5 block text-[13px] leading-snug">{desc}</span>
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
                <span className="block text-[15px] font-semibold">{title}</span>
                <span className="txt-sub block text-[12.5px]">{desc}</span>
              </span>
              <Icon name="chevR" size={16} stroke={1.8} color="var(--sub)" />
            </button>
          ))}
        </div>
      )}

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
