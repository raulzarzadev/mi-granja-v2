'use client'

import React, { useState } from 'react'
import { Animal, NoteEntry } from '@/types/animals'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface NotesSectionProps {
  animal: Animal
}

/**
 * Componente para gestionar las notas de un animal
 * Permite agregar, editar y eliminar notas
 */
const NotesSection: React.FC<NotesSectionProps> = ({ animal }) => {
  const { user } = useSelector((state: RootState) => state.auth)
  const { addNote, updateNote, removeNote } = useAnimalCRUD()

  const [newNoteText, setNewNoteText] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const notes = animal.notesLog || []
  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const handleAddNote = async () => {
    if (!newNoteText.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await addNote(animal.id, newNoteText)
      setNewNoteText('')
    } catch (error) {
      console.error('Error agregando nota:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateNote = async (noteId: string) => {
    if (!editingText.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await updateNote(animal.id, noteId, editingText)
      setEditingNoteId(null)
      setEditingText('')
    } catch (error) {
      console.error('Error actualizando nota:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (isSubmitting) return

    const confirmed = window.confirm(
      '¿Estás seguro de que quieres eliminar esta nota?'
    )
    if (!confirmed) return

    setIsSubmitting(true)
    try {
      await removeNote(animal.id, noteId)
    } catch (error) {
      console.error('Error eliminando nota:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const startEditing = (note: NoteEntry) => {
    setEditingNoteId(note.id)
    setEditingText(note.text)
  }

  const cancelEditing = () => {
    setEditingNoteId(null)
    setEditingText('')
  }

  return (
    <div className="space-y-4">
      {/* Formulario para nueva nota */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Agregar Nota</h4>
        <div className="space-y-3">
          <textarea
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Escribe una nota sobre este animal..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            rows={3}
            disabled={isSubmitting}
          />
          <div className="flex justify-end">
            <button
              onClick={handleAddNote}
              disabled={!newNoteText.trim() || isSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Guardando...' : 'Agregar Nota'}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de notas */}
      <div className="space-y-3">
        {sortedNotes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl mb-2 block">📝</span>
            <p>No hay notas para este animal</p>
            <p className="text-sm">
              Agrega la primera nota usando el formulario de arriba
            </p>
          </div>
        ) : (
          sortedNotes.map((note) => (
            <div
              key={note.id}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs text-gray-500">
                  {format(
                    new Date(note.createdAt),
                    "dd 'de' MMMM 'de' yyyy 'a las' HH:mm",
                    { locale: es }
                  )}
                  {note.updatedAt && (
                    <span className="ml-2 text-gray-400">(editado)</span>
                  )}
                </div>
                <div className="flex space-x-1">
                  {note.createdBy === user?.id && (
                    <>
                      <button
                        onClick={() => startEditing(note)}
                        disabled={isSubmitting}
                        className="text-gray-400 hover:text-blue-600 p-1 rounded"
                        title="Editar nota"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={isSubmitting}
                        className="text-gray-400 hover:text-red-600 p-1 rounded"
                        title="Eliminar nota"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editingNoteId === note.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    rows={3}
                    disabled={isSubmitting}
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={cancelEditing}
                      disabled={isSubmitting}
                      className="px-3 py-1 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleUpdateNote(note.id)}
                      disabled={!editingText.trim() || isSubmitting}
                      className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {isSubmitting ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-800 whitespace-pre-wrap">{note.text}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default NotesSection
