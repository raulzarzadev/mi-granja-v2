import { BreedingRecord } from '@/types/breedings'

export const BreedingBirths = ({ breedingRecord }: { breedingRecord: BreedingRecord }) => {
  const nextBirthInfo = getNextBreedingBirth({ breeding: breedingRecord })
  console.log({ nextBirthInfo })
  return null
  // return (
  //   <>
  //     <div className="bg-green-50 border border-green-200 rounded-md p-4">
  //       <h4 className="text-sm font-medium text-green-900 mb-2">
  //         🗓️ Parto Más Próximo
  //       </h4>
  //       <div className="space-y-2">
  //         <div className="text-sm text-green-800">
  //           <div className="font-medium">
  //             {nextBirthInfo?.date && (
  //               <span>
  //                 Fecha esperada: {formatDate(nextBirthInfo.date, 'dd/MM/yyyy')}
  //               </span>
  //             )}
  //           </div>
  //           {nextBirthInfo.daysUntil && (
  //             <div className="text-green-600 mt-1">
  //               {nextBirthInfo?.daysUntil > 0
  //                 ? `Faltan ${nextBirthInfo.daysUntil} días`
  //                 : nextBirthInfo.daysUntil === 0
  //                 ? 'Es hoy!'
  //                 : `Venció hace ${Math.abs(nextBirthInfo?.daysUntil)} días`}
  //             </div>
  //           )}

  //           <div className="text-xs text-green-600 mt-1">
  //             {nextBirthInfo.animalNumber &&
  //             nextBirthInfo.animalNumber !== 'Estimado'
  //               ? `Hembra: ${nextBirthInfo.animalNumber} (${nextBirthInfo.animalType})`
  //               : `Basado en embarazos confirmados de ${nextBirthInfo.animalType}`}
  //           </div>
  //           {nextBirthInfo.hasMultiplePregnancies && (
  //             <div className="text-xs text-blue-600 mt-1">
  //               {nextBirthInfo.totalConfirmedPregnancies} embarazos confirmados
  //             </div>
  //           )}
  //         </div>
  //       </div>
  //     </div>
  //   </>
  // )
}

export const getNextBreedingBirth = ({ breeding }: { breeding: BreedingRecord }) => {
  if (!breeding || !breeding.breedingDate) return null

  const breedingDate = new Date(breeding.breedingDate)
  const females = breeding.femaleBreedingInfo || []

  if (!breedingDate) return null
  if (females.length === 0) return null

  // solo regresa si hay un ´embarazo confirmado pero no tiene parto
  const pendingBirths = females.filter(
    (female) => !female.actualBirthDate && female.pregnancyConfirmedDate,
  )

  if (pendingBirths.length === 0) return null

  // const pendingBirthsWithExpectedDates = pendingBirths.map((female) => {
  //   const expectedBirthDate = female.expectedBirthDate
  //     ? toDate(female.expectedBirthDate)
  //     : null
  //   if (!expectedBirthDate) return null
  //   const daysUntil = Math.ceil(
  //     (expectedBirthDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  //   )
  //   return {
  //     ...female,
  //     expectedBirthDate,
  //     daysUntil
  //   }
  // })

  // return {
  //   date: expectedBirthDate,
  //   daysUntil,
  //   animalNumber: breeding.maleId || 'Estimado',
  //   animalType: breeding.maleId ? 'Machos' : 'Hembras',
  //   hasMultiplePregnancies: breeding.pregnancyCount > 1,
  //   totalConfirmedPregnancies: breeding.pregnancyCount || 0
  // }
}
