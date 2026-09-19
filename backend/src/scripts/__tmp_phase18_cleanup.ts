/**
 * Phase 18 — controlled, one-time removal of confirmed legacy test
 * artifacts from the `blogs` collection. Deletes ONLY the 27 explicit
 * `_id` values below, collected from a manual read-only inventory pass
 * (see the Phase 18 report's Classification section for the evidence
 * behind every one of them) — never a broad title/slug pattern match,
 * never `deleteMany({})`. `regression-test-post` and every admin
 * account are untouched; this script never writes to the `admins`
 * collection at all.
 *
 * A JSON backup of every document about to be deleted is written to
 * the scratchpad before the delete runs. Temporary; deleted after use.
 */
import { ObjectId } from 'mongodb'
import { writeFileSync } from 'node:fs'
import { connectToDatabase, disconnectFromDatabase, getDb } from '../config/database.js'
import type { BlogDocument } from '../types/blog.js'

const BACKUP_PATH =
  '/private/tmp/claude-501/-Users-narutouzumaki-Downloads-Work-Brandworks/d4709d49-425a-4257-8fb9-e7486f0c1c4d/scratchpad/phase18/deleted-blog-documents-backup.json'

// Collected from the read-only inventory pass — every one of these was
// verified to have a synthetic test title/slug, placeholder content,
// an example.com cover image, and (critically) an already-set
// `deletedAt` — meaning every single one is already invisible to the
// running application (every query path filters deletedAt: null by
// default) and reachable only via the admin trash view.
const CONFIRMED_TEST_ARTIFACT_IDS = [
  ['6aa7d7f9f4e253c1487452d8', 'admin-test-post-one'],
  ['6aa7d7f9f4e253c1487452d9', 'sub-admin-test-post-one'],
  ['6aa7d852f4e253c1487452da', 'pagination-test-post-3'],
  ['6aa7d852f4e253c1487452db', 'pagination-test-post-4'],
  ['6aa7d852f4e253c1487452dc', 'pagination-test-post-5'],
  ['6aa7d9d14a921e557b7cdc46', 'public-test-draft-post'],
  ['6aa7d9d14a921e557b7cdc47', 'public-test-unpublished-post'],
  ['6aa7d9d24a921e557b7cdc48', 'public-test-deleted-post'],
  ['6aa7d9e24a921e557b7cdc49', 'public-test-published-post-a'],
  ['6aa7d9e34a921e557b7cdc4a', 'public-test-published-post-b'],
  ['6aa7d9ec4a921e557b7cdc4b', 'public-test-published-post-c'],
  ['6aa7d9ed4a921e557b7cdc4c', 'public-test-published-post-d'],
  ['6aa7d9ed4a921e557b7cdc4d', 'public-test-published-post-e'],
  ['6aa7da125b4166680abb14ba', 'public-test-future-scheduled-post'],
  ['6aa7dcbd4a921e557b7cdc4e', 'phase-4-integration-test-post'],
  ['6aa7dfe14a921e557b7cdc50', 'phase-5-test-draft'],
  ['6aa7dfe14a921e557b7cdc51', 'phase-5-test-unpublished'],
  ['6aa7dfe24a921e557b7cdc52', 'phase-5-test-deleted'],
  ['6aa7dfe94a921e557b7cdc53', 'phase-5-published-post-1'],
  ['6aa7dfe94a921e557b7cdc54', 'phase-5-published-post-2'],
  ['6aa7dfea4a921e557b7cdc55', 'phase-5-published-post-3'],
  ['6aa7dfea4a921e557b7cdc56', 'phase-5-published-post-4'],
  ['6aa7e2a0b9e7ed1de7ccda77', 'smoke-test-post'],
  ['6aa7e2d4fec177322f66c677', 'legacy-pre-phase-6-post'],
  ['6aa7e2f3b9e7ed1de7ccda78', 'scheduled-publish-date-test'],
  ['6aa7e2fdb9e7ed1de7ccda7a', 'sub-admin-structured-post'],
  ['6aa7e474b9e7ed1de7ccda7b', 'editor-simulation-post'],
] as const

let passed = 0
let failed = 0
function check(label: string, condition: boolean) {
  if (condition) {
    passed++
    console.log(`  OK   ${label}`)
  } else {
    failed++
    console.log(`  FAIL ${label}`)
  }
}

async function main() {
  await connectToDatabase()
  const db = getDb()
  const blogs = db.collection<BlogDocument>('blogs')
  const admins = db.collection('admins')

  const before = await blogs.countDocuments({})
  console.log(`Blog documents before: ${before}`)

  // --- Re-verify every candidate immediately before deleting anything ---
  console.log('\n=== Re-verifying each confirmed candidate against the live DB ===')
  const idsToDelete: ObjectId[] = []
  const docsToBackUp: BlogDocument[] = []
  for (const [idStr, expectedSlug] of CONFIRMED_TEST_ARTIFACT_IDS) {
    const id = new ObjectId(idStr)
    const doc = await blogs.findOne({ _id: id })
    if (!doc) {
      check(`${expectedSlug}: still exists`, false)
      continue
    }
    const slugMatches = doc.slug === expectedSlug
    const isSoftDeleted = doc.deletedAt !== null
    check(`${expectedSlug}: slug matches inventory and is already soft-deleted`, slugMatches && isSoftDeleted)
    if (slugMatches && isSoftDeleted) {
      idsToDelete.push(id)
      docsToBackUp.push(doc)
    }
  }
  check('every one of the 27 confirmed candidates re-verified cleanly', idsToDelete.length === 27)

  // Never touch regression-test-post or any admin document from here.
  const regressionPost = await blogs.findOne({ slug: 'regression-test-post' })
  check('regression-test-post is not in the deletion list', !idsToDelete.some((id) => id.equals(regressionPost?._id!)))

  // --- Backup before deletion ---
  writeFileSync(
    BACKUP_PATH,
    JSON.stringify(
      docsToBackUp.map((d) => ({ ...d, _id: d._id.toHexString(), authorId: d.authorId.toHexString() })),
      null,
      2,
    ),
  )
  console.log(`\nBackup of ${docsToBackUp.length} document(s) written to:\n  ${BACKUP_PATH}`)

  // --- Delete only the explicit, re-verified _id list ---
  const result = await blogs.deleteMany({ _id: { $in: idsToDelete } })
  console.log(`\ndeleteMany matched/deleted: ${result.deletedCount}`)
  check('deletedCount equals the confirmed list length (27)', result.deletedCount === 27)

  // --- Verify final state ---
  console.log('\n=== Final verification ===')
  const after = await blogs.countDocuments({})
  console.log(`Blog documents after: ${after}`)
  check('exactly one document remains', after === 1)

  const remaining = await blogs.find({}).toArray()
  check(
    'the sole remaining document is regression-test-post',
    remaining.length === 1 && remaining[0].slug === 'regression-test-post',
  )
  check('regression-test-post is still not soft-deleted (deletedAt: null)', remaining[0]?.deletedAt === null)
  check(
    'regression-test-post document is otherwise untouched (same _id as before)',
    remaining[0]?._id.equals(regressionPost!._id),
  )

  // admins collection — read-only, no sensitive fields printed, nothing written.
  const testadmin = await admins.findOne({ username: 'testadmin' }, { projection: { passwordHash: 0 } })
  check('testadmin account still exists and was not modified by this script (this script never writes to admins)', testadmin !== null)
  const adminCountAfter = await admins.countDocuments({})
  console.log(`admins collection document count (untouched by this script): ${adminCountAfter}`)

  console.log(`\n${passed}/${passed + failed} checks passed.`)
  await disconnectFromDatabase()
  if (failed > 0) process.exitCode = 1
}

main().catch(async (err) => {
  console.error('Script failed:', err)
  await disconnectFromDatabase().catch(() => undefined)
  process.exitCode = 1
})
