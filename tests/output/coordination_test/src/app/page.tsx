import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TestBusiness',
  description: 'Full business component generation',
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">TestBusiness</h1>
      <p className="mt-4 text-lg">Full business component generation</p>
    </main>
  )
}
