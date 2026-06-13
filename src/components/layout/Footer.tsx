import Link from "next/link";
import { Sticker } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-800 bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2 text-slate-400">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
            <Sticker className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="font-semibold text-white">StickerCheck</span>
        </div>
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} StickerCheck. Todos los derechos reservados.
        </p>
        <div className="flex gap-4 text-sm text-slate-500">
          <Link href="#" className="hover:text-slate-300">Privacidad</Link>
          <Link href="#" className="hover:text-slate-300">Términos</Link>
        </div>
      </div>
    </footer>
  );
}
