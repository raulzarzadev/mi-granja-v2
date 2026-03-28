'use client'

import { Controller, FieldPath, FieldValues, useFormContext } from 'react-hook-form'
import {
  AnimalType,
  animal_stage_descriptions,
  animal_stage_icons,
  animals_stages,
  animals_stages_labels,
} from '@/types/animals'

interface StageSelectorProps<TFieldValues extends FieldValues> {
  name: FieldPath<TFieldValues>
  animalType?: AnimalType
  disabled?: boolean
}

const stageStyles: Record<string, { selected: string; hint: string }> = {
  cria: {
    selected: 'border-blue-400 bg-blue-50 text-blue-900',
    hint: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  juvenil: {
    selected: 'border-cyan-400 bg-cyan-50 text-cyan-900',
    hint: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  engorda: {
    selected: 'border-orange-400 bg-orange-50 text-orange-900',
    hint: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  pie_cria: {
    selected: 'border-purple-400 bg-purple-50 text-purple-900',
    hint: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  reproductor: {
    selected: 'border-green-400 bg-green-50 text-green-900',
    hint: 'bg-green-50 text-green-700 border-green-200',
  },
  descarte: {
    selected: 'border-red-400 bg-red-50 text-red-900',
    hint: 'bg-red-50 text-red-700 border-red-200',
  },
}

export function StageSelector<TFieldValues extends FieldValues>({
  name,
  animalType,
  disabled,
}: StageSelectorProps<TFieldValues>) {
  const { control, formState } = useFormContext<TFieldValues>()

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Etapa *</label>
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => {
          const selectedStage = field.value as string
          const desc =
            animal_stage_descriptions[selectedStage as keyof typeof animal_stage_descriptions]
          const speciesHint = animalType && desc?.speciesInfo?.[animalType]

          return (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-1.5">
                {animals_stages.map((stage) => {
                  const isSelected = selectedStage === stage
                  const style = stageStyles[stage]

                  return (
                    <button
                      key={stage}
                      type="button"
                      disabled={disabled || formState.isSubmitting}
                      onClick={() => field.onChange(stage as any)}
                      className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                        isSelected
                          ? `${style.selected} shadow-sm`
                          : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className="text-sm leading-none">{animal_stage_icons[stage]}</span>
                      <span>{animals_stages_labels[stage]}</span>
                    </button>
                  )
                })}
              </div>

              {desc && (
                <div
                  className={`rounded-lg border px-3 py-2 text-xs leading-relaxed space-y-0.5 ${
                    stageStyles[selectedStage]?.hint || 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}
                >
                  <p className="font-medium">{desc.description}</p>
                  {speciesHint && <p className="opacity-75">{speciesHint}</p>}
                </div>
              )}

              {fieldState.error?.message && (
                <p className="text-xs text-red-600">{String(fieldState.error.message)}</p>
              )}
            </div>
          )
        }}
      />
    </div>
  )
}
