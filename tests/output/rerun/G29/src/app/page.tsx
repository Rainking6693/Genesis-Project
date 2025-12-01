import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Test_G29',
  description: 'Test: Subscription',
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Test_G29</h1>
      <p className="mt-4 text-lg">Test: Subscription</p>
    </main>
  )
}
