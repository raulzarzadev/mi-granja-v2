import type { ColumnDef } from '@/components/DataTable'
import type { Animal } from '@/types/animals'
import { animal_stage_config } from '@/types/animals'
import SimpleStageTab from '../stages/SimpleStageTab'

interface Props {
  animals: Animal[]
  columns: ColumnDef<Animal>[]
  onChangeStage?: (animals: Animal[]) => void
}

const TabStageJuvenil: React.FC<Props> = ({ animals, columns, onChangeStage }) => (
  <SimpleStageTab
    title={`${animal_stage_config.juvenil.icon} Juvenil`}
    data={animals}
    columns={columns}
    sessionStorageKey="mg_last_juvenil_id"
    emptyMessage="No hay animales juveniles."
    onChangeStage={onChangeStage}
  />
)

export default TabStageJuvenil
