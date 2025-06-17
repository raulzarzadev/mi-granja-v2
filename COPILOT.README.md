// Este proyecto es una web app para un granjero que necesita controlar su ganado (ovejas, vacas de leche, vacas de engorda, etc).
// Está construida con Next.js, Firebase (Auth + Firestore), Redux Toolkit y Tailwind CSS (última versión).
// El diseño debe ser mobile-first, minimalista y con componentes altamente reutilizables.
// Usar TypeScript en todo el proyecto.

// 🔧 Requisitos generales:
// - Crear estructura del proyecto siguiendo buenas prácticas modernas (pages/app router en Next.js).
// - Configurar Tailwind con diseño enfocado en uso en celulares.
// - Integrar Firebase para auth (email/password) y Firestore para persistencia de datos.
// - Integrar Redux Toolkit para manejo de estado global.
// - Estructurar carpetas por dominios o features (por ejemplo: animals, breeding, weaning, weight, etc).
// - Todos los formularios y componentes deben ser reutilizables y desacoplados.
// - Crear una interfaz limpia, clara y rápida, con navegación simple.

// 📦 Features principales de la app:
// - Registro y login del granjero.
// - Dashboard con resumen de su ganado (por tipo).
// - Registro de animales con información como ID, tipo (oveja, vaca), edad, peso, etapa (cría, engorda, lechera).
// - Seguimiento de ciclo reproductivo: montas, partos, destetes.
// - Seguimiento de engorda y producción lechera (opcional).
// - Notas o recordatorios del ganadero por animal o por lote.
// - Vista por animal, por lote y por historial.

// ✅ Empezar generando:
// - Estructura inicial del proyecto con layout base y navegación.
// - Configuración de Tailwind con diseño mobile-first.
// - AuthContext con Firebase para login/registro.
// - Redux store con slices para usuarios y animales.
// - Primeros componentes: Navbar, AnimalCard, Formulario de Registro de Animal.

// 🔁 Todo componente debe ir dentro de /components y estar documentado.
// 🔄 Separar lógica de presentación (hooks y lógica en /hooks y /lib).
// 📱 Siempre priorizar la vista en teléfonos (responsive con Tailwind).

// ¡Comencemos creando la estructura base del proyecto!
