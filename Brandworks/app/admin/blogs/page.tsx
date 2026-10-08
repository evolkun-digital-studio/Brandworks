import { connection } from 'next/server'
import AdminBlogsClient from '../../../src/next/AdminBlogsClient'

export default async function AdminBlogsPage() {
  await connection()
  return <AdminBlogsClient />
}
