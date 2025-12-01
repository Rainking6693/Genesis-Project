import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Test_M04',
  description: 'Perform security analysis',
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Test_M04</h1>
      <p className="mt-4 text-lg">Perform security analysis</p>
    </main>
  )
}
