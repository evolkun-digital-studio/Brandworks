import { ObjectId } from 'mongodb'
import { connectToDatabase, disconnectFromDatabase, getDb } from '../config/database.js'
import {
  createBlog,
  ensureBlogIndexes,
  findBlogById,
  findBlogBySlug,
  restoreBlogById,
  softDeleteBlogById,
  updateBlogById,
} from '../repositories/blog.repository.js'

/**
 * Development/verification utility for the blog data layer — this is
 * NOT part of the runtime API and nothing here is imported by the
 * server. Run with `npm run blog:verify` from within backend/.
 *
 * Exercises the blog repository against the real, configured MongoDB
 * database using one clearly-marked throwaway document, which is
 * always permanently removed afterward — even if a check fails
 * partway through (see the try/finally below).
 *
 * That final removal deliberately reaches into the raw collection via
 * getDb() instead of going through the repository: the repository
 * intentionally exposes no hard-delete primitive for real blog
 * content (deletion is soft-delete only, everywhere else in the app —
 * see blog.repository.ts). This script is the one narrow, explicit
 * exception, scoped only to purging its own synthetic test document.
 */

const MARKER = `__verify-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

let passed = 0
let failed = 0

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  ok   ${label}`)
    passed += 1
  } else {
    console.error(`  FAIL ${label}`)
    failed += 1
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  await connectToDatabase()
  await ensureBlogIndexes()
  console.log('Blog indexes ensured.\n')

  const adminsBefore = await getDb().collection('admins').countDocuments()

  let testId: ObjectId | null = null

  try {
    console.log('1-2. create + read back')
    const created = await createBlog({
      title: 'BRANDWORKS Data Layer Verification',
      slug: `${MARKER}-post`,
      excerpt: 'Temporary document created by the blog data-layer verification script.',
      content: 'Safe to ignore — removed automatically at the end of this script.',
      coverImage: 'https://example.com/placeholder.jpg',
      coverImageAlt: 'placeholder',
      authorName: 'Verification Script',
      authorId: new ObjectId(),
      status: 'draft',
    })
    testId = created._id
    check('create: returns a document with an _id', Boolean(created._id))
    check(
      'create: createdAt and updatedAt start equal',
      created.createdAt.getTime() === created.updatedAt.getTime(),
    )
    check('create: publishedAt starts null', created.publishedAt === null)
    check('create: deletedAt starts null', created.deletedAt === null)

    const byId = await findBlogById(testId.toHexString())
    check('findBlogById: finds the created document', byId?.slug === created.slug)

    const bySlug = await findBlogBySlug(created.slug)
    check('findBlogBySlug: finds the created document', bySlug?._id.equals(testId) ?? false)

    console.log('\n3. update')
    await sleep(5) // ensure updatedAt is strictly later than createdAt at ms resolution
    const updated = await updateBlogById(testId.toHexString(), {
      title: 'BRANDWORKS Data Layer Verification (updated)',
    })
    check(
      'updateBlogById: applies the field change',
      updated?.title === 'BRANDWORKS Data Layer Verification (updated)',
    )
    check(
      'updateBlogById: bumps updatedAt',
      Boolean(updated && updated.updatedAt.getTime() > created.updatedAt.getTime()),
    )
    check(
      'updateBlogById: leaves createdAt unchanged',
      Boolean(updated && updated.createdAt.getTime() === created.createdAt.getTime()),
    )

    console.log('\n4. soft delete + restore')
    const softDeleted = await softDeleteBlogById(testId.toHexString())
    check('softDeleteBlogById: sets deletedAt', Boolean(softDeleted?.deletedAt))

    const hiddenByDefault = await findBlogById(testId.toHexString())
    check('findBlogById: excludes soft-deleted by default', hiddenByDefault === null)

    const visibleWhenRequested = await findBlogById(testId.toHexString(), {
      includeDeleted: true,
    })
    check(
      'findBlogById: includeDeleted:true still finds it',
      visibleWhenRequested?._id.equals(testId) ?? false,
    )

    const restored = await restoreBlogById(testId.toHexString())
    check('restoreBlogById: clears deletedAt', restored?.deletedAt === null)

    const visibleAgain = await findBlogById(testId.toHexString())
    check(
      'findBlogById: visible again after restore',
      visibleAgain?._id.equals(testId) ?? false,
    )

    console.log('\n5. unique slug index')
    let uniqueIndexEnforced = false
    try {
      await createBlog({
        title: 'Duplicate slug attempt',
        slug: created.slug, // intentionally the same slug as the first test doc
        excerpt: 'Should be rejected by the unique index.',
        content: 'n/a',
        coverImage: 'https://example.com/placeholder.jpg',
        coverImageAlt: 'placeholder',
        authorName: 'Verification Script',
        authorId: new ObjectId(),
        status: 'draft',
      })
    } catch (error) {
      uniqueIndexEnforced =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: number }).code === 11000
    }
    check('slug unique index: rejects a duplicate slug', uniqueIndexEnforced)
  } finally {
    if (testId) {
      await getDb().collection('blogs').deleteOne({ _id: testId })
      console.log('\nTemporary test document permanently removed.')
    }
  }

  const adminsAfter = await getDb().collection('admins').countDocuments()
  check('admins collection untouched (document count unchanged)', adminsBefore === adminsAfter)

  console.log(`\n${passed} passed, ${failed} failed.`)
  if (failed > 0) process.exitCode = 1
}

main()
  .catch((error) => {
    console.error(
      '\nVerification script crashed:',
      error instanceof Error ? error.message : error,
    )
    process.exitCode = 1
  })
  .finally(async () => {
    await disconnectFromDatabase()
  })
