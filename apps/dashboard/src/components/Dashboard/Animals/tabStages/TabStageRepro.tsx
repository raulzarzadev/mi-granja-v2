import type { ColumnDef } from '@/components/DataTable'
import type { Animal } from '@/types/animals'
import { animal_stage_config } from '@/types/animals'
import SimpleStageTab from '../stages/SimpleStageTab'

interface Props {
  animals: Animal[]
  columns: ColumnDef<Animal>[]
}

const TabStageRepro: React.FC<Props> = ({ animals, columns }) => (
  <SimpleStageTab
    title={`${animal_stage_config.reproductor.icon} Reproducción`}
    data={animals}
    columns={columns}
    sessionStorageKey="mg_last_reproductor_id"
    emptyMessage="No hay animales en reproducción."
  />
)

export default TabStageRepro
