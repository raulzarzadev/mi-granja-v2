'use client'

import { useParams, useRouter } from 'next/navigation'
import BreedingForm from '@/components/BreedingForm'
import PageShell from '@/components/PageShell'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import { BreedingRecord } from '@/types/breedings'

export default function EditarEmpadrePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { animals } = useAnimalCRUD()
  const { breedingRecords, updateBreedingRecord, deleteBreedingRecord, isSubmitting } =
    useBreedingCRUD()

  const record = breedingRecords.find((r) => r.id === params.id)

  const handleSubmit = async (
    data: Omit<BreedingRecord, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>,
  ) => {
    if (!record) return
    await updateBreedingRecord(record.id, data)
    router.back()
  }

  const handleDelete = async () => {
    if (!record) return
    if (
      !window.confirm('¿Estas seguro de eliminar este empadre? Esta accion no se puede deshacer.')
    )
      return
    await deleteBreedingRecord(record.id)
    router.back()
  }

  if (!record) {
    return (
      <PageShell title="Editar Empadre">
        <div className="text-center py-8 text-gray-500">
          <p>No se encontro el registro de empadre.</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 text-green-600 hover:text-green-800 font-medium"
          >
            Volver
          </button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Editar Empadre">
      <BreedingForm
        animals={animals}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isLoading={isSubmitting}
        initialData={record}
      />
      <div className="mt-4 pt-4 border-t">
        <button
          type="button"
          onClick={handleDelete}
          className="w-full px-4 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
        >
          Eliminar empadre
        </button>
      </div>
    </PageShell>
  )
}
