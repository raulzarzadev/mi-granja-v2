'use client'

import React, { useMemo } from 'react'
import { Animal, animal_icon, gender_icon } from '@/types/animals'

interface Props {
  animal: Animal
  allAnimals: Animal[]
}

const AnimalFamilyTree: React.FC<Props> = ({ animal, allAnimals }) => {
  const findAnimal = (id?: string): Animal | null => {
    if (!id) return null
    return allAnimals.find((a) => a.id === id || a.animalNumber === id) || null
  }

  // Pre-computar todo en un solo useMemo
  const tree = useMemo(() => {
    const mother = findAnimal(animal.motherId)
    const father = findAnimal(animal.fatherId)

    const maternalGM = mother ? findAnimal(mother.motherId) : null
    const maternalGF = mother ? findAnimal(mother.fatherId) : null
    const paternalGM = father ? findAnimal(father.motherId) : null
    const paternalGF = father ? findAnimal(father.fatherId) : null

    // Índices para búsqueda rápida
    const animalId = animal.id
    const animalNumber = animal.animalNumber

    let childrenCount = 0
    let grandchildrenCount = 0
    const childIds: string[] = []

    // Contar hijos en una sola pasada
    for (const a of allAnimals) {
      if (a.id === animalId) continue
      if (
        a.motherId === animalId ||
        a.fatherId === animalId ||
        a.motherId === animalNumber ||
        a.fatherId === animalNumber
      ) {
        childrenCount++
        childIds.push(a.id)
      }
    }

    // Contar nietos solo si hay hijos (una pasada más)
    if (childIds.length > 0) {
      const childIdSet = new Set(childIds)
      const childNumbers = new Set(
        childIds.map((id) => allAnimals.find((a) => a.id === id)?.animalNumber).filter(Boolean),
      )
      for (const a of allAnimals) {
        if (childIdSet.has(a.id)) continue
        if (
          childIdSet.has(a.motherId || '') ||
          childIdSet.has(a.fatherId || '') ||
          childNumbers.has(a.motherId || '') ||
          childNumbers.has(a.fatherId || '')
        ) {
          grandchildrenCount++
        }
      }
    }

    // Hermanos: separar en completos, maternos y paternos
    const motherId = animal.motherId
    const fatherId = animal.fatherId
    const motherNumber = mother?.animalNumber
    const fatherNumber = father?.animalNumber

    const fullSiblings: Animal[] = []
    const maternalHalf: Animal[] = []
    const paternalHalf: Animal[] = []
    let fullCount = 0
    let maternalCount = 0
    let paternalCount = 0
    const MAX_SHOW = 8

    if (motherId || fatherId) {
      for (const a of allAnimals) {
        if (a.id === animalId) continue
        const matchMother =
          motherId &&
          (a.motherId === motherId ||
            a.motherId === motherNumber ||
            (mother && a.motherId === mother.id))
        const matchFather =
          fatherId &&
          (a.fatherId === fatherId ||
            a.fatherId === fatherNumber ||
            (father && a.fatherId === father.id))

        if (matchMother && matchFather) {
          fullCount++
          if (fullSiblings.length < MAX_SHOW) fullSiblings.push(a)
        } else if (matchMother) {
          maternalCount++
          if (maternalHalf.length < MAX_SHOW) maternalHalf.push(a)
        } else if (matchFather) {
          paternalCount++
          if (paternalHalf.length < MAX_SHOW) paternalHalf.push(a)
        }
      }
    }

    return {
      mother,
      father,
      maternalGM,
      maternalGF,
      paternalGM,
      paternalGF,
      childrenCount,
      grandchildrenCount,
      fullSiblings,
      fullCount,
      maternalHalf,
      maternalCount,
      paternalHalf,
      paternalCount,
    }
  }, [animal.id, animal.motherId, animal.fatherId, animal.animalNumber, allAnimals])

  const { mother, father, maternalGM, maternalGF, paternalGM, paternalGF } = tree

  // Nodo del árbol
  const NodeCard: React.FC<{
    animal: Animal | null
    label: string
    depth: number
    placeholder?: string
  }> = ({ animal: a, label, depth, placeholder }) => {
    const absDepth = Math.abs(depth)
    const opacity = absDepth === 0 ? 1 : absDepth === 1 ? 0.85 : 0.6
    const scale = absDepth === 0 ? 'text-sm' : absDepth === 1 ? 'text-xs' : 'text-[11px]'
    const padding = absDepth === 0 ? 'px-3 py-2' : absDepth === 1 ? 'px-2.5 py-1.5' : 'px-2 py-1'
    const iconSize = absDepth === 0 ? 'text-lg' : absDepth === 1 ? 'text-base' : 'text-sm'

    if (!a) {
      return (
        <div
          className={`border border-dashed border-gray-200 rounded-lg ${padding} ${scale} text-gray-300 text-center`}
          style={{ opacity: opacity * 0.6 }}
        >
          <div className="text-[10px] text-gray-300 mb-0.5">{label}</div>
          <span>{placeholder || '?'}</span>
        </div>
      )
    }

    const isCurrent = depth === 0

    return (
      <div
        className={`border rounded-lg ${padding} ${scale} ${
          isCurrent
            ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
            : 'border-gray-200 bg-white'
        }`}
        style={{ opacity }}
      >
        <div className="text-[10px] text-gray-400 mb-0.5">{label}</div>
        <div className="flex items-center gap-1.5">
          <span className={iconSize}>{animal_icon[a.type] || '🐾'}</span>
          <div className="min-w-0">
            <div className="font-semibold truncate flex items-center gap-1">
              #{a.animalNumber}
              <span className={a.gender === 'macho' ? 'text-blue-500' : 'text-pink-500'}>
                {gender_icon[a.gender]}
              </span>
            </div>
            {a.breed && <div className="text-gray-400 truncate">{a.breed}</div>}
          </div>
        </div>
      </div>
    )
  }

  const HFork: React.FC = () => (
    <div className="flex items-center">
      <div className="flex-1 h-px bg-gray-200" />
      <div className="w-px h-3 bg-gray-200" />
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )

  const VLine: React.FC = () => (
    <div className="flex justify-center">
      <div className="w-px h-4 bg-gray-200" />
    </div>
  )

  const SiblingGroup: React.FC<{
    label: string
    animals: Animal[]
    total: number
    max: number
  }> = ({ label, animals: sibs, total, max }) => (
    <div>
      <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
        {label} ({total})
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {sibs.map((sib) => (
          <span
            key={sib.id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] bg-gray-50 border border-gray-200 text-gray-600"
            style={{ opacity: 0.75 }}
          >
            <span className="text-xs">{animal_icon[sib.type] || '🐾'}</span>
            #{sib.animalNumber}
            <span className={sib.gender === 'macho' ? 'text-blue-400' : 'text-pink-400'}>
              {gender_icon[sib.gender]}
            </span>
          </span>
        ))}
        {total > max && (
          <span className="text-[11px] text-gray-400 self-center">
            +{total - max} más
          </span>
        )}
      </div>
    </div>
  )

  const hasAncestors = mother || father
  const hasGrandparents = maternalGM || maternalGF || paternalGM || paternalGF

  return (
    <div className="space-y-4">
      {/* Abuelos */}
      {hasGrandparents && (
        <>
          <div className="grid grid-cols-4 gap-1.5">
            <NodeCard animal={maternalGM} label="Abuela mat." depth={2} />
            <NodeCard animal={maternalGF} label="Abuelo mat." depth={2} />
            <NodeCard animal={paternalGM} label="Abuela pat." depth={2} />
            <NodeCard animal={paternalGF} label="Abuelo pat." depth={2} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <HFork />
            <HFork />
          </div>
        </>
      )}

      {/* Padres */}
      {hasAncestors && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <NodeCard animal={mother} label="Madre" depth={1} placeholder="Desconocida" />
            <NodeCard animal={father} label="Padre" depth={1} placeholder="Desconocido" />
          </div>
          <HFork />
        </>
      )}

      {/* Animal principal */}
      <div className="max-w-xs mx-auto">
        <NodeCard animal={animal} label="Animal" depth={0} />
      </div>

      {/* Hermanos */}
      {(tree.fullCount > 0 || tree.maternalCount > 0 || tree.paternalCount > 0) && (
        <div className="space-y-3">
          {tree.fullCount > 0 && (
            <SiblingGroup
              label="Hermanos completos"
              animals={tree.fullSiblings}
              total={tree.fullCount}
              max={8}
            />
          )}
          {tree.maternalCount > 0 && (
            <SiblingGroup
              label="Medios hermanos (madre)"
              animals={tree.maternalHalf}
              total={tree.maternalCount}
              max={8}
            />
          )}
          {tree.paternalCount > 0 && (
            <SiblingGroup
              label="Medios hermanos (padre)"
              animals={tree.paternalHalf}
              total={tree.paternalCount}
              max={8}
            />
          )}
        </div>
      )}


      {/* Descendencia — solo contadores */}
      {(tree.childrenCount > 0 || tree.grandchildrenCount > 0) && (
        <>
          <VLine />
          <div className="flex gap-3">
            {tree.childrenCount > 0 && (
              <div className="flex-1 border border-gray-200 rounded-lg p-3 text-center" style={{ opacity: 0.85 }}>
                <div className="text-2xl mb-1">👶</div>
                <div className="text-lg font-bold text-gray-800">{tree.childrenCount}</div>
                <div className="text-xs text-gray-500">
                  {tree.childrenCount === 1 ? 'Hijo/a' : 'Hijos'}
                </div>
              </div>
            )}
            {tree.grandchildrenCount > 0 && (
              <div className="flex-1 border border-dashed border-gray-200 rounded-lg p-3 text-center" style={{ opacity: 0.6 }}>
                <div className="text-xl mb-1">👶</div>
                <div className="text-lg font-bold text-gray-600">{tree.grandchildrenCount}</div>
                <div className="text-[11px] text-gray-400">
                  {tree.grandchildrenCount === 1 ? 'Nieto/a' : 'Nietos'}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Sin familia */}
      {!hasAncestors && tree.childrenCount === 0 && tree.fullCount === 0 && tree.maternalCount === 0 && tree.paternalCount === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🧬</div>
          <p>No hay información genealógica</p>
          <p className="text-xs text-gray-400 mt-1">
            Asigna madre/padre para ver su árbol
          </p>
        </div>
      )}
    </div>
  )
}

export default AnimalFamilyTree
