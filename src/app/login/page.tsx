import Link from "next/link";
import { login } from "@/app/auth/actions";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-2xl font-bold text-white">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-slate-400">
            Accede a tu checklist de cromos
          </p>

          {params.error && (
            <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {params.error}
            </p>
          )}

          <form action={login} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-400">Email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Contraseña</label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-500 py-2.5 font-medium text-white hover:bg-emerald-400"
            >
              Entrar
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-emerald-400 hover:underline">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
