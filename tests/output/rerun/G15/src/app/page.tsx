import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Test_G15',
  description: 'Test: Project management',
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Test_G15</h1>
      <p className="mt-4 text-lg">Test: Project management</p>
    </main>
  )
}
