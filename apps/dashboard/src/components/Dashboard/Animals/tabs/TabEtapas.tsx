import Tabs from '@/components/Tabs'

interface EtapaTab {
  label: string
  badgeCount?: number
  content: React.ReactNode
}

interface Props {
  crossTabDuplicatesCount: number
  onShowDuplicates: () => void
  etapasTabs: EtapaTab[]
}

const TabEtapas: React.FC<Props> = ({ crossTabDuplicatesCount, onShowDuplicates, etapasTabs }) => (
  <div className="mt-2 space-y-3">
    <div className="grid gap-2 rounded-xl border border-gray-200 bg-white p-3 text-xs sm:grid-cols-2">
      <p className="text-gray-700">
        <strong className="text-gray-900">Desarrollo:</strong> Cría → Juvenil → Engorda o
        Reproductor. Juvenil se calcula automáticamente por edad.
      </p>
      <p className="text-gray-700">
        <strong className="text-gray-900">Condiciones:</strong> Empadre, Embarazo y Madre/Lechera
        pueden cambiar o coexistir durante el ciclo.
      </p>
    </div>
    {crossTabDuplicatesCount > 0 && (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-900">
        <span>
          ℹ️ {crossTabDuplicatesCount} animal{crossTabDuplicatesCount !== 1 ? 'es' : ''} aparece
          {crossTabDuplicatesCount === 1 ? '' : 'n'} en más de una condición compatible.
        </span>
        <button
          type="button"
          onClick={onShowDuplicates}
          className="min-h-11 shrink-0 cursor-pointer rounded-lg border border-blue-300 bg-white px-3 py-2 font-medium hover:bg-blue-100"
        >
          Ver condiciones
        </button>
      </div>
    )}
    <Tabs tabs={etapasTabs} tabsId="animals-etapas" />
  </div>
)

export default TabEtapas
