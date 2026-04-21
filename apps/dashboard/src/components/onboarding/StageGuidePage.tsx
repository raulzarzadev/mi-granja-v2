import React from 'react'

/**
 * Guía de etapas del animal. Explica la regla canónica que usa Mi Granja
 * para calcular el stage de cada animal y cómo transita entre etapas.
 */
const StageGuidePage: React.FC = () => {
  return (
    <div className="space-y-5 text-sm">
      <section>
        <h3 className="font-semibold text-gray-900 mb-1">Regla canónica del stage</h3>
        <p className="text-gray-600">
          Mi Granja calcula la etapa de cada animal con una sola función. La regla es:
        </p>
        <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
          <li>
            <strong>Stage manual</strong> (<code>engorda</code> / <code>descarte</code>): el usuario
            lo asigna explícitamente y se respeta.
          </li>
          <li>
            <strong>No destetado</strong> (<code>isWeaned=false</code> y sin <code>weanedAt</code>):{' '}
            <span className="font-medium">permanece cría</span>, sin importar la edad.
          </li>
          <li>
            <strong>Destetado</strong> + edad &lt; edad mínima reproductiva:{' '}
            <span className="font-medium">juvenil</span>.
          </li>
          <li>
            <strong>Destetado</strong> + edad ≥ edad mínima reproductiva:{' '}
            <span className="font-medium">reproductor</span>.
          </li>
        </ul>
      </section>

      <section className="p-3 rounded-md bg-amber-50 border border-amber-200">
        <p className="text-amber-900">
          <strong>Importante:</strong> la edad NO avanza al animal automáticamente. El destete
          (evento explícito) es lo que saca al animal de la etapa cría. Cuando lo destetas eliges el
          destino: engorda o reproducción (pasará por juvenil hasta la edad adecuada).
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 mb-2">Tabla de decisión</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-gray-200 rounded">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left border-b">Stage guardado</th>
                <th className="p-2 text-left border-b">isWeaned / weanedAt</th>
                <th className="p-2 text-left border-b">Edad</th>
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
                <td className="p-2 border-b font-medium">igual al guardado</td>
              </tr>
              <tr>
                <td className="p-2 border-b">otro</td>
                <td className="p-2 border-b">no destetado</td>
                <td className="p-2 border-b">cualquiera</td>
                <td className="p-2 border-b font-medium">cria</td>
              </tr>
              <tr>
                <td className="p-2 border-b">otro</td>
                <td className="p-2 border-b">destetado</td>
                <td className="p-2 border-b">&lt; min. reproductiva</td>
                <td className="p-2 border-b font-medium">juvenil</td>
              </tr>
              <tr>
                <td className="p-2">otro</td>
                <td className="p-2">destetado</td>
                <td className="p-2">≥ min. reproductiva</td>
                <td className="p-2 font-medium">reproductor</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 mb-2">Diagrama de transiciones</h3>
        <pre className="text-[11px] leading-5 bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto">
          {`┌─────────┐   wean (reproducción)   ┌──────────┐   edad ≥ min   ┌─────────────┐
│  cria   │ ──────────────────────▶ │ juvenil  │ ─────────────▶ │ reproductor │
└─────────┘                         └──────────┘                └─────────────┘
     │
     │ wean (engorda)
     ▼
┌─────────┐
│ engorda │  (manual, no se recalcula)
└─────────┘

Etapas derivadas del empadre (overlay sobre la base):
  reproductor/juvenil + monta activa → empadre
  + embarazo confirmado              → embarazos
  + parto reciente (dentro destete)  → crias_lactantes (lactando)`}
        </pre>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 mb-1">Etapas efectivas (con overlay)</h3>
        <p className="text-gray-600">
          Para tabs como <em>Empadre</em>, <em>Embarazos</em> y <em>Lactando</em> se usa la etapa
          efectiva, que añade contexto reproductivo sobre la base:
        </p>
        <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
          <li>
            🐏 <strong>Empadre</strong>: macho activo en monta, o hembra en monta sin embarazo
            confirmado.
          </li>
          <li>
            🤰 <strong>Embarazos</strong>: hembra con embarazo confirmado (o{' '}
            <code>pregnantAt</code> en el animal) y sin parto registrado.
          </li>
          <li>
            🍼 <strong>Lactando</strong>: hembra con parto reciente dentro del periodo de lactancia
            de su especie.
          </li>
          <li>
            Una cría nunca entra en estados reproductivos, incluso si hay datos legacy.
          </li>
        </ul>
      </section>

      <section className="p-3 rounded-md bg-sky-50 border border-sky-200">
        <p className="text-sky-900">
          Toda esta lógica vive en una sola función: <code>computeAnimalStage</code> (base) y{' '}
          <code>computeAnimalEffectiveStage</code> (con overlay). Todos los tabs, conteos y vistas
          del sistema usan estas funciones — si ves una diferencia, es un bug, no un desacuerdo de
          reglas.
        </p>
      </section>
    </div>
  )
}

export default StageGuidePage
