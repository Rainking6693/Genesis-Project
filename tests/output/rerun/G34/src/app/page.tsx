import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Test_G34',
  description: 'Test: File upload API',
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Test_G34</h1>
      <p className="mt-4 text-lg">Test: File upload API</p>
    </main>
  )
}
