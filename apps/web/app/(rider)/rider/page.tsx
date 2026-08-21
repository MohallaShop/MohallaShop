import { redirect } from 'next/navigation'

/** /rider has no dashboard of its own — land users on the real one. */
export default function RiderIndexPage() {
  redirect('/rider/dashboard')
}
