import 'dotenv/config'
import { seedTestUser, testUser } from '../../tests/helpers/seedUser.js'

async function run() {
  console.log(`Seeding user: ${testUser.email}...`)
  await seedTestUser()
  console.log(`User ${testUser.email} created successfully with role '${testUser.role}'!`)
  process.exit(0)
}

run().catch((err) => {
  console.error('Error seeding user:', err)
  process.exit(1)
})
