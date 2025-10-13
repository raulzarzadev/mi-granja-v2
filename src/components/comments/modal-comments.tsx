'use client'

import React from 'react'
import { z } from 'zod'

import { Modal } from '../Modal'
import Button from '../buttons/Button'
import { Icon } from '../Icon/icon'
import { Form } from '../forms/Form'
import { useZodForm } from '@/hooks/useZodForm'
import { TextField } from '../forms/TextField'
import { SelectField } from '../forms/SelectField'
import { fromNow, formatDate, toDate } from '@/lib/dates'
import { urgencyColor, Urgency } from '@/lib/animal-utils'
import { Comment, NewCommentInput } from '@/types/comment'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useAuth } from '@/hooks/useAuth'

const urgencyLabels: Record<Urgency, string> = {
  none: 'Sin prioridad',
  low: 'Baja',
  medium: 'Media',
  high: 'Alta'
}

const urgencyValues = [
  'none',
  'low',
  'medium',
  'high'
] as const satisfies readonly Urgency[]

const newCommentSchema = z.object({
  content: z.string().trim().min(1, 'Agrega un comentario antes de guardar.'),
  urgency: z.enum(urgencyValues).default('none')
})

type NewCommentFormValues = z.infer<typeof newCommentSchema>

const sortByRecency = (list: Comment[]) =>
  [...list].sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt))

const getTime = (date?: Date) => {
  if (!date) return 0
  try {
    return toDate(date).getTime()
  } catch (error) {
    console.warn('Fecha de comentario inválida', error)
    return 0
  }
}

const isUrgent = (urgency?: Urgency) =>
  urgency === 'medium' || urgency === 'high'

interface CommentsProps {
  comments?: Comment[]
  onAddComment?: (
    input: NewCommentInput
  ) => Promise<Comment | void> | Comment | void
  title?: string
  emptyStateText?: string
}

export const Comments: React.FC<CommentsProps> = ({
  comments,
  onAddComment,
  title = 'Comentarios',
  emptyStateText = 'Todavía no hay comentarios. Agrega el primero para dejar registro.'
}) => {
  const { user } = useAuth()
  const { currentFarm } = useFarmCRUD()
  const collaborators = currentFarm?.collaborators || []
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [localComments, setLocalComments] = React.useState<Comment[]>(() =>
    sortByRecency(comments ?? [])
  )
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setLocalComments(sortByRecency(comments ?? []))
  }, [comments])

  const form = useZodForm({
    schema: newCommentSchema,
    defaultValues: {
      content: '',
      urgency: 'none'
    }
  })

  const { formState, reset } = form

  const commentCount = localComments.length
  const urgentCount = localComments.filter((comment) =>
    isUrgent(comment.urgency)
  ).length

  const urgencyOptions = React.useMemo(
    () =>
      urgencyValues.map((value) => ({
        value,
        label: urgencyLabels[value]
      })),
    []
  )

  const closeModal = () => {
    setIsModalOpen(false)
    setSubmitError(null)
  }

  const handleSubmit = async (values: NewCommentFormValues) => {
    const payload: NewCommentInput = {
      content: values.content.trim(),
      urgency: values.urgency || 'none'
    }

    try {
      setSubmitError(null)
      const result = await onAddComment?.(payload)
      const fallback: Comment = {
        id: `temp-${Date.now()}`,
        content: payload.content,
        urgency: payload.urgency,
        createdAt: new Date()
      }
      const newComment = result ?? fallback

      setLocalComments((prev) => sortByRecency([...prev, newComment]))
      reset({ content: '', urgency: 'none' })
    } catch (error) {
      console.error('No se pudo agregar el comentario', error)
      setSubmitError('No se pudo agregar el comentario. Intenta de nuevo.')
    }
  }

  const collaboratorDetails = (id: string) => {
    return [...collaborators, user].find((collab) => collab?.id === id)
  }

  return (
    <>
      <div className="">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-gray-800">
            {urgentCount > 0 ? (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                {urgentCount} urgente{urgentCount !== 1 ? 's' : ''}
              </span>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            color="primary"
            onClick={() => setIsModalOpen(true)}
            icon="comments"
          >
            Ver ({commentCount})
          </Button>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={title} size="lg">
        <div className="space-y-6">
          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">
                Historial de comentarios
              </h3>
              {urgentCount > 0 ? (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  {urgentCount} urgente{urgentCount !== 1 ? 's' : ''}
                </span>
              ) : null}
            </header>

            {localComments.length > 0 ? (
              <ul className="space-y-3">
                {localComments.map((comment) => {
                  const createdAt = comment.createdAt
                    ? formatDate(toDate(comment.createdAt), 'dd/MM/yy HH:mm')
                    : null
                  const urgencyLevel = comment.urgency
                  return (
                    <li
                      key={comment.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-1 px-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-gray-800 whitespace-pre-line">
                          {comment.content}
                        </p>
                        {urgencyLevel && urgencyLevel !== 'none' ? (
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${urgencyColor(
                              urgencyLevel
                            )}`}
                          >
                            {urgencyLabels[urgencyLevel]}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {comment.createdBy
                            ? ` ${
                                collaboratorDetails(comment.createdBy)?.email
                              }`
                            : 'Autor desconocido'}
                        </span>
                        {createdAt ? <span>{createdAt}</span> : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                {emptyStateText}
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-base font-semibold text-gray-800">
              Agregar comentario
            </h3>
            <Form form={form} onSubmit={handleSubmit} className="space-y-2">
              <TextField<NewCommentFormValues>
                name="content"
                label="Comentario"
                multiline
                rows={4}
                placeholder="Escribe tu comentario"
              />
              <SelectField<NewCommentFormValues>
                name="urgency"
                label="Prioridad"
                options={urgencyOptions}
              />
              {submitError ? (
                <p className="text-sm text-red-600">{submitError}</p>
              ) : null}
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  onClick={() => reset({ content: '', urgency: 'none' })}
                  disabled={formState.isSubmitting}
                >
                  Limpiar
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={formState.isSubmitting}
                >
                  {formState.isSubmitting
                    ? 'Guardando...'
                    : 'Agregar comentario'}
                </Button>
              </div>
            </Form>
          </section>
        </div>
      </Modal>
    </>
  )
}

export default Comments
