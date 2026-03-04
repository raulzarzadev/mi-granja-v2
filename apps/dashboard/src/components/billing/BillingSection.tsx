'use client'

import React from 'react'
import { useBilling } from '@/hooks/useBilling'
import { formatMXN } from '@/types/billing'

/**
 * Sección de facturación que muestra el plan actual, uso, facturas
 * y botón para abrir el portal de Stripe.
 */
const BillingSection: React.FC = () => {
  const {
    subscription,
    usage,
    invoices,
    planType,
    status,
    isLoading,
    openCustomerPortal,
    requestUpgrade,
  } = useBilling()

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="h-32 bg-gray-200 rounded-lg" />
      </div>
    )
  }

  const isFreePlan = planType === 'free'

  return (
    <div className="space-y-6">
      {/* Plan actual */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Plan Actual</h3>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isFreePlan
                ? 'bg-gray-100 text-gray-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {isFreePlan ? 'Gratuito' : 'Pro'}
          </span>
        </div>

        {isFreePlan ? (
          <div>
            <p className="text-gray-600 mb-4">
              Estas en el plan gratuito. Incluye 1 granja y funcionalidades completas.
            </p>
            <button
              onClick={() => requestUpgrade('manual')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Mejorar a Pro
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Estado</span>
              <span className={`font-medium ${
                status === 'active' ? 'text-green-600' :
                status === 'past_due' ? 'text-yellow-600' :
                status === 'suspended' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {status === 'active' && 'Activo'}
                {status === 'past_due' && 'Pago pendiente'}
                {status === 'suspended' && 'Suspendido'}
                {status === 'canceled' && 'Cancelado'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Periodo</span>
              <span className="font-medium text-gray-900">
                {subscription?.interval === 'year' ? 'Anual' : 'Mensual'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Monto mensual</span>
              <span className="font-medium text-gray-900">
                {subscription ? formatMXN(subscription.monthlyAmount) : '-'}
              </span>
            </div>
            {subscription?.cancelAtPeriodEnd && (
              <p className="text-sm text-yellow-600 bg-yellow-50 px-3 py-2 rounded">
                Se cancelara al final del periodo actual.
              </p>
            )}
            <button
              onClick={openCustomerPortal}
              className="mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors text-sm"
            >
              Administrar suscripcion (Stripe)
            </button>
          </div>
        )}
      </div>

      {/* Uso actual */}
      {usage && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Uso Actual</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-green-700">{usage.farmCount}</p>
              <p className="text-sm text-gray-600 mt-1">
                {usage.farmCount === 1 ? 'Granja' : 'Granjas'}
              </p>
              {usage.limits.maxFarms !== Infinity && (
                <p className="text-xs text-gray-400 mt-1">
                  de {usage.limits.maxFarms} incluidas
                </p>
              )}
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-700">{usage.collaboratorCount}</p>
              <p className="text-sm text-gray-600 mt-1">
                {usage.collaboratorCount === 1 ? 'Colaborador' : 'Colaboradores'}
              </p>
              {usage.limits.maxCollaboratorsPerFarm !== Infinity && isFreePlan && (
                <p className="text-xs text-gray-400 mt-1">
                  Plan Pro para agregar
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Facturas recientes */}
      {invoices.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Facturas Recientes</h3>
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {invoice.description || 'Factura'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(invoice.createdAt as string).toLocaleDateString('es-MX')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">
                    {formatMXN(invoice.amount)}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      invoice.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : invoice.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {invoice.status === 'paid' && 'Pagada'}
                    {invoice.status === 'pending' && 'Pendiente'}
                    {invoice.status === 'failed' && 'Fallida'}
                    {invoice.status === 'refunded' && 'Reembolsada'}
                  </span>
                  {invoice.invoiceUrl && (
                    <a
                      href={invoice.invoiceUrl as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Ver
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default BillingSection
