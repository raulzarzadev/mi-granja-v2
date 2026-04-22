'use client'

import React, { useMemo, useState } from 'react'
import Button from '@/components/buttons/Button'
import DataTable from '@/components/DataTable'
import ModalAnimalDetails from '@/components/ModalAnimalDetails'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { formatDate, toDate } from '@/lib/dates'
import type { Animal } from '@/types/animals'
import { buildAnimalColumns } from '../columns/animalColumns'

interface Props {
  animals: Animal[]
}

const TabStagePerdidos: React.FC<Props> = ({ animals }) => {
  const { markFound } = useAnimalCRUD()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleMarkFound = async (id: string) => {
    setLoadingId(id)
    try {
      await markFound(id)
    } finally {
      setLoadingId(null)
    }
  }

  const columns = useMemo(() => {
    const base = buildAnimalColumns()
    return [
      ...base,
      {
        key: 'lostAt',
        label: 'Perdido el',
        render: (row: Animal) =>
          row.lostInfo?.lostAt ? (
            <span className="text-sm text-gray-600">
              {formatDate(toDate(row.lostInfo.lostAt as any))}
            </span>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          ),
      },
    ]
  }, [])

  return (
    <DataTable
      title="❓ Perdidos"
      data={animals}
      columns={columns}
      rowKey={(row) => row.id}
      defaultSortKey="animalNumber"
      sessionStorageKey="mg_last_perdido_id"
      emptyMessage="No hay animales marcados como perdidos."
      onView={(row) => (
        <div className="flex items-center gap-2">
          <ModalAnimalDetails
            animal={row}
            triggerComponent={
              <Button size="xs" variant="ghost" color="primary" icon="view">
                Ver
              </Button>
            }
          />
          <Button
            size="xs"
            variant="outline"
            color="success"
            onClick={() => handleMarkFound(row.id)}
            disabled={loadingId === row.id}
          >
            {loadingId === row.id ? '...' : '✓ Encontrado'}
          </Button>
        </div>
      )}
    />
  )
}

export default TabStagePerdidos
