# Dibujos de la boca (Sonidos, 5.11)

`build.py` genera `src/sounds/mouth.ts` (no se edita a mano). Contrato: `docs/v5.11/sonidos-boca/CONTRATO.md`.
Estilo: variante B de la maqueta (`docs/v5.11/sonidos-boca/maqueta/build3.py`, `comparar-lengua.png`).

## Uso

```sh
git clone --depth 1 https://github.com/drammock/phonetics-teaching-assets /tmp/pta
python3 scripts/mouth/build.py /tmp/pta/midsaggital_articulations --sheet /tmp/hoja.html
```

Python 3 sin dependencias. `--sheet` escribe además una hoja de contactos HTML (todas las poses con sus marcas y las
vistas de frente) para revisarlas en el navegador antes de dar el archivo por bueno.

## Qué hace

- Lee los cortes sagitales **CC0** de Richard Wright y Dan McCloy (cabeza, paladar, mandíbula+lengua, epiglotis,
  cuerdas) y separa la lengua por geometría: suelo bajo la punta → punta → dorso → raíz → vallécula.
- Redibuja cada pose en el estilo B: lengua de dos capas (músculo con fibras y mucosa rosada), suelo de la boca macizo,
  dientes propios, frenillo, camino del aire discontinuo (por la boca o por la nariz) y círculo punteado en el punto clave.
  Sin `<text>`; los id de `<defs>` acaban en `__U`; recorte `viewBox` común y coordenadas con 1 decimal.
- `POSES`: 26 poses de `PROMPTS-gemini.md` §3 + `neutral`, cada una con su corte de partida y las adaptaciones
  (`warp`, `mingap`, `contact`, `raise`, `jaw`, `lips`). `FRONT_SHAPES`: las 9 formas de frente (§4).
  `BY`: pose, forma de frente y etiquetas de las 44 fichas de `src/sounds/phonemes.json`.
