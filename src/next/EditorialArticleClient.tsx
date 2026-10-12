'use client'

import { EditorialArticlePage } from '../editorial/EditorialPages'
import type { EditorialKind } from '../editorial/types'

export default function EditorialArticleClient({ kind }: { kind: EditorialKind }) {
  return <EditorialArticlePage kind={kind} manageMetadata={false} />
}
