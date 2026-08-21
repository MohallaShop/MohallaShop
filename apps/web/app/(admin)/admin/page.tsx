import { redirect } from 'next/navigation'

/** /admin has no dashboard of its own — land users on the real one. */
export default function AdminIndexPage() {
  redirect('/admin/dashboard')
}
