import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Test_G25',
  description: 'Generated for test: Product search and filters',
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Test_G25</h1>
      <p className="mt-4 text-lg">Generated for test: Product search and filters</p>
    </main>
  )
}
