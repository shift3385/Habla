// B7 · H-B2-705: quita el plan del perfil SEMBRADO (solo navegador b7.localhost) y cuenta peticiones de plan con 503 al ir Inicio↔Palabras.
const { db } = await import('/src/lib/db.ts')
const p = await db.profile.get('me'); delete p.plan; await db.profile.put(p)
return 'plan quitado'
