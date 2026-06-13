import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { LogOut, Plus, Sticker } from "lucide-react";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500">
            <Sticker className="h-5 w-5 text-white" />
          </div>
          <span>StickerCheck</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          {user && (
            <>
              <Link href="/dashboard" className="hover:text-emerald-400 transition-colors">
                Mis Colecciones
              </Link>
              <Link href="/dashboard" className="hover:text-emerald-400 transition-colors">
                Ayuda
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="hidden rounded-lg bg-emerald-500 p-2 text-white hover:bg-emerald-400 sm:flex"
              >
                <Plus className="h-4 w-4" />
              </Link>
              <span className="hidden text-sm text-slate-400 sm:block">
                {user.email?.split("@")[0]}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-slate-500 hover:text-white"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:text-white"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400"
              >
                Registro
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
