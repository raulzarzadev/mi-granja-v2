/**
 * Script para poblar los emuladores de Firebase con datos de prueba.
 * Ejecutar con: npx tsx scripts/seed-emulators.ts
 * Requiere que los emuladores estén corriendo.
 */

import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'

const app = initializeApp({ projectId: 'mi-granja-app' })
const db = getFirestore(app)
const auth = getAuth(app)

const FARM_ID = 'farm-rancho-el-sol'
const ADMIN_UID = 'admin-user-001'
const FARMER_UID = 'farmer-user-002'

async function seedAuth() {
  console.log('🔐 Creando usuarios de autenticación...')

  await auth.createUser({
    uid: ADMIN_UID,
    email: 'admin@migranja.com',
    password: 'admin123456',
    displayName: 'Admin Granja',
  })

  await auth.createUser({
    uid: FARMER_UID,
    email: 'granjero@ejemplo.com',
    password: 'granjero123456',
    displayName: 'Juan Pérez',
  })

  console.log('  ✓ 2 usuarios creados')
}

async function seedUsers() {
  console.log('👤 Creando documentos de usuarios...')

  const users = [
    {
      id: ADMIN_UID,
      email: 'admin@migranja.com',
      displayName: 'Admin Granja',
      farms: [FARM_ID],
      currentFarm: FARM_ID,
      createdAt: Timestamp.now(),
    },
    {
      id: FARMER_UID,
      email: 'granjero@ejemplo.com',
      displayName: 'Juan Pérez',
      farms: [FARM_ID],
      currentFarm: FARM_ID,
      createdAt: Timestamp.now(),
    },
  ]

  for (const user of users) {
    await db.collection('users').doc(user.id).set(user)
  }
  console.log(`  ✓ ${users.length} usuarios`)
}

async function seedFarm() {
  console.log('🏠 Creando granja...')

  const farm = {
    id: FARM_ID,
    name: 'Rancho El Sol',
    ownerId: ADMIN_UID,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: ADMIN_UID,
    location: {
      state: 'Baja California Sur',
      country: 'México',
    },
    areas: [
      { id: 'area-1', name: 'Pastizal Norte', description: 'Área de pastoreo principal' },
      { id: 'area-2', name: 'Establo Principal', description: 'Establo techado para ganado' },
    ],
    collaborators: [
      {
        userId: ADMIN_UID,
        email: 'admin@migranja.com',
        role: 'admin',
        joinedAt: Timestamp.now(),
      },
    ],
    collaboratorsIds: [ADMIN_UID],
    collaboratorsEmails: ['admin@migranja.com'],
  }

  await db.collection('farms').doc(FARM_ID).set(farm)
  console.log('  ✓ Rancho El Sol')
}

async function seedAnimals() {
  console.log('🐑 Creando animales...')

  const now = Timestamp.now()
  const animals = [
    {
      id: 'animal-001',
      name: 'Borrego Luna',
      earring: 'OV-001',
      type: 'oveja',
      gender: 'hembra',
      breed: 'Dorper',
      stage: 'reproductor',
      birthDate: Timestamp.fromDate(new Date('2023-03-15')),
      weight: 65,
      status: 'active',
      farmId: FARM_ID,
      areaId: 'area-1',
      createdAt: now,
      createdBy: ADMIN_UID,
    },
    {
      id: 'animal-002',
      name: 'Borrego Trueno',
      earring: 'OV-002',
      type: 'oveja',
      gender: 'macho',
      breed: 'Dorper',
      stage: 'reproductor',
      birthDate: Timestamp.fromDate(new Date('2022-11-20')),
      weight: 85,
      status: 'active',
      farmId: FARM_ID,
      areaId: 'area-1',
      createdAt: now,
      createdBy: ADMIN_UID,
    },
    {
      id: 'animal-003',
      name: 'Corderita Estrella',
      earring: 'OV-003',
      type: 'oveja',
      gender: 'hembra',
      breed: 'Dorper',
      stage: 'cría',
      birthDate: Timestamp.fromDate(new Date('2025-08-10')),
      weight: 15,
      status: 'active',
      farmId: FARM_ID,
      parentId: 'animal-001',
      areaId: 'area-1',
      createdAt: now,
      createdBy: ADMIN_UID,
    },
    {
      id: 'animal-004',
      name: 'Vaca Margarita',
      earring: 'VA-001',
      type: 'vaca',
      gender: 'hembra',
      breed: 'Angus',
      stage: 'reproductor',
      birthDate: Timestamp.fromDate(new Date('2021-06-01')),
      weight: 450,
      status: 'active',
      farmId: FARM_ID,
      areaId: 'area-2',
      createdAt: now,
      createdBy: ADMIN_UID,
    },
    {
      id: 'animal-005',
      name: 'Toro Rayo',
      earring: 'VA-002',
      type: 'vaca',
      gender: 'macho',
      breed: 'Angus',
      stage: 'reproductor',
      birthDate: Timestamp.fromDate(new Date('2020-09-15')),
      weight: 650,
      status: 'active',
      farmId: FARM_ID,
      areaId: 'area-2',
      createdAt: now,
      createdBy: ADMIN_UID,
    },
    {
      id: 'animal-006',
      name: 'Cerda Rosa',
      earring: 'CE-001',
      type: 'cerdo',
      gender: 'hembra',
      breed: 'Hampshire',
      stage: 'reproductor',
      birthDate: Timestamp.fromDate(new Date('2024-01-20')),
      weight: 120,
      status: 'active',
      farmId: FARM_ID,
      areaId: 'area-2',
      createdAt: now,
      createdBy: ADMIN_UID,
    },
    {
      id: 'animal-007',
      name: 'Gallina Pepita',
      earring: 'GA-001',
      type: 'gallina',
      gender: 'hembra',
      breed: 'Rhode Island',
      stage: 'adulto',
      birthDate: Timestamp.fromDate(new Date('2024-05-10')),
      weight: 3,
      status: 'active',
      farmId: FARM_ID,
      areaId: 'area-2',
      createdAt: now,
      createdBy: ADMIN_UID,
    },
    {
      id: 'animal-008',
      name: 'Chivo Pancho',
      earring: 'CA-001',
      type: 'cabra',
      gender: 'macho',
      breed: 'Boer',
      stage: 'reproductor',
      birthDate: Timestamp.fromDate(new Date('2023-07-25')),
      weight: 70,
      status: 'active',
      farmId: FARM_ID,
      areaId: 'area-1',
      createdAt: now,
      createdBy: ADMIN_UID,
    },
    {
      id: 'animal-009',
      name: 'Yegua Canela',
      earring: 'EQ-001',
      type: 'equino',
      gender: 'hembra',
      breed: 'Cuarto de Milla',
      stage: 'adulto',
      birthDate: Timestamp.fromDate(new Date('2019-04-12')),
      weight: 500,
      status: 'active',
      farmId: FARM_ID,
      areaId: 'area-1',
      createdAt: now,
      createdBy: ADMIN_UID,
    },
    {
      id: 'animal-010',
      name: 'Borrega Nube',
      earring: 'OV-004',
      type: 'oveja',
      gender: 'hembra',
      breed: 'Katahdin',
      stage: 'reproductor',
      birthDate: Timestamp.fromDate(new Date('2023-05-08')),
      weight: 55,
      status: 'active',
      farmId: FARM_ID,
      areaId: 'area-1',
      createdAt: now,
      createdBy: ADMIN_UID,
    },
  ]

  for (const animal of animals) {
    await db.collection('farms').doc(FARM_ID).collection('animals').doc(animal.id).set(animal)
  }
  console.log(`  ✓ ${animals.length} animales`)
}

async function seedBreedings() {
  console.log('🐣 Creando registros de reproducción...')

  const breedings = [
    {
      id: 'breeding-001',
      maleId: 'animal-002',
      maleName: 'Borrego Trueno',
      maleEarring: 'OV-002',
      animalType: 'oveja',
      females: [
        {
          id: 'animal-001',
          name: 'Borrego Luna',
          earring: 'OV-001',
          pregnancyConfirmed: true,
          pregnancyConfirmedAt: Timestamp.fromDate(new Date('2025-07-01')),
        },
        {
          id: 'animal-010',
          name: 'Borrega Nube',
          earring: 'OV-004',
          pregnancyConfirmed: false,
        },
      ],
      startDate: Timestamp.fromDate(new Date('2025-06-01')),
      status: 'active',
      farmId: FARM_ID,
      createdAt: Timestamp.now(),
      createdBy: ADMIN_UID,
    },
    {
      id: 'breeding-002',
      maleId: 'animal-005',
      maleName: 'Toro Rayo',
      maleEarring: 'VA-002',
      animalType: 'vaca',
      females: [
        {
          id: 'animal-004',
          name: 'Vaca Margarita',
          earring: 'VA-001',
          pregnancyConfirmed: true,
          pregnancyConfirmedAt: Timestamp.fromDate(new Date('2025-09-15')),
        },
      ],
      startDate: Timestamp.fromDate(new Date('2025-08-10')),
      status: 'active',
      farmId: FARM_ID,
      createdAt: Timestamp.now(),
      createdBy: ADMIN_UID,
    },
  ]

  for (const breeding of breedings) {
    await db
      .collection('farms')
      .doc(FARM_ID)
      .collection('breedingRecords')
      .doc(breeding.id)
      .set(breeding)
  }
  console.log(`  ✓ ${breedings.length} registros de reproducción`)
}

async function seedReminders() {
  console.log('⏰ Creando recordatorios...')

  const reminders = [
    {
      id: 'reminder-001',
      title: 'Vacunación contra clostridios',
      description: 'Aplicar vacuna a todo el rebaño ovino',
      type: 'vacunación',
      dueDate: Timestamp.fromDate(new Date('2026-03-15')),
      status: 'pending',
      farmId: FARM_ID,
      createdAt: Timestamp.now(),
      createdBy: ADMIN_UID,
    },
    {
      id: 'reminder-002',
      title: 'Desparasitación trimestral',
      description: 'Aplicar desparasitante interno a bovinos y ovinos',
      type: 'desparasitación',
      dueDate: Timestamp.fromDate(new Date('2026-04-01')),
      status: 'pending',
      farmId: FARM_ID,
      createdAt: Timestamp.now(),
      createdBy: ADMIN_UID,
    },
    {
      id: 'reminder-003',
      title: 'Pesaje mensual de corderos',
      description: 'Registrar peso de crías menores a 6 meses',
      type: 'pesaje',
      dueDate: Timestamp.fromDate(new Date('2026-03-01')),
      status: 'pending',
      farmId: FARM_ID,
      createdAt: Timestamp.now(),
      createdBy: ADMIN_UID,
    },
    {
      id: 'reminder-004',
      title: 'Visita veterinaria programada',
      description: 'Revisión general y chequeo de gestantes',
      type: 'veterinaria',
      dueDate: Timestamp.fromDate(new Date('2026-03-10')),
      status: 'pending',
      farmId: FARM_ID,
      createdAt: Timestamp.now(),
      createdBy: ADMIN_UID,
    },
    {
      id: 'reminder-005',
      title: 'Reabastecer alimento balanceado',
      description: 'Comprar 20 sacos de alimento para bovinos',
      type: 'alimento',
      dueDate: Timestamp.fromDate(new Date('2026-03-05')),
      status: 'pending',
      farmId: FARM_ID,
      createdAt: Timestamp.now(),
      createdBy: ADMIN_UID,
    },
    {
      id: 'reminder-006',
      title: 'Limpieza de establo',
      description: 'Limpieza profunda y desinfección del establo principal',
      type: 'limpieza',
      dueDate: Timestamp.fromDate(new Date('2026-03-20')),
      status: 'pending',
      farmId: FARM_ID,
      createdAt: Timestamp.now(),
      createdBy: ADMIN_UID,
    },
  ]

  for (const reminder of reminders) {
    await db.collection('farms').doc(FARM_ID).collection('reminders').doc(reminder.id).set(reminder)
  }
  console.log(`  ✓ ${reminders.length} recordatorios`)
}

async function seedWeightRecords() {
  console.log('⚖️ Creando registros de peso...')

  const records = [
    {
      id: 'weight-001',
      animalId: 'animal-001',
      weight: 65,
      date: Timestamp.fromDate(new Date('2026-01-15')),
      notes: 'Peso después de esquila',
      farmId: FARM_ID,
      createdAt: Timestamp.now(),
      createdBy: ADMIN_UID,
    },
    {
      id: 'weight-002',
      animalId: 'animal-003',
      weight: 15,
      date: Timestamp.fromDate(new Date('2026-02-01')),
      notes: 'Cría en buen crecimiento',
      farmId: FARM_ID,
      createdAt: Timestamp.now(),
      createdBy: ADMIN_UID,
    },
    {
      id: 'weight-003',
      animalId: 'animal-004',
      weight: 450,
      date: Timestamp.fromDate(new Date('2026-02-10')),
      notes: 'Peso previo a temporada de monta',
      farmId: FARM_ID,
      createdAt: Timestamp.now(),
      createdBy: ADMIN_UID,
    },
  ]

  for (const record of records) {
    await db.collection('farms').doc(FARM_ID).collection('weightRecords').doc(record.id).set(record)
  }
  console.log(`  ✓ ${records.length} registros de peso`)
}

async function seedInvitations() {
  console.log('📧 Creando invitaciones...')

  const invitation = {
    id: 'invitation-001',
    email: 'veterinario@ejemplo.com',
    role: 'veterinarian',
    farmId: FARM_ID,
    farmName: 'Rancho El Sol',
    status: 'pending',
    invitedBy: ADMIN_UID,
    createdAt: Timestamp.now(),
  }

  await db
    .collection('farms')
    .doc(FARM_ID)
    .collection('farmInvitations')
    .doc(invitation.id)
    .set(invitation)
  console.log('  ✓ 1 invitación pendiente')
}

async function seedAdminActions() {
  console.log('🔧 Creando acciones de admin...')

  const action = {
    id: 'action-001',
    type: 'impersonation',
    adminId: ADMIN_UID,
    adminEmail: 'admin@migranja.com',
    targetUserId: FARMER_UID,
    targetEmail: 'granjero@ejemplo.com',
    reason: 'Soporte técnico — verificar configuración de granja',
    timestamp: Timestamp.now(),
  }

  await db.collection('adminActions').doc(action.id).set(action)
  console.log('  ✓ 1 acción de auditoría')
}

async function main() {
  console.log('🌱 Poblando emuladores de Firebase...\n')

  try {
    await seedAuth()
    await seedUsers()
    await seedFarm()
    await seedAnimals()
    await seedBreedings()
    await seedReminders()
    await seedWeightRecords()
    await seedInvitations()
    await seedAdminActions()

    console.log('\n✅ Seed completado exitosamente!')
    console.log('\nCredenciales de prueba:')
    console.log('  Admin:    admin@migranja.com / admin123456')
    console.log('  Granjero: granjero@ejemplo.com / granjero123456')
  } catch (error) {
    console.error('\n❌ Error durante el seed:', error)
    process.exit(1)
  }

  process.exit(0)
}

main()
