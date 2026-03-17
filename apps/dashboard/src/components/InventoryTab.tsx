'use client'

import React, { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import {
  ExpenseCategory,
  expense_categories,
  expense_category_colors,
  expense_category_icons,
  expense_category_labels,
} from '@/types/animals'

const formatPrice = (centavos: number) =>
  `$${(centavos / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

const formatDate = (date?: Date | string) => {
  if (!date) return '—'
  const d = new Date(date)
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

const InventoryTab: React.FC = () => {
  const animals = useSelector((state: RootState) => state.animals.animals)
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | ''>('')

  // Extraer todos los registros de tipo expense de todos los animales
  const allExpenses = useMemo(() => {
    const expenses: {
      animalId: string
      animalNumber: string
      animalName?: string
      title: string
      date: Date | string
      cost: number
      expenseCategory: ExpenseCategory
      supplier?: string
      description?: string
    }[] = []

    for (const animal of animals) {
      if (!animal.records) continue
      for (const record of animal.records) {
        if (record.type === 'expense') {
          expenses.push({
            animalId: animal.id,
            animalNumber: animal.animalNumber,
            animalName: animal.name,
            title: record.title,
            date: record.date,
            cost: record.cost || 0,
            expenseCategory: (record as any).expenseCategory || 'other_expense',
            supplier: (record as any).supplier,
            description: record.description,
          })
        }
      }
    }

    return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [animals])

  // Agrupar por categoría
  const byCategory = useMemo(() => {
    const map = new Map<ExpenseCategory, { total: number; count: number }>()
    for (const cat of expense_categories) {
      map.set(cat, { total: 0, count: 0 })
    }
    for (const exp of allExpenses) {
      const entry = map.get(exp.expenseCategory) || { total: 0, count: 0 }
      entry.total += exp.cost
      entry.count++
      map.set(exp.expenseCategory, entry)
    }
    return map
  }, [allExpenses])

  // Totales del mes actual vs anterior
  const periodTotals = useMemo(() => {
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1
    const prevYear = thisMonth === 0 ? thisYear - 1 : thisYear

    let currentTotal = 0
    let previousTotal = 0
    for (const exp of allExpenses) {
      const d = new Date(exp.date)
      if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
        currentTotal += exp.cost
      } else if (d.getMonth() === prevMonth && d.getFullYear() === prevYear) {
        previousTotal += exp.cost
      }
    }
    return { currentTotal, previousTotal }
  }, [allExpenses])

  const grandTotal = useMemo(() => allExpenses.reduce((sum, e) => sum + e.cost, 0), [allExpenses])

  const maxCategoryTotal = useMemo(() => {
    let max = 0
    for (const [, v] of byCategory) {
      if (v.total > max) max = v.total
    }
    return max
  }, [byCategory])

  const filteredExpenses = categoryFilter
    ? allExpenses.filter((e) => e.expenseCategory === categoryFilter)
    : allExpenses

  const diff = periodTotals.currentTotal - periodTotals.previousTotal
  const diffSign = diff > 0 ? '+' : ''

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Gastos</h2>
      </div>

      {allExpenses.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-5xl mb-4 block">📦</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay gastos registrados</h3>
          <p className="text-gray-600">
            Registra gastos desde la ficha de un animal usando el tipo &quot;Gasto&quot;
          </p>
        </div>
      ) : (
        <>
          {/* Resumen por periodo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500 mb-1">Total acumulado</p>
              <p className="text-xl font-bold text-gray-900">{formatPrice(grandTotal)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500 mb-1">Mes actual</p>
              <p className="text-xl font-bold text-gray-900">
                {formatPrice(periodTotals.currentTotal)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500 mb-1">Mes anterior</p>
              <p className="text-xl font-bold text-gray-900">
                {formatPrice(periodTotals.previousTotal)}
              </p>
              {periodTotals.previousTotal > 0 && (
                <p
                  className={`text-xs mt-1 ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : 'text-gray-500'}`}
                >
                  {diffSign}
                  {formatPrice(Math.abs(diff))} vs mes actual
                </p>
              )}
            </div>
          </div>

          {/* Barras por categoría */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Gastos por categoría</h3>
            <div className="space-y-2">
              {expense_categories.map((cat) => {
                const data = byCategory.get(cat)!
                if (data.count === 0) return null
                const pct = maxCategoryTotal > 0 ? (data.total / maxCategoryTotal) * 100 : 0
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
                    className={`w-full text-left rounded-lg p-2 transition-colors ${
                      categoryFilter === cat
                        ? 'bg-gray-100 ring-1 ring-gray-300'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${expense_category_colors[cat]}`}
                        >
                          {expense_category_icons[cat]} {expense_category_labels[cat]}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">({data.count})</span>
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatPrice(data.total)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Lista de gastos */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">
                Gastos recientes
                {categoryFilter && (
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('')}
                    className="ml-2 text-xs text-gray-400 hover:text-gray-600"
                  >
                    (limpiar filtro)
                  </button>
                )}
              </h3>
              <span className="text-xs text-gray-400">{filteredExpenses.length} registros</span>
            </div>
            <div className="divide-y divide-gray-100">
              {filteredExpenses.slice(0, 50).map((exp, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${expense_category_colors[exp.expenseCategory]}`}
                      >
                        {expense_category_icons[exp.expenseCategory]}{' '}
                        {expense_category_labels[exp.expenseCategory]}
                      </span>
                      <span className="text-xs text-gray-400">
                        #{exp.animalNumber}
                        {exp.animalName ? ` ${exp.animalName}` : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 truncate">{exp.title}</p>
                    {exp.supplier && (
                      <p className="text-xs text-gray-500">Proveedor: {exp.supplier}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {exp.cost > 0 ? formatPrice(exp.cost) : '—'}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(exp.date)}</p>
                  </div>
                </div>
              ))}
              {filteredExpenses.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  No hay gastos en esta categoría
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default InventoryTab
