'use client'

import React, { useMemo, useState } from 'react'
import AnimalBadges from '@/components/AnimalBadges'
import { EmojiIcon } from '@/components/Icon/emoji-icons'
import { Modal } from '@/components/Modal'
import { toSafeDate } from '@/lib/dateUtils'
import { Animal } from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'

interface Props {
  animal: Animal
  allAnimals: Animal[]
  breedings?: BreedingRecord[]
}

const MAX_SIBLINGS_MODAL = 200

const AnimalFamilyTree: React.FC<Props> = ({ animal, allAnimals, breedings = [] }) => {
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

    // Nacimientos más antiguos primero; edad aproximada como alternativa.
    const now = Date.now()
    const birthOrder = (child: Animal) => {
      if (child.birthDate) {
        const timestamp = toSafeDate(child.birthDate).getTime()
        if (Number.isFinite(timestamp)) return timestamp
      }
      if (typeof child.age === 'number' && child.age >= 0)
        return now - child.age * 30.4375 * 86400000
      return Number.POSITIVE_INFINITY
    }
    children.sort((a, b) => {
      const first = birthOrder(a)
      const second = birthOrder(b)
      return (
        (first === second ? 0 : first - second) ||
        a.animalNumber.localeCompare(b.animalNumber, 'es', { numeric: true, sensitivity: 'base' })
      )
    })

    // Un grupo por parto documentado; sin evidencia cada hijo queda separado.
    const childIds = new Set(children.map((child) => child.id))
    const familyKeys = new Map<string, string>()
    for (const breeding of breedings) {
      for (const info of breeding.femaleBreedingInfo ?? []) {
        if (!info.actualBirthDate || !info.offspring?.length) continue
        const groupKey = `${info.femaleId}-${toSafeDate(info.actualBirthDate).getTime()}`
        for (const id of info.offspring) {
          if (childIds.has(id)) familyKeys.set(id, groupKey)
        }
      }
    }
    // Respaldos antiguos: el parto puede existir en records aunque no tenga empadre.
    for (const child of children) {
      const birthRecord = child.records?.find(
        (record) =>
          !record.undoneAt &&
          record.details?.legacyEventType === 'BIRTH' &&
          record.details?.legacyEventId,
      )
      if (birthRecord) familyKeys.set(child.id, `birth-${birthRecord.details!.legacyEventId}`)
    }
    // Partos de la versión actual sin empadre: el comprobante de la madre
    // identifica exactamente los documentos de crías creados en ese movimiento.
    for (const mother of allAnimals) {
      for (const record of mother.records ?? []) {
        if (record.eventType !== 'parto' || record.undoneAt) continue
        for (const entry of record.undoData?.documents ?? []) {
          if (entry.before !== null || !entry.path.startsWith('animals/')) continue
          const childId = entry.path.slice('animals/'.length)
          const child = children.find((candidate) => candidate.id === childId)
          if (child && (child.motherId === mother.id || child.motherId === mother.animalNumber)) {
            familyKeys.set(child.id, `parto-${mother.id}-${record.id}`)
          }
        }
      }
    }
    const grouped = new Map<string, Animal[]>()
    for (const child of children) {
      const groupKey = familyKeys.get(child.id) ?? child.id
      const group = grouped.get(groupKey) ?? []
      group.push(child)
      grouped.set(groupKey, group)
    }
    const childGroups: Animal[][] = []
    let visibleChildren = 0
    for (const group of grouped.values()) {
      if (visibleChildren >= 20) break
      childGroups.push(group)
      visibleChildren += group.length
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
      childGroups,
      visibleChildren,
      fullCount,
      maternalCount,
      paternalCount,
    }
  }, [animal.id, animal.motherId, animal.fatherId, animal.animalNumber, allAnimals, breedings])

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
        <AnimalBadges
          animal={a}
          ageFormat="rounded"
          variant="tag"
          compact
          showSpecies={false}
          showState={false}
          showStateLabel={false}
        />
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
          <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 min-[480px]:gap-6">
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
            {tree.childGroups.map((group, index) => (
              <React.Fragment key={group[0].id}>
                {index > 0 && (
                  <span
                    aria-hidden="true"
                    className="mx-1 h-5 w-0.5 shrink-0 self-center rounded-full bg-slate-400"
                  />
                )}
                <span
                  className="inline-flex max-w-full flex-wrap items-center justify-center gap-1.5"
                  role={group.length > 1 ? 'group' : undefined}
                  aria-label={group.length > 1 ? 'Hermanos del mismo parto registrado' : undefined}
                >
                  {group.map((child) => (
                    <AnimalBadges
                      key={child.id}
                      animal={child}
                      ageFormat="rounded"
                      variant="tag"
                      compact
                      showSpecies={false}
                      showState={false}
                      showStateLabel={false}
                    />
                  ))}
                </span>
              </React.Fragment>
            ))}
          </div>
          {tree.children.length > tree.visibleChildren && (
            <p className="text-[10px] text-gray-400 text-center mt-1">
              +{tree.children.length - tree.visibleChildren} hijos mas
            </p>
          )}
        </div>
      )}

      {/* Sin familia */}
      {!hasAncestors && tree.children.length === 0 && !hasSiblings && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">
            <EmojiIcon emoji="🧬" />
          </div>
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
                <AnimalBadges
                  animal={sib}
                  ageFormat="rounded"
                  variant="tag"
                  compact
                  showSpecies={false}
                  showState={false}
                  showStateLabel={false}
                />
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
