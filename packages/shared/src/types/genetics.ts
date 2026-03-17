// Métricas genéticas por semental
export interface GeneticScore {
  sireId: string
  offspringCount: number
  avgOffspringWeight: number // gramos
  survivalRate: number // 0-1
  damsCount: number
}

// Rendimiento real por animal: peso actual vs esperado por edad/especie
export interface RealScore {
  animalId: string
  currentWeight: number // gramos
  expectedWeight: number // gramos
  ratio: number // currentWeight / expectedWeight (>1 = por encima, <1 = por debajo)
  ageMonths: number
}
