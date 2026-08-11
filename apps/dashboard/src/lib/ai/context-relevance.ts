export function selectRelevance<T extends { numero?: string }>(message: string, animals: T[]) {
  const msg = (message || '').toLowerCase()
  const wantsAnimalList =
    /\b(lista|listar|listado|cu[aá]l|cu[aá]les|mu[eé]stra|mostrar|dame|ens[eé][ñn]a|todos|todas|qu[eé] animales|machos|hembras|crías|crias)\b/.test(
      msg,
    )
  const wantsBreeding = /empadre|monta|parto|embaraz|preñ|gestaci|destet|reproduc/.test(msg)
  const wantsMilk = /leche|ordeñ|lacta|lechera|producci[oó]n/.test(msg)
  const wantsMovements =
    /movim|registro|historial|actividad|reciente|[uú]ltim|peso|salud|vacun|tratamiento|nota/.test(
      msg,
    ) || wantsMilk
  const wantsGuidance =
    /qu[eé] (debo|puedo|conviene)|pendiente|recomienda|recomendaci[oó]n|siguiente|pr[oó]xim|acci[oó]n|atenci[oó]n/.test(
      msg,
    )
  const referencedAnimals = animals.filter(
    (animal) =>
      animal.numero &&
      new RegExp(
        `(^|[^a-z0-9])${escapeRegExp(String(animal.numero).toLowerCase())}([^a-z0-9]|$)`,
      ).test(msg),
  )
  return {
    wantsAnimalList,
    wantsBreeding,
    wantsMilk,
    wantsMovements,
    wantsGuidance,
    referencedAnimals,
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
