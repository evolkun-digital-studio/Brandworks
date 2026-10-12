import { describe, expect, it, vi } from 'vitest'
import { publishDueScheduledDocuments } from './blog-jobs'

describe('publishDueScheduledDocuments',()=>{
  it('atomically publishes only active due scheduled drafts and is idempotent',async()=>{
    const updateMany=vi.fn().mockResolvedValueOnce({modifiedCount:1}).mockResolvedValueOnce({modifiedCount:0})
    const db={collection:vi.fn(()=>({updateMany}))}
    const now=new Date('2026-10-08T00:00:00.000Z')
    expect(await publishDueScheduledDocuments(db as never,now)).toBe(1)
    expect(await publishDueScheduledDocuments(db as never,now)).toBe(0)
    expect(updateMany).toHaveBeenCalledWith(
      {status:'draft',scheduledAt:{$type:'date',$lte:now},deletedAt:null},
      [{$set:{status:'published',publishedAt:'$scheduledAt',scheduledAt:null,updatedAt:now}}],
    )
  })
})
