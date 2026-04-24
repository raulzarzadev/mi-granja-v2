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
    {crossTabDuplicatesCount > 0 && (
      <div className="p-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-center justify-between gap-2">
        <span>
          ⚠️ {crossTabDuplicatesCount} animal
          {crossTabDuplicatesCount !== 1 ? 'es' : ''} contado
          {crossTabDuplicatesCount !== 1 ? 's' : ''} en más de una etapa.
        </span>
        <button
          type="button"
          onClick={onShowDuplicates}
          className="px-2 py-1 rounded bg-white border border-amber-300 hover:bg-amber-100 cursor-pointer font-medium"
        >
          Ver duplicados
        </button>
      </div>
    )}
    <Tabs tabs={etapasTabs} tabsId="animals-etapas" />
  </div>
)

export default TabEtapas
