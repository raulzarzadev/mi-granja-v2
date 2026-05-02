import type { ColumnDef } from '@/components/DataTable'
import type { Animal } from '@/types/animals'
import { animal_stage_config } from '@/types/animals'
import SimpleStageTab from '../stages/SimpleStageTab'

interface Props {
  animals: Animal[]
  columns: ColumnDef<Animal>[]
  onChangeStage?: (animals: Animal[]) => void
}

const TabStageDescarte: React.FC<Props> = ({ animals, columns, onChangeStage }) => (
  <SimpleStageTab
    title={`${animal_stage_config.descarte.icon} Descarte`}
    data={animals}
    columns={columns}
    sessionStorageKey="mg_last_descarte_id"
    emptyMessage="No hay animales en descarte."
    onChangeStage={onChangeStage}
  />
)

export default TabStageDescarte
