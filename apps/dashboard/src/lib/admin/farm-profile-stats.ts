import type {
  FarmActivityType,
  FarmAnimalSpecies,
  FarmCropType,
  FarmOtherActivity,
  FarmProductionProfile,
  FarmProductionPurpose,
} from '@/types/farm'

export const FARM_ACTIVITY_LABELS: Record<FarmActivityType, string> = {
  livestock: 'Ganadería',
  crops: 'Cultivos',
  mixed: 'Mixta',
  other: 'Otro giro',
}

export const FARM_PURPOSE_LABELS: Record<FarmProductionPurpose, string> = {
  breeding: 'Reproducción',
  meat: 'Carne / engorda',
  milk: 'Leche',
  eggs: 'Huevos',
  fiber: 'Lana / fibra',
  other: 'Otro',
}

export const FARM_SPECIES_LABELS: Record<FarmAnimalSpecies, string> = {
  vaca: 'Bovinos',
  oveja: 'Ovinos',
  cabra: 'Caprinos',
  cerdo: 'Porcinos',
  gallina: 'Aves',
  equino: 'Equinos',
  otro: 'Otros',
}

export const FARM_CROP_LABELS: Record<FarmCropType, string> = {
  grains: 'Granos / cereales',
  vegetables: 'Hortalizas',
  fruit: 'Frutas',
  forage: 'Forrajes / pasturas',
  other: 'Otros cultivos',
}

export const FARM_OTHER_ACTIVITY_LABELS: Record<FarmOtherActivity, string> = {
  beekeeping: 'Apicultura',
  aquaculture: 'Acuicultura',
  veterinary: 'Servicios veterinarios',
  agrotourism: 'Agroturismo',
  other: 'Otro',
}

export interface FarmWithProfile {
  id: string
  ownerId?: string
  location?: { country?: string }
  productionProfile?: FarmProductionProfile
  deletedAt?: unknown
}

export interface ProfileBreakdownItem {
  key: string
  label: string
  count: number
}

export interface FarmProfileStats {
  totalFarms: number
  profiledFarms: number
  missingProfiles: number
  coveragePercent: number
  activities: ProfileBreakdownItem[]
  purposes: ProfileBreakdownItem[]
  species: ProfileBreakdownItem[]
  crops: ProfileBreakdownItem[]
  countries: ProfileBreakdownItem[]
}

function increment(map: Map<string, number>, key?: string) {
  if (!key) return
  map.set(key, (map.get(key) || 0) + 1)
}

function breakdown(map: Map<string, number>, labels?: Record<string, string>) {
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, label: labels?.[key] || key, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'))
}

export function computeFarmProfileStats(farms: FarmWithProfile[]): FarmProfileStats {
  const activeFarms = farms.filter((farm) => !farm.deletedAt)
  const activities = new Map<string, number>()
  const purposes = new Map<string, number>()
  const species = new Map<string, number>()
  const crops = new Map<string, number>()
  const countries = new Map<string, number>()
  let profiledFarms = 0

  for (const farm of activeFarms) {
    const profile = farm.productionProfile
    if (!profile?.activityType) continue
    profiledFarms += 1
    increment(activities, profile.activityType)
    increment(countries, farm.location?.country || 'Sin país')
    for (const purpose of profile.productionPurposes || []) increment(purposes, purpose)
    for (const animalSpecies of profile.animalSpecies || []) increment(species, animalSpecies)
    for (const cropType of profile.cropTypes || []) increment(crops, cropType)
  }

  return {
    totalFarms: activeFarms.length,
    profiledFarms,
    missingProfiles: activeFarms.length - profiledFarms,
    coveragePercent: activeFarms.length
      ? Math.round((profiledFarms / activeFarms.length) * 100)
      : 0,
    activities: breakdown(activities, FARM_ACTIVITY_LABELS),
    purposes: breakdown(purposes, FARM_PURPOSE_LABELS),
    species: breakdown(species, FARM_SPECIES_LABELS),
    crops: breakdown(crops, FARM_CROP_LABELS),
    countries: breakdown(countries),
  }
}

export function formatFarmProfile(profile?: FarmProductionProfile): string {
  if (!profile?.activityType) return 'Sin perfil'
  const parts = [FARM_ACTIVITY_LABELS[profile.activityType]]
  if (profile.productionPurposes?.length) {
    parts.push(profile.productionPurposes.map((item) => FARM_PURPOSE_LABELS[item]).join(', '))
  }
  if (profile.cropTypes?.length) {
    parts.push(profile.cropTypes.map((item) => FARM_CROP_LABELS[item]).join(', '))
  }
  if (profile.otherActivity) parts.push(FARM_OTHER_ACTIVITY_LABELS[profile.otherActivity])
  return parts.join(' · ')
}
