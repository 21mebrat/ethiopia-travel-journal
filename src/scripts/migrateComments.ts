import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config.js'
import { calculateEngagementScore } from '../lib/site/engagement.js'

/**
 * Migration Script: Comments Moderation & Article Metrics Backfill
 *
 * Usage:
 *   npx tsx src/scripts/migrateComments.ts --dry-run
 *   npx tsx src/scripts/migrateComments.ts --apply
 *
 * SCOPE:
 * 1. Comments:
 *    - Finds legacy comments lacking a `status` field and sets them to 'pending'.
 *    - Identifies comments lacking an `article` reference without deleting them,
 *      allowing staff to review them in the admin dashboard.
 * 2. Articles:
 *    - Backfills missing `viewCount` (default: 0) while preserving any existing nonzero counts.
 *    - Reconciles `commentCount` against approved comments in the database.
 *    - Recalculates `engagementScore` using the verified viewCount and commentCount.
 *
 * BACKUP & ROLLBACK APPROACH:
 * - Before running `--apply` in production, create a backup using mongodump:
 *   mongodump --uri="$DATABASE_URL" --collection=comments --collection=articles --out=/backup/pre-comments-migration/
 * - To roll back:
 *   mongorestore --uri="$DATABASE_URL" --drop /backup/pre-comments-migration/
 */
async function run() {
  const isApply = process.argv.includes('--apply')
  const isDryRun = !isApply

  console.log('='.repeat(70))
  console.log(`Comments & Engagement Metrics Migration [Mode: ${isDryRun ? 'DRY-RUN' : 'APPLY'}]`)
  console.log('='.repeat(70))

  const payload = await getPayload({ config: await config })

  // 1. Audit Comments
  console.log('\n[1/2] Auditing Comments collection...')
  const commentsResult = await payload.find({
    collection: 'comments',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })

  console.log(`Found ${commentsResult.totalDocs} total comments in database.`)

  let commentsWithoutStatus = 0
  let commentsWithoutArticle = 0

  for (const doc of commentsResult.docs) {
    const hasStatus = Boolean((doc as any).status)
    const hasArticle = Boolean((doc as any).article)

    if (!hasStatus) {
      commentsWithoutStatus++
      console.log(`  - Comment ${doc.id} (${(doc as any).full_name || 'unnamed'}) is missing status.`)
      if (isApply) {
        await payload.update({
          collection: 'comments',
          id: doc.id,
          data: {
            status: 'pending',
          },
          overrideAccess: true,
        })
        console.log(`    -> Updated ${doc.id} status to 'pending'.`)
      }
    }

    if (!hasArticle) {
      commentsWithoutArticle++
      console.log(`  - Legacy comment ${doc.id} (${(doc as any).full_name || 'unnamed'}) has NO article assigned. (Preserved safely)`)
    }
  }

  console.log(`Comments Summary: ${commentsWithoutStatus} missing status, ${commentsWithoutArticle} legacy unassigned comments.`)

  // 2. Audit Articles
  console.log('\n[2/2] Auditing Articles collection metrics...')
  const articlesResult = await payload.find({
    collection: 'articles',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })

  console.log(`Found ${articlesResult.totalDocs} total articles in database.`)
  let articlesUpdated = 0

  for (const article of articlesResult.docs) {
    const existingViews = typeof (article as any).viewCount === 'number' ? (article as any).viewCount : 0
    const existingComments = typeof (article as any).commentCount === 'number' ? (article as any).commentCount : null
    const existingScore = typeof (article as any).engagementScore === 'number' ? (article as any).engagementScore : null

    // Count approved comments for this article
    const approvedCommentsResult = await payload.count({
      collection: 'comments',
      where: {
        and: [
          { article: { equals: article.id } },
          { status: { equals: 'approved' } },
        ],
      },
      overrideAccess: true,
    })

    const realApprovedComments = approvedCommentsResult.totalDocs || 0
    const calculatedScore = calculateEngagementScore(existingViews, realApprovedComments)

    const needsUpdate =
      existingComments === null ||
      existingScore === null ||
      existingComments !== realApprovedComments ||
      existingScore !== calculatedScore

    if (needsUpdate) {
      articlesUpdated++
      console.log(`  - Article ${article.id} ("${(article as any).title}"):`)
      console.log(`      Views: ${existingViews} (preserved)`)
      console.log(`      Comments: ${existingComments} -> ${realApprovedComments}`)
      console.log(`      Score: ${existingScore} -> ${calculatedScore}`)

      if (isApply) {
        await payload.update({
          collection: 'articles',
          id: article.id,
          data: {
            viewCount: existingViews,
            commentCount: realApprovedComments,
            engagementScore: calculatedScore,
          },
          context: {
            internalCounterUpdate: true,
          },
          overrideAccess: true,
        })
        console.log(`      -> Successfully reconciled article ${article.id}.`)
      }
    }
  }

  console.log(`Articles Summary: ${articlesUpdated} articles required metrics backfill/reconciliation.`)
  console.log('\nMigration check complete.')

  if (isDryRun) {
    console.log('\nNote: Run with --apply to commit these changes to the database.')
  }

  process.exit(0)
}

run().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
