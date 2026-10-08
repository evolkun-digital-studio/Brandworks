'use client'

import { EditorialIndexPage } from '../editorial/EditorialPages'
import type { EditorialKind } from '../editorial/types'

export default function EditorialIndexClient({ kind }: { kind: EditorialKind }) {
  return <EditorialIndexPage kind={kind} manageMetadata={false} />
}
