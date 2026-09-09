'use client'

import React, { useMemo, useState } from 'react'
import AnimalBadges from '@/components/AnimalBadges'
import { Modal } from '@/components/Modal'
import { Animal, animal_icon, gender_icon } from '@/types/animals'

interface Props {
  animal: Animal
  allAnimals: Animal[]
}

const MAX_SIBLINGS_MODAL = 200

const AnimalFamilyTree: React.FC<Props> = ({ animal, allAnimals }) => {
  const findAnimal = (id?: string): Animal | null => {
    if (!id) return null
    return allAnimals.find((a) => a.id === id || a.animalNumber === id) || null
  }

  const [siblingModal, setSiblingModal] = useState<'completos' | 'madre' | 'padre' | null>(null)

  const tree = useMemo(() => {
    const mother = findAnimal(animal.motherId)
    const father = findAnimal(animal.fatherId)
    const maternalGM = mother ? findAnimal(mother.motherId) : null
    const maternalGF = mother ? findAnimal(mother.fatherId) : null
    const paternalGM = father ? findAnimal(father.motherId) : null
    const paternalGF = father ? findAnimal(father.fatherId) : null

    const animalId = animal.id
    const animalNumber = animal.animalNumber

    // Hijos
    const children: Animal[] = []
    for (const a of allAnimals) {
      if (a.id === animalId) continue
      if (
        a.motherId === animalId ||
        a.fatherId === animalId ||
        a.motherId === animalNumber ||
        a.fatherId === animalNumber
      ) {
        children.push(a)
      }
    }

    // Hermanos
    const motherId = animal.motherId
    const fatherId = animal.fatherId
    const motherNumber = mother?.animalNumber
    const fatherNumber = father?.animalNumber
    let fullCount = 0
    let maternalCount = 0
    let paternalCount = 0

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
        if (matchMother && matchFather) fullCount++
        else if (matchMother) maternalCount++
        else if (matchFather) paternalCount++
      }
    }

    return {
      mother,
      father,
      maternalGM,
      maternalGF,
      paternalGM,
      paternalGF,
      children,
      fullCount,
      maternalCount,
      paternalCount,
    }
  }, [animal.id, animal.motherId, animal.fatherId, animal.animalNumber, allAnimals])

  // Siblings for modal
  const modalSiblings = useMemo(() => {
    if (!siblingModal) return []
    const result: Animal[] = []
    const motherObj = tree.mother
    const fatherObj = tree.father
    for (const a of allAnimals) {
      if (a.id === animal.id || result.length >= MAX_SIBLINGS_MODAL) continue
      const matchMother =
        animal.motherId &&
        (a.motherId === animal.motherId ||
          a.motherId === motherObj?.animalNumber ||
          (motherObj && a.motherId === motherObj.id))
      const matchFather =
        animal.fatherId &&
        (a.fatherId === animal.fatherId ||
          a.fatherId === fatherObj?.animalNumber ||
          (fatherObj && a.fatherId === fatherObj.id))
      if (siblingModal === 'completos' && matchMother && matchFather) result.push(a)
      else if (siblingModal === 'madre' && matchMother && !matchFather) result.push(a)
      else if (siblingModal === 'padre' && matchFather && !matchMother) result.push(a)
    }
    return result
  }, [
    siblingModal,
    animal.id,
    animal.motherId,
    animal.fatherId,
    allAnimals,
    tree.mother,
    tree.father,
  ])

  const { mother, father, maternalGM, maternalGF, paternalGM, paternalGF } = tree
  const hasAncestors = mother || father
  const hasGrandparents = maternalGM || maternalGF || paternalGM || paternalGF
  const hasSiblings = tree.fullCount > 0 || tree.maternalCount > 0 || tree.paternalCount > 0

  /* ─── Subcomponents ─── */

  const Node: React.FC<{
    a: Animal | null
    label: string
    highlight?: boolean
    placeholder?: string
    size?: 'sm' | 'md' | 'lg'
  }> = ({ a, label, highlight, placeholder, size = 'md' }) => {
    const sizeClasses = {
      sm: 'px-2 py-1 text-[11px]',
      md: 'px-3 py-1.5 text-xs',
      lg: 'px-3 py-2 text-sm',
    }
    if (!a) {
      return (
        <div
          className={`border border-dashed border-gray-200 rounded-lg ${sizeClasses[size]} text-center text-gray-300`}
        >
          <div className="text-[10px] mb-0.5">{label}</div>
          {placeholder || '?'}
        </div>
      )
    }
    return (
      <div
        className={`border rounded-lg ${sizeClasses[size]} ${highlight ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : 'border-gray-200 bg-white'}`}
      >
        <div className="text-[10px] text-gray-400 mb-0.5">{label}</div>
        <div className="flex items-center gap-1.5">
          <span className={size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'}>
            {animal_icon[a.type] || '🐾'}
          </span>
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

  const Connector: React.FC<{ type: 'vertical' | 'fork' | 'spread'; cols?: number }> = ({
    type,
    cols,
  }) => {
    if (type === 'vertical') {
      return (
        <div className="flex justify-center">
          <div className="w-px h-5 bg-gray-300" />
        </div>
      )
    }
    if (type === 'fork') {
      return (
        <div className="flex items-center px-4">
          <div className="flex-1 h-px bg-gray-300" />
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex-1 h-px bg-gray-300" />
        </div>
      )
    }
    // spread: horizontal line connecting N children
    if (type === 'spread' && cols && cols > 1) {
      return (
        <div className="relative h-5">
          <div className="absolute left-1/2 top-0 w-px h-2 bg-gray-300 -translate-x-1/2" />
          <div
            className="absolute top-2 h-px bg-gray-300"
            style={{ left: `${100 / (cols * 2)}%`, right: `${100 / (cols * 2)}%` }}
          />
          {Array.from({ length: cols }).map((_, i) => (
            <div
              key={i}
              className="absolute top-2 w-px h-3 bg-gray-300"
              style={{
                left: `${100 / (cols * 2) + (i * 100) / cols}%`,
                transform: 'translateX(-50%)',
              }}
            />
          ))}
        </div>
      )
    }
    return (
      <div className="flex justify-center">
        <div className="w-px h-5 bg-gray-300" />
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {/* ═══ ANCESTROS ═══ */}

      {/* Abuelos */}
      {hasGrandparents && (
        <div className="mb-0">
          <div className="grid grid-cols-2 gap-6">
            {/* Abuelos maternos */}
            <div>
              <div className="grid grid-cols-2 gap-1">
                <Node a={maternalGM} label="Abuela mat." size="sm" />
                <Node a={maternalGF} label="Abuelo mat." size="sm" />
              </div>
              <Connector type="fork" />
            </div>
            {/* Abuelos paternos */}
            <div>
              <div className="grid grid-cols-2 gap-1">
                <Node a={paternalGM} label="Abuela pat." size="sm" />
                <Node a={paternalGF} label="Abuelo pat." size="sm" />
              </div>
              <Connector type="fork" />
            </div>
          </div>
        </div>
      )}

      {/* Padres */}
      {hasAncestors && (
        <div className="mb-0">
          <div className="grid grid-cols-2 gap-6">
            <Node a={mother} label="Madre" placeholder="Desconocida" />
            <Node a={father} label="Padre" placeholder="Desconocido" />
          </div>
          <Connector type="fork" />
        </div>
      )}

      {/* ═══ ANIMAL + HERMANOS ═══ */}
      <div className={`relative mx-auto max-w-xs ${hasSiblings ? 'pb-10 max-[480px]:pb-0' : ''}`}>
        <Node a={animal} label="Animal" highlight size="lg" />

        {hasSiblings && (
          <aside
            aria-label="Hermanos"
            className="absolute left-full top-0 ml-1 w-24 max-[480px]:static max-[480px]:mt-2 max-[480px]:ml-0 max-[480px]:w-full"
          >
            <p className="mb-0.5 px-1 text-[9px] font-semibold uppercase tracking-wide text-gray-500">
              Hermanos
            </p>
            <div className="space-y-0.5 max-[480px]:flex max-[480px]:flex-wrap max-[480px]:gap-1 max-[480px]:space-y-0">
              {tree.fullCount > 0 && (
                <button
                  type="button"
                  aria-label={`Ver ${tree.fullCount} hermanos completos`}
                  onClick={() => setSiblingModal('completos')}
                  className="flex min-h-7 w-full cursor-pointer items-center justify-between gap-1 rounded-md border border-gray-200 bg-white px-1.5 text-[10px] text-gray-600 transition-colors hover:border-green-300 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1 max-[480px]:w-auto"
                >
                  <span>Completos</span>
                  <span className="font-semibold text-gray-800">{tree.fullCount}</span>
                </button>
              )}
              {tree.maternalCount > 0 && (
                <button
                  type="button"
                  aria-label={`Ver ${tree.maternalCount} medios hermanos por madre`}
                  onClick={() => setSiblingModal('madre')}
                  className="flex min-h-7 w-full cursor-pointer items-center justify-between gap-1 rounded-md border border-gray-200 bg-white px-1.5 text-[10px] text-gray-600 transition-colors hover:border-green-300 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1 max-[480px]:w-auto"
                >
                  <span>1/2 madre</span>
                  <span className="font-semibold text-gray-800">{tree.maternalCount}</span>
                </button>
              )}
              {tree.paternalCount > 0 && (
                <button
                  type="button"
                  aria-label={`Ver ${tree.paternalCount} medios hermanos por padre`}
                  onClick={() => setSiblingModal('padre')}
                  className="flex min-h-7 w-full cursor-pointer items-center justify-between gap-1 rounded-md border border-gray-200 bg-white px-1.5 text-[10px] text-gray-600 transition-colors hover:border-green-300 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1 max-[480px]:w-auto"
                >
                  <span>1/2 padre</span>
                  <span className="font-semibold text-gray-800">{tree.paternalCount}</span>
                </button>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ═══ DESCENDENCIA ═══ */}
      {tree.children.length > 0 && (
        <div className="mt-1">
          <Connector type="vertical" />

          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 text-center">
            Hijos ({tree.children.length})
          </div>

          {/* Lista de hijos */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {tree.children.slice(0, 20).map((child) => (
              <AnimalBadges key={child.id} animal={child} ageFormat="rounded" variant="tag" />
            ))}
          </div>
          {tree.children.length > 20 && (
            <p className="text-[10px] text-gray-400 text-center mt-1">
              +{tree.children.length - 20} hijos mas
            </p>
          )}
        </div>
      )}

      {/* Sin familia */}
      {!hasAncestors && tree.children.length === 0 && !hasSiblings && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🧬</div>
          <p>No hay informacion genealogica</p>
          <p className="text-xs text-gray-400 mt-1">Asigna madre/padre para ver su arbol</p>
        </div>
      )}

      {/* ═══ Modal hermanos ═══ */}
      {siblingModal && (
        <Modal
          isOpen={true}
          title={
            siblingModal === 'completos'
              ? `Hermanos completos (${tree.fullCount})`
              : siblingModal === 'madre'
                ? `Medios hermanos — madre (${tree.maternalCount})`
                : `Medios hermanos — padre (${tree.paternalCount})`
          }
          onClose={() => setSiblingModal(null)}
        >
          <div className="max-h-96 overflow-y-auto space-y-1 p-1">
            {modalSiblings.map((sib) => (
              <div
                key={sib.id}
                className="flex items-center gap-2 px-3 py-2 border border-gray-100 rounded-lg text-sm"
              >
                <span>{animal_icon[sib.type] || '🐾'}</span>
                <span className="font-medium">#{sib.animalNumber}</span>
                <span className={sib.gender === 'macho' ? 'text-blue-500' : 'text-pink-500'}>
                  {gender_icon[sib.gender]}
                </span>
                {sib.name && <span className="text-gray-400 text-xs">{sib.name}</span>}
                {sib.breed && <span className="text-gray-400 text-xs">{sib.breed}</span>}
                {sib.status !== 'activo' && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                    {sib.status}
                  </span>
                )}
              </div>
            ))}
            {(siblingModal === 'completos'
              ? tree.fullCount
              : siblingModal === 'madre'
                ? tree.maternalCount
                : tree.paternalCount) > MAX_SIBLINGS_MODAL && (
              <p className="text-xs text-gray-400 text-center py-2">
                Mostrando {MAX_SIBLINGS_MODAL} de{' '}
                {siblingModal === 'completos'
                  ? tree.fullCount
                  : siblingModal === 'madre'
                    ? tree.maternalCount
                    : tree.paternalCount}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

export default AnimalFamilyTree
