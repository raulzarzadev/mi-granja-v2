import type { ColumnDef } from '@/components/DataTable'
import type { Animal } from '@/types/animals'
import { animal_stage_config } from '@/types/animals'
import SimpleStageTab from '../stages/SimpleStageTab'

interface Props {
  animals: Animal[]
  columns: ColumnDef<Animal>[]
}

const TabStageEngorda: React.FC<Props> = ({ animals, columns }) => (
  <SimpleStageTab
    title={`${animal_stage_config.engorda.icon} Engorda`}
    data={animals}
    columns={columns}
    sessionStorageKey="mg_last_engorda_id"
    emptyMessage="No hay animales en engorda."
  />
)

export default TabStageEngorda
