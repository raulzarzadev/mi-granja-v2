'use client'

import React, { useMemo, useState } from 'react'
import AnimalDetailView from '@/components/AnimalDetailView'
import AnimalTag from '@/components/AnimalTag'
import { Modal } from '@/components/Modal'
import { Animal } from '@/types/animals'

interface GeneticTreeProps {
  animals: Animal[]
}

// ── Index para buscar animales por id O animalNumber ──────────────────

type AnimalIndex = {
  byId: Map<string, Animal>
  byNumber: Map<string, Animal>
}

const buildIndex = (animals: Animal[]): AnimalIndex => {
  const byId = new Map<string, Animal>()
  const byNumber = new Map<string, Animal>()
  for (const a of animals) {
    byId.set(a.id, a)
    if (a.animalNumber) byNumber.set(a.animalNumber, a)
  }
  return { byId, byNumber }
}

const lookup = (idx: AnimalIndex, ref?: string): Animal | undefined => {
  if (!ref) return undefined
  return idx.byId.get(ref) || idx.byNumber.get(ref)
}

/** Resuelve referencia: AnimalTag clickable si existe, texto crudo si no */
const ParentRef: React.FC<{
  ref_id?: string
  idx: AnimalIndex
  onSelect: (animal: Animal) => void
}> = ({ ref_id, idx, onSelect }) => {
  if (!ref_id) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] text-gray-300 border border-dashed border-gray-200">
        ?
      </span>
    )
  }
  const animal = lookup(idx, ref_id)
  if (animal) {
    return <AnimalTag animal={animal} onClick={() => onSelect(animal)} />
  }
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] text-gray-400 border border-dashed border-gray-200 bg-gray-50">
      #{ref_id}
    </span>
  )
}

// ── Vertical line ─────────────────────────────────────────────────────

const VLine: React.FC<{ h?: number }> = ({ h = 16 }) => (
  <div className="flex justify-center" style={{ height: h }}>
    <div className="w-px bg-gray-300 h-full" />
  </div>
)

// ── Family groups ─────────────────────────────────────────────────────

interface MateGroup {
  mother?: Animal
  rawMotherId?: string
  offspring: Animal[]
}

interface SireFamily {
  father?: Animal
  rawFatherId?: string
  mates: MateGroup[]
  totalOffspring: number
}

const buildSireFamilies = (animals: Animal[], idx: AnimalIndex): SireFamily[] => {
  const sireMap = new Map<
    string,
    { father?: Animal; rawFatherId?: string; mateMap: Map<string, MateGroup> }
  >()

  for (const a of animals) {
    if (!a.fatherId && !a.motherId) continue
    const fKey = a.fatherId || '?'

    if (!sireMap.has(fKey)) {
      sireMap.set(fKey, {
        father: lookup(idx, a.fatherId),
        rawFatherId: a.fatherId,
        mateMap: new Map(),
      })
    }

    const sire = sireMap.get(fKey)!
    const mKey = a.motherId || '?'
    if (!sire.mateMap.has(mKey)) {
      sire.mateMap.set(mKey, {
        mother: lookup(idx, a.motherId),
        rawMotherId: a.motherId,
        offspring: [],
      })
    }
    sire.mateMap.get(mKey)!.offspring.push(a)
  }

  return [...sireMap.values()]
    .map((s) => ({
      father: s.father,
      rawFatherId: s.rawFatherId,
      mates: [...s.mateMap.values()].sort((a, b) => b.offspring.length - a.offspring.length),
      totalOffspring: [...s.mateMap.values()].reduce((sum, m) => sum + m.offspring.length, 0),
    }))
    .sort((a, b) => b.totalOffspring - a.totalOffspring)
}

// ── Ancestry levels ───────────────────────────────────────────────────

const buildAncestryLevels = (
  animal: Animal,
  idx: AnimalIndex,
  maxGen: number,
): { ref: string | undefined; animal?: Animal }[][] => {
  const levels: { ref: string | undefined; animal?: Animal }[][] = [[{ ref: animal.id, animal }]]

  for (let gen = 0; gen < maxGen; gen++) {
    const prev = levels[gen]
    const next: { ref: string | undefined; animal?: Animal }[] = []
    let hasAny = false
    for (const entry of prev) {
      const a = entry.animal
      const motherRef = a?.motherId
      const fatherRef = a?.fatherId
      next.push({ ref: motherRef, animal: lookup(idx, motherRef) })
      next.push({ ref: fatherRef, animal: lookup(idx, fatherRef) })
      if (motherRef || fatherRef) hasAny = true
    }
    if (!hasAny) break
    levels.push(next)
  }

  return levels
}

// ── Descendant levels ────────────────────────────────────────────────

const buildDescendantLevels = (animal: Animal, animals: Animal[], maxGen: number): Animal[][] => {
  const levels: Animal[][] = [[animal]]
  const seen = new Set<string>([animal.id])

  for (let gen = 0; gen < maxGen; gen++) {
    const prev = levels[gen]
    const next: Animal[] = []
    for (const parent of prev) {
      const children = animals.filter(
        (a) =>
          (a.motherId === parent.id ||
            a.fatherId === parent.id ||
            a.motherId === parent.animalNumber ||
            a.fatherId === parent.animalNumber) &&
          !seen.has(a.id),
      )
      for (const child of children) {
        seen.add(child.id)
        next.push(child)
      }
    }
    if (next.length === 0) break
    levels.push(next)
  }

  return levels
}

// ── Collapsible sire card ─────────────────────────────────────────────

const SireCard: React.FC<{
  sire: SireFamily
  idx: AnimalIndex
  onAnimalClick: (animal: Animal) => void
  defaultOpen?: boolean
}> = ({ sire, idx, onAnimalClick, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen)

  const fatherLabel = sire.father
    ? `#${sire.father.animalNumber}`
    : sire.rawFatherId
      ? `#${sire.rawFatherId}`
      : '?'

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header clickable para colapsar */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-4 h-4 text-blue-400 transition-transform ${open ? 'rotate-90' : ''}`}
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-xs font-medium text-blue-600 uppercase">Macho</span>
          {sire.father ? (
            <span
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.stopPropagation()
              }}
            >
              <AnimalTag animal={sire.father} onClick={() => onAnimalClick(sire.father!)} />
            </span>
          ) : (
            <span className="text-xs text-gray-400">{fatherLabel}</span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {sire.totalOffspring} cria{sire.totalOffspring !== 1 ? 's' : ''} · {sire.mates.length}{' '}
          hembra{sire.mates.length !== 1 ? 's' : ''}
        </span>
      </button>

      {/* Contenido colapsable */}
      {open && (
        <div className="divide-y divide-gray-100">
          {sire.mates.map((mate, mi) => (
            <div key={mi} className="px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-medium text-pink-500 uppercase">Hembra</span>
                <ParentRef ref_id={mate.rawMotherId} idx={idx} onSelect={onAnimalClick} />
                <span className="text-[10px] text-gray-400">({mate.offspring.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pl-4">
                {mate.offspring.map((child) => (
                  <AnimalTag key={child.id} animal={child} onClick={() => onAnimalClick(child)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────

const GeneticTree: React.FC<GeneticTreeProps> = ({ animals }) => {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'families' | 'ancestors' | 'descendants'>('families')
  const [detailAnimal, setDetailAnimal] = useState<Animal | null>(null)
  const [treeAnimal, setTreeAnimal] = useState<Animal | null>(null)
  const [maxGen, setMaxGen] = useState(3)

  const idx = useMemo(() => buildIndex(animals), [animals])

  const sireFamilies = useMemo(() => buildSireFamilies(animals, idx), [animals, idx])

  // Animales sin padre ni madre
  const orphans = useMemo(() => {
    const parentIds = new Set<string>()
    for (const a of animals) {
      if (a.motherId) parentIds.add(a.motherId)
      if (a.fatherId) parentIds.add(a.fatherId)
    }
    // Sin padres Y no es padre de nadie
    return animals.filter(
      (a) => !a.motherId && !a.fatherId && !parentIds.has(a.id) && !parentIds.has(a.animalNumber),
    )
  }, [animals])

  const filteredFamilies = useMemo(() => {
    if (!search) return sireFamilies
    const q = search.toLowerCase()
    return sireFamilies.filter((sf) => {
      if (sf.father?.animalNumber.toLowerCase().includes(q)) return true
      if (sf.father?.name?.toLowerCase().includes(q)) return true
      if (sf.rawFatherId?.toLowerCase().includes(q)) return true
      return sf.mates.some((m) => {
        if (m.mother?.animalNumber.toLowerCase().includes(q)) return true
        if (m.mother?.name?.toLowerCase().includes(q)) return true
        if (m.rawMotherId?.toLowerCase().includes(q)) return true
        return m.offspring.some(
          (a) => a.animalNumber.toLowerCase().includes(q) || a.name?.toLowerCase().includes(q),
        )
      })
    })
  }, [sireFamilies, search])

  const filteredOrphans = useMemo(() => {
    if (!search) return orphans
    const q = search.toLowerCase()
    return orphans.filter(
      (a) => a.animalNumber.toLowerCase().includes(q) || a.name?.toLowerCase().includes(q),
    )
  }, [orphans, search])

  const filteredAnimals = useMemo(() => {
    if (!search) return animals
    const q = search.toLowerCase()
    return animals.filter(
      (a) => a.animalNumber.toLowerCase().includes(q) || a.name?.toLowerCase().includes(q),
    )
  }, [animals, search])

  const stats = useMemo(() => {
    const fatherIds = new Set<string>()
    const motherIds = new Set<string>()
    let withBoth = 0
    for (const a of animals) {
      if (a.fatherId) fatherIds.add(a.fatherId)
      if (a.motherId) motherIds.add(a.motherId)
      if (a.motherId && a.fatherId) withBoth++
    }
    return { sires: fatherIds.size, dams: motherIds.size, withBoth, orphans: orphans.length }
  }, [animals, orphans])

  const handleAnimalClick = (animal: Animal) => {
    setDetailAnimal(animal)
  }

  // ── Render ancestry tree ──
  const renderAncestry = (animal: Animal, depth: number) => {
    const levels = buildAncestryLevels(animal, idx, depth)
    const reversed = [...levels].reverse()

    return (
      <div className="flex flex-col items-center gap-0">
        {reversed.map((level, li) => (
          <React.Fragment key={li}>
            {li > 0 && <VLine />}
            <div className="flex justify-center items-center gap-3 flex-wrap">
              {level.map((entry, ei) =>
                entry.animal ? (
                  <AnimalTag
                    key={entry.animal.id}
                    animal={entry.animal}
                    active={entry.animal.id === animal.id}
                    onClick={() => handleAnimalClick(entry.animal!)}
                  />
                ) : entry.ref ? (
                  <span
                    key={`raw-${ei}`}
                    className="inline-flex items-center px-2 py-1 rounded-md text-[10px] text-gray-400 border border-dashed border-gray-200 bg-gray-50"
                  >
                    #{entry.ref}
                  </span>
                ) : (
                  <span
                    key={`unk-${ei}`}
                    className="inline-flex items-center px-2 py-1 rounded-md text-[10px] text-gray-300 border border-dashed border-gray-200"
                  >
                    ?
                  </span>
                ),
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
    )
  }

  // ── Render descendants tree ──
  const renderDescendants = (animal: Animal, depth: number) => {
    const levels = buildDescendantLevels(animal, animals, depth)

    return (
      <div className="flex flex-col items-center gap-0">
        {levels.map((level, li) => (
          <React.Fragment key={li}>
            {li > 0 && <VLine />}
            <div className="flex justify-center items-center gap-3 flex-wrap">
              {level.map((a) => (
                <AnimalTag
                  key={a.id}
                  animal={a}
                  active={a.id === animal.id}
                  onClick={() => handleAnimalClick(a)}
                />
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h3 className="text-lg font-semibold">Arbol Genealogico</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{stats.sires} machos</span>
            <span>·</span>
            <span>{stats.dams} hembras</span>
            <span>·</span>
            <span>{stats.withBoth} con ambos padres</span>
            {stats.orphans > 0 && (
              <>
                <span>·</span>
                <span>{stats.orphans} sin genealogia</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Buscar por numero o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden text-xs">
            {(['families', 'ancestors', 'descendants'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setView(v)
                  setTreeAnimal(null)
                }}
                className={`px-3 py-1.5 transition-colors ${
                  view === v
                    ? 'bg-green-100 text-green-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {v === 'families' ? 'Familias' : v === 'ancestors' ? 'Ancestros' : 'Descendientes'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Families view (agrupado por macho, colapsable) ── */}
      {view === 'families' && (
        <div className="space-y-3">
          {filteredFamilies.map((sire, si) => (
            <SireCard
              key={si}
              sire={sire}
              idx={idx}
              onAnimalClick={handleAnimalClick}
              defaultOpen={si === 0}
            />
          ))}

          {/* Animales sin genealogia */}
          {filteredOrphans.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <details>
                <summary className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      Sin genealogia
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{filteredOrphans.length} animales</span>
                </summary>
                <div className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {filteredOrphans.map((a) => (
                      <AnimalTag key={a.id} animal={a} onClick={() => handleAnimalClick(a)} />
                    ))}
                  </div>
                </div>
              </details>
            </div>
          )}

          {filteredFamilies.length === 0 && filteredOrphans.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-sm text-gray-400">
              No se encontraron animales
            </div>
          )}
        </div>
      )}

      {/* ── Ancestors / Descendants view ──────── */}
      {(view === 'ancestors' || view === 'descendants') && (
        <div className="space-y-3">
          {!treeAnimal && (
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500 mb-3">Selecciona un animal:</p>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                {filteredAnimals.map((a) => (
                  <AnimalTag key={a.id} animal={a} onClick={() => setTreeAnimal(a)} />
                ))}
              </div>
            </div>
          )}

          {treeAnimal && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTreeAnimal(null)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <AnimalTag animal={treeAnimal} showAge />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={maxGen}
                    onChange={(e) => setMaxGen(Number(e.target.value))}
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                  >
                    {[2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} generaciones
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto py-4">
                {view === 'ancestors'
                  ? renderAncestry(treeAnimal, maxGen)
                  : renderDescendants(treeAnimal, maxGen)}
              </div>

              {/* Quick links */}
              <div className="border-t pt-3 mt-3 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                {treeAnimal.motherId &&
                  (() => {
                    const m = lookup(idx, treeAnimal.motherId)
                    return m ? (
                      <span>
                        Madre:{' '}
                        <button
                          type="button"
                          className="text-green-600 hover:underline font-medium"
                          onClick={() => setTreeAnimal(m)}
                        >
                          #{m.animalNumber}
                        </button>
                      </span>
                    ) : (
                      <span>Madre: #{treeAnimal.motherId}</span>
                    )
                  })()}
                {treeAnimal.fatherId &&
                  (() => {
                    const f = lookup(idx, treeAnimal.fatherId)
                    return f ? (
                      <span>
                        Padre:{' '}
                        <button
                          type="button"
                          className="text-green-600 hover:underline font-medium"
                          onClick={() => setTreeAnimal(f)}
                        >
                          #{f.animalNumber}
                        </button>
                      </span>
                    ) : (
                      <span>Padre: #{treeAnimal.fatherId}</span>
                    )
                  })()}
                {(() => {
                  const kids = animals.filter(
                    (a) =>
                      a.motherId === treeAnimal.id ||
                      a.fatherId === treeAnimal.id ||
                      a.motherId === treeAnimal.animalNumber ||
                      a.fatherId === treeAnimal.animalNumber,
                  )
                  return kids.length > 0 ? (
                    <span>
                      {kids.length} cria{kids.length !== 1 ? 's' : ''}:{' '}
                      {kids.slice(0, 8).map((k, i) => (
                        <React.Fragment key={k.id}>
                          {i > 0 && ', '}
                          <button
                            type="button"
                            className="text-green-600 hover:underline font-medium"
                            onClick={() => setTreeAnimal(k)}
                          >
                            #{k.animalNumber}
                          </button>
                        </React.Fragment>
                      ))}
                      {kids.length > 8 && ` +${kids.length - 8}`}
                    </span>
                  ) : null
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modal detalle del animal ─────────── */}
      <Modal
        isOpen={!!detailAnimal}
        onClose={() => setDetailAnimal(null)}
        title="Detalles del Animal"
        size="lg"
      >
        {detailAnimal && <AnimalDetailView animal={detailAnimal} />}
      </Modal>
    </div>
  )
}

export default GeneticTree
