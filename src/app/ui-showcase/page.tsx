'use client'

import React from 'react'
import {
  ExampleSimpleModal,
  ExampleConfirmModal,
  ExampleFormModal,
  ExampleFullModal,
  ExampleModalBreedingForm,
  ExampleModalAnimalForm,
  ExampleModalReminderForm
} from '@/components/examples/ModalExamples'

/**
 * Página de demostración de componentes UI
 * Muestra ejemplos de todos los modales y componentes creados
 */
export default function UIShowcasePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎨 Showcase de Componentes UI
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Demostración interactiva de todos los componentes, modales y
            formularios disponibles en la aplicación Mi Granja.
          </p>
        </div>

        {/* Grid de componentes */}
        <div className="space-y-12">
          {/* Sección: Modales Básicos */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full mr-3">
                Básicos
              </span>
              Modales Fundamentales
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Modal Simple */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Modal Simple</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Modal básico con título y contenido
                </p>
                <ExampleSimpleModal />
              </div>

              {/* Modal de Confirmación */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">
                  Modal de Confirmación
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Para acciones destructivas
                </p>
                <ExampleConfirmModal />
              </div>

              {/* Modal de Formulario */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">
                  Modal con Formulario
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Formulario completo en modal
                </p>
                <ExampleFormModal />
              </div>

              {/* Modal Pantalla Completa */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">
                  Modal Completo
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Ocupa toda la pantalla
                </p>
                <ExampleFullModal />
              </div>
            </div>
          </section>

          {/* Sección: Modales de Negocio */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full mr-3">
                Negocio
              </span>
              Modales Específicos de la Granja
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Modal de Breeding */}
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">🐄💕</span>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Modal de Monta/Reproducción
                    </h3>
                    <p className="text-sm text-gray-600">
                      Registra montas entre animales reproductores
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Características:
                  </h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Selección de hembra y macho</li>
                    <li>• Fecha de monta y parto esperado</li>
                    <li>• Confirmación de embarazo</li>
                    <li>• Notas adicionales</li>
                  </ul>
                </div>

                <ExampleModalBreedingForm />
              </div>

              {/* Modal de Animal */}
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">🐄📝</span>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Modal de Animales
                    </h3>
                    <p className="text-sm text-gray-600">
                      Registra y edita información de animales
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Características:
                  </h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• ID único del animal</li>
                    <li>• Tipo y etapa de vida</li>
                    <li>• Información física (peso, edad)</li>
                    <li>• Modo crear/editar</li>
                  </ul>
                </div>

                <ExampleModalAnimalForm />
              </div>
            </div>
          </section>

          {/* Sección: Recordatorios */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full mr-3">
                Recordatorios
              </span>
              Modales de Gestión de Tareas
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Modal de Recordatorio */}
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">⏰📝</span>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Modal de Recordatorios
                    </h3>
                    <p className="text-sm text-gray-600">
                      Crea y gestiona recordatorios para la granja
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Características:
                  </h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Recordatorios por animal o generales</li>
                    <li>• Tipos: médico, reproducción, alimentación, etc.</li>
                    <li>• Niveles de prioridad</li>
                    <li>• Estado completado/pendiente</li>
                    <li>• Fechas programadas</li>
                  </ul>
                </div>

                <ExampleModalReminderForm />
              </div>
            </div>

            {/* Añadir un grid para 3 columnas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
              {/* Placeholder para futuros modales */}
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 opacity-50">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">📊</span>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Modal de Reportes
                    </h3>
                    <p className="text-sm text-gray-600">Próximamente...</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 opacity-50">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">⚖️</span>
                  <div>
                    <h3 className="font-medium text-gray-900">Modal de Peso</h3>
                    <p className="text-sm text-gray-600">Próximamente...</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 opacity-50">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">🥛</span>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Modal de Producción
                    </h3>
                    <p className="text-sm text-gray-600">Próximamente...</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Sección: Información Técnica */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full mr-3">
                Técnico
              </span>
              Información del Sistema
            </h2>

            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Arquitectura */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Arquitectura de Modales
                  </h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="bg-blue-50 p-3 rounded-md">
                      <strong className="text-blue-800">Modal Base:</strong>{' '}
                      Componente reutilizable con animaciones y accesibilidad
                    </div>
                    <div className="bg-green-50 p-3 rounded-md">
                      <strong className="text-green-800">useModal Hook:</strong>{' '}
                      Estado y funciones para controlar modales
                    </div>
                    <div className="bg-purple-50 p-3 rounded-md">
                      <strong className="text-purple-800">
                        Form Wrappers:
                      </strong>{' '}
                      Combinan modal + formulario + trigger
                    </div>
                  </div>
                </div>

                {/* Características */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Características Principales
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Cierre con Escape o click fuera
                    </div>
                    <div className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Animaciones suaves de entrada/salida
                    </div>
                    <div className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Tamaños configurables (sm, md, lg, xl, full)
                    </div>
                    <div className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Scroll interno automático
                    </div>
                    <div className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Accesibilidad (ARIA, focus management)
                    </div>
                    <div className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Botones trigger personalizables
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <section className="text-center py-8">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-8 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                🚀 Sistema de Modales Completo
              </h3>
              <p className="text-gray-600 mb-4">
                Todos los modales están construidos con el mismo patrón base,
                garantizando consistencia y mantenibilidad en toda la
                aplicación.
              </p>
              <div className="flex justify-center items-center space-x-4 text-sm text-gray-500">
                <span>React 18</span>
                <span>•</span>
                <span>TypeScript</span>
                <span>•</span>
                <span>Tailwind CSS</span>
                <span>•</span>
                <span>Next.js 15</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
