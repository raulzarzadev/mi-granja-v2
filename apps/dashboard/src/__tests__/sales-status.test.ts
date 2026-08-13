import { isSaleComplete, sale_statuses } from '@/types/sales'

describe('estado completado de ventas', () => {
  it('está disponible entre los estados de una venta', () => {
    expect(sale_statuses).toContain('completed')
  })

  it('requiere fecha, precio y peso para todos los animales', () => {
    const completeSale = {
      date: new Date('2026-08-13T12:00:00.000Z'),
      pricePerKg: 8_000,
      animals: [
        { animalId: 'animal-1', animalNumber: '001', weight: 42_000 },
        { animalId: 'animal-2', animalNumber: '002', weight: 39_500 },
      ],
    }

    expect(isSaleComplete(completeSale)).toBe(true)
    expect(isSaleComplete({ ...completeSale, date: undefined })).toBe(false)
    expect(isSaleComplete({ ...completeSale, pricePerKg: undefined })).toBe(false)
    expect(
      isSaleComplete({
        ...completeSale,
        animals: [...completeSale.animals, { animalId: 'animal-3', animalNumber: '003' }],
      }),
    ).toBe(false)
  })
})
