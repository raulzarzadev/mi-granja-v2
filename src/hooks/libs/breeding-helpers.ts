import { BreedingRecord } from '@/types'

export const getNextBirth = (breedingRecord: BreedingRecord) => {
  const upcomingBirths = getBreedingUpcomingBirths(breedingRecord)
  return upcomingBirths.length > 0 ? upcomingBirths[0] : null
}

export const getBreedingUpcomingBirths = (breedingRecord: BreedingRecord) => {
  const now = new Date()
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  return (
    breedingRecord.femaleBreedingInfo
      ?.filter((info) => {
        if (!info.expectedBirthDate || info.actualBirthDate) return false
        const expected = new Date(info.expectedBirthDate)
        return expected >= now && expected <= nextWeek
      })
      .sort((a, b) => {
        const dateA = new Date(a.expectedBirthDate!)
        const dateB = new Date(b.expectedBirthDate!)
        return dateA.getTime() - dateB.getTime()
      }) || []
  )
}
