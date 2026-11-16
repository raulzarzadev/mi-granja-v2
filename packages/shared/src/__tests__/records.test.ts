import {
  buildRecordFromForm,
  cleanMedications,
  getRecordCategories,
  getTodayLocalDateString,
  isClinicalRecord,
} from '../lib/records'
import { RecordFormState } from '../types/records'

describe('records', () => {
  describe('buildRecordFromForm', () => {
    const baseForm: RecordFormState = {
      type: 'note',
      category: 'general',
      title: '  Nota de prueba  ',
      description: '',
      date: '2025-06-15',
      severity: '',
      isResolved: false,
      resolvedDate: '',
      treatment: '',
      nextDueDate: '',
      batch: '',
      veterinarian: '',
      cost: '',
    }

    it('should build a note record with trimmed title', () => {
      const result = buildRecordFromForm(baseForm)
      expect(result.type).toBe('note')
      expect(result.category).toBe('general')
      expect(result.title).toBe('Nota de prueba')
      expect(result.date).toBeInstanceOf(Date)
      expect(result.date.getFullYear()).toBe(2025)
      expect(result.date.getMonth()).toBe(5) // June
      expect(result.date.getDate()).toBe(15)
    })

    it('stores every selected category and uses the first as primary', () => {
      const result = buildRecordFromForm({
        ...baseForm,
        type: 'health',
        category: 'vaccine',
        categories: ['vaccine', 'deworming'],
      })
      expect(result.category).toBe('vaccine')
      expect(result.categories).toEqual(['vaccine', 'deworming'])
    })

    it('keeps clinical fields when any selected category is clinical', () => {
      const result = buildRecordFromForm({
        ...baseForm,
        type: 'health',
        category: 'vaccine',
        categories: ['vaccine', 'illness'],
        severity: 'low',
        treatment: 'Reposo',
      })
      expect(result.severity).toBe('low')
      expect(result.treatment).toBe('Reposo')
    })

    it('writes a single-category array so edits replace previous selections', () => {
      expect(buildRecordFromForm(baseForm).categories).toEqual(['general'])
    })

    it('reads categories from legacy and multi-category records', () => {
      expect(getRecordCategories({ category: 'vaccine' })).toEqual(['vaccine'])
      expect(
        getRecordCategories({ category: 'vaccine', categories: ['vaccine', 'injury'] }),
      ).toEqual(['vaccine', 'injury'])
      expect(
        isClinicalRecord({
          type: 'health',
          category: 'vaccine',
          categories: ['vaccine', 'injury'],
        }),
      ).toBe(true)
      expect(isClinicalRecord({ type: 'note', category: 'illness' })).toBe(false)
    })

    it('stores medications with batch and drops empty rows', () => {
      const result = buildRecordFromForm({
        ...baseForm,
        type: 'health',
        category: 'vaccine',
        medications: [
          { name: ' Ivermectina ', batch: ' L-1 ' },
          { name: '', batch: 'L-2' },
          { name: 'Triple', batch: '' },
        ],
      })
      expect(result.medications).toEqual([
        { name: 'Ivermectina', batch: 'L-1' },
        { name: 'Triple' },
      ])
    })

    it('does not add medications to notes', () => {
      expect(buildRecordFromForm(baseForm).medications).toBeUndefined()
      expect(cleanMedications()).toEqual([])
    })

    it('should include description if not empty', () => {
      const form = { ...baseForm, description: '  Descripción importante  ' }
      const result = buildRecordFromForm(form)
      expect(result.description).toBe('Descripción importante')
    })

    it('should not include empty description', () => {
      const result = buildRecordFromForm(baseForm)
      expect(result.description).toBeUndefined()
    })

    it('should include health fields for health records', () => {
      const healthForm: RecordFormState = {
        ...baseForm,
        type: 'health',
        category: 'illness',
        severity: 'high',
        isResolved: true,
        resolvedDate: '2025-07-01',
        treatment: 'Antibióticos',
        nextDueDate: '2025-08-01',
        batch: 'LOTE-001',
        veterinarian: 'Dr. García',
        cost: '250.50',
      }
      const result = buildRecordFromForm(healthForm)
      expect(result.type).toBe('health')
      expect(result.severity).toBe('high')
      expect(result.isResolved).toBe(true)
      expect(result.resolvedDate).toBeInstanceOf(Date)
      expect(result.treatment).toBe('Antibióticos')
      expect(result.nextDueDate).toBeInstanceOf(Date)
      expect(result.batch).toBe('LOTE-001')
      expect(result.veterinarian).toBe('Dr. García')
      expect(result.cost).toBe(250.5)
    })

    it('should not include clinical fields for non-clinical health categories', () => {
      const vaccineForm: RecordFormState = {
        ...baseForm,
        type: 'health',
        category: 'vaccine',
        severity: 'high',
        treatment: 'Should be ignored',
      }
      const result = buildRecordFromForm(vaccineForm)
      // severity and treatment are clinical fields, not included for 'vaccine'
      expect(result.severity).toBeUndefined()
      expect(result.treatment).toBeUndefined()
    })
  })

  describe('getTodayLocalDateString', () => {
    it('should return yyyy-MM-dd format', () => {
      const result = getTodayLocalDateString()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should match today', () => {
      const result = getTodayLocalDateString()
      const today = new Date()
      const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      expect(result).toBe(expected)
    })
  })
})
