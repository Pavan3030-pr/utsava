import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      <header className="h-16 border-b border-gray-100 bg-white flex items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a73e8] to-[#0d47a1] flex items-center justify-center text-white font-bold text-sm">
            उ
          </div>
          <span className="font-semibold text-gray-900">Utsava</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="card-premium p-8">
            <h1 className="text-2xl font-semibold text-gray-900 text-center">
              Create your account
            </h1>
            <p className="mt-2 text-center text-gray-600 text-sm">
              Start planning beautiful celebrations in minutes
            </p>

            <form className="mt-8 space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Priya Sharma"
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>
              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#1a73e8] text-white font-medium hover:bg-[#1557b0] transition-colors shadow-sm"
              >
                Create account
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="text-[#1a73e8] font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
