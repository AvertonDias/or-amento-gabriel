
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/orcamento') // Redirect to the main budget page
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center">
      <p>Redirecionando...</p>
    </div>
  )
}
