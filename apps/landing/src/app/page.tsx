export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white px-4">
      <h1 className="text-5xl font-bold text-green-800 mb-4">Mi Granja</h1>
      <p className="text-xl text-gray-600 mb-8 text-center max-w-lg">
        Gestión inteligente para tu granja. Controla animales, reproducción,
        salud y colaboradores desde cualquier dispositivo.
      </p>
      <a
        href="https://dashboard.migranja.app"
        className="rounded-lg bg-green-600 px-8 py-3 text-lg font-semibold text-white hover:bg-green-700 transition-colors"
      >
        Ir al Dashboard
      </a>
    </main>
  )
}
