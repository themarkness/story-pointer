import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-6xl mb-4">🃏</p>
        <h1 className="text-3xl font-bold mb-2">Page not found</h1>
        <p className="text-slate-400 mb-6">This page doesn&apos;t exist.</p>
        <Link href="/" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-colors">
          Back to Home
        </Link>
      </div>
    </main>
  );
}
