// Any setup scripts you might need go here

// Load .env files
import 'dotenv/config'

// Nonproduction safeguard: Direct integration tests to an isolated test database
// to guarantee development/production data is never altered or deleted during tests.
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.endsWith('-test')) {
  try {
    const url = new URL(process.env.DATABASE_URL)
    url.pathname = `${url.pathname}-test`
    process.env.DATABASE_URL = url.toString()
  } catch {
    process.env.DATABASE_URL = `${process.env.DATABASE_URL}-test`
  }
}
