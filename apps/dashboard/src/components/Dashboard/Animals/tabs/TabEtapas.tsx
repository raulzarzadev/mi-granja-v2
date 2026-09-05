import Tabs from '@/components/Tabs'

interface EtapaTab {
  label: string
  badgeCount?: number
  content: React.ReactNode
}

interface Props {
  etapasTabs: EtapaTab[]
}

const TabEtapas: React.FC<Props> = ({ etapasTabs }) => (
  <div className="mt-2 space-y-3">
    <Tabs tabs={etapasTabs} tabsId="animals-etapas" />
  </div>
)

export default TabEtapas
