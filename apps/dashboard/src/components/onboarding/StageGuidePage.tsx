import React from 'react'

/**
 * Guía de etapas. Refleja exactamente el comportamiento de
 * computeAnimalStage (base) y computeAnimalEffectiveStage (overlay).
 */
const StageGuidePage: React.FC = () => {
  return (
    <div className="space-y-5 text-sm">
      <section>
        <h3 className="font-semibold text-gray-900 mb-1">Regla base del stage</h3>
        <p className="text-gray-600">
          <code>computeAnimalStage</code> evalúa en orden:
        </p>
        <ol className="list-decimal list-inside text-gray-700 mt-2 space-y-1">
          <li>
            <strong>Stage manual</strong> (<code>engorda</code> / <code>descarte</code>): se respeta
            tal cual — no se recalcula nunca.
          </li>
          <li>
            <strong>No destetado</strong> (<code>isWeaned=false</code> y sin <code>weanedAt</code>)
            → <span className="font-medium">cria</span>.
          </li>
          <li>
            <strong>Edad &lt; weaningDays de la especie</strong> (gate doble) →{' '}
            <span className="font-medium">cria</span>, aunque esté marcado como destetado.
          </li>
          <li>
            Destetado + edad ≥ weaningDays + edad &lt; edad mínima reproductiva →{' '}
            <span className="font-medium">juvenil</span>.
          </li>
          <li>
            Destetado + edad ≥ weaningDays + edad ≥ edad mínima reproductiva →{' '}
            <span className="font-medium">reproductor</span>.
          </li>
        </ol>
      </section>

      <section className="p-3 rounded-md bg-amber-50 border border-amber-200">
        <p className="text-amber-900">
          <strong>Gate doble para salir de cría:</strong> se requieren <em>destete explícito</em>{' '}
          <u>Y</u> <em>edad ≥ weaningDays</em>. La edad sola no avanza, y un destete prematuro
          tampoco saca al animal de cría si aún no alcanza la edad mínima de destete de su especie.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 mb-2">Tabla de decisión (base)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-gray-200 rounded">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left border-b">Stage guardado</th>
                <th className="p-2 text-left border-b">isWeaned / weanedAt</th>
                <th className="p-2 text-left border-b">Edad vs weaningDays</th>
                <th className="p-2 text-left border-b">Edad vs minBreeding</th>
                <th className="p-2 text-left border-b">Resultado</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <tr>
                <td className="p-2 border-b">
                  <code>engorda</code> / <code>descarte</code>
                </td>
                <td className="p-2 border-b">cualquiera</td>
                <td className="p-2 border-b">cualquiera</td>
                <td className="p-2 border-b">cualquiera</td>
                <td className="p-2 border-b font-medium">igual al guardado</td>
              </tr>
              <tr>
                <td className="p-2 border-b">otro</td>
                <td className="p-2 border-b">no destetado</td>
                <td className="p-2 border-b">cualquiera</td>
                <td className="p-2 border-b">cualquiera</td>
                <td className="p-2 border-b font-medium">cria</td>
              </tr>
              <tr>
                <td className="p-2 border-b">otro</td>
                <td className="p-2 border-b">destetado</td>
                <td className="p-2 border-b">&lt; weaningDays</td>
                <td className="p-2 border-b">cualquiera</td>
                <td className="p-2 border-b font-medium">cria</td>
              </tr>
              <tr>
                <td className="p-2 border-b">otro</td>
                <td className="p-2 border-b">destetado</td>
                <td className="p-2 border-b">≥ weaningDays</td>
                <td className="p-2 border-b">&lt; min. reproductiva</td>
                <td className="p-2 border-b font-medium">juvenil</td>
              </tr>
              <tr>
                <td className="p-2">otro</td>
                <td className="p-2">destetado</td>
                <td className="p-2">≥ weaningDays</td>
                <td className="p-2">≥ min. reproductiva</td>
                <td className="p-2 font-medium">reproductor</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 mb-2">Diagrama (base + overlay)</h3>
        <pre className="text-[11px] leading-5 bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto">
          {`BASE (computeAnimalStage):

┌─────────┐  wean + edad ≥ weaningDays  ┌──────────┐  edad ≥ minBreeding  ┌─────────────┐
│  cria   │ ──────────────────────────▶ │ juvenil  │ ───────────────────▶ │ reproductor │
└─────────┘                             └──────────┘                      └─────────────┘
     │
     │ wean (destino = engorda)
     ▼
┌─────────┐
│ engorda │   (manual, no se recalcula)
└─────────┘

OVERLAY (computeAnimalEffectiveStage, solo si base ≠ cria):

  cria  ⇒  siempre cria (overlay NO aplica — protege contra datos legacy)

  macho + monta activa (breeding sin finish)             → empadre
  hembra + info en breeding activo:
    actualBirthDate + daysSince ≤ weaningDays especie   → crias_lactantes  (prioridad 1)
    pregnancyConfirmedDate + sin parto                  → embarazos        (prioridad 2)
    sin embarazo ni parto                                → empadre          (prioridad 3)

FALLBACK (hembra sin breeding activo, usa campos del animal):
  animal.birthedAt + daysSince ≤ weaningDays            → crias_lactantes
  animal.pregnantAt                                     → embarazos`}
        </pre>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 mb-1">Overlay reproductivo</h3>
        <p className="text-gray-600">
          <code>computeAnimalEffectiveStage</code> añade contexto reproductivo sobre la base. Se
          aplica en tabs de <em>Empadre</em>, <em>Embarazos</em>, <em>Crías lactantes</em> y
          <em> Todos</em> (columna Etapa). Reglas exactas:
        </p>
        <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
          <li>
            Si la base es <code>cria</code> → resultado <strong>cria</strong>. El overlay nunca
            aplica sobre crías (evita clasificar legacy <code>birthedAt</code>/
            <code>pregnantAt</code> como madres).
          </li>
          <li>
            🐏 <strong>Empadre</strong>: macho en breeding activo, o hembra en breeding activo sin
            embarazo confirmado ni parto.
          </li>
          <li>
            🤰 <strong>Embarazos</strong>: hembra con <code>pregnancyConfirmedDate</code> y sin
            <code> actualBirthDate</code>. Prioridad sobre empadre. Fallback:{' '}
            <code>animal.pregnantAt</code> sin breeding activo.
          </li>
          <li>
            🍼 <strong>Crías lactantes</strong>: hembra con <code>actualBirthDate</code> dentro del
            periodo <code>weaningDays</code> de la especie. Máxima prioridad del overlay. Fallback:{' '}
            <code>animal.birthedAt</code> dentro del mismo rango sin breeding activo.
          </li>
          <li>
            Si no aplica ningún overlay → se conserva la base (juvenil / reproductor / engorda /
            descarte).
          </li>
        </ul>
      </section>

      <section className="p-3 rounded-md bg-sky-50 border border-sky-200">
        <p className="text-sky-900">
          Toda la lógica vive en <code>computeAnimalStage</code> (base) y{' '}
          <code>computeAnimalEffectiveStage</code> (overlay) en{' '}
          <code>packages/shared/src/lib/animal-utils.ts</code>. Todos los tabs, conteos y vistas del
          sistema consumen estas funciones — si ves una diferencia con esta guía, es un bug.
        </p>
      </section>
    </div>
  )
}

export default StageGuidePage
