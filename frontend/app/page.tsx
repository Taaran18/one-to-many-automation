import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-900 font-sans p-4">
      <main className="w-full max-w-2xl bg-white rounded-2xl p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col items-center text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Welcome to the Platform
        </h1>
        <p className="text-lg text-gray-500 mb-8 max-w-md">
          This is your private dashboard. Authentication and styling are already
          fully wired up!
        </p>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="flex h-11 items-center justify-center rounded-lg bg-black px-6 text-sm font-medium text-white transition-all hover:bg-gray-800 active:scale-[0.98]"
          >
            Go to Login
          </Link>
        </div>
      </main>
    </div>
  );
}
