import Link from "next/link";
import {
  Camera,
  CheckCircle,
  Search,
  BarChart3,
  Copy,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const features = [
  {
    icon: Camera,
    title: "Scanner de álbum",
    description:
      "Fotografía una página y detecta automáticamente los cromos que ya pegaste.",
  },
  {
    icon: CheckCircle,
    title: "Control total",
    description:
      "Marca el estado de cada cromo: tengo, falta o repetido. Progreso en tiempo real.",
  },
  {
    icon: Search,
    title: "Búsqueda inteligente",
    description:
      "Encuentra cualquier cromo en segundos con filtros y búsqueda instantánea.",
  },
  {
    icon: BarChart3,
    title: "Estadísticas",
    description:
      "Conoce tu porcentaje de completado y cuántos cromos te faltan.",
  },
  {
    icon: Copy,
    title: "Repetidos",
    description:
      "Registra cuántos repetidos tienes de cada cromo para intercambios.",
  },
  {
    icon: Sparkles,
    title: "100% Gratis",
    description: "Sin pagos ocultos. Todas las funciones disponibles gratis.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent" />
          <div className="relative mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              La forma más fácil de completar tus{" "}
              <span className="text-emerald-400">colecciones de cromos</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
              Lleva un seguimiento exacto de los cromos que tienes, los que te
              faltan y los que te sobran. Escanea tu álbum y márcalos
              automáticamente.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="rounded-xl bg-emerald-500 px-8 py-3 font-semibold text-white hover:bg-emerald-400"
              >
                Crear mi checklist gratis
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-slate-700 px-8 py-3 font-semibold text-slate-300 hover:border-slate-500 hover:text-white"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-800 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-white">
              ¿Por qué elegir StickerCheck?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-slate-400">
              Diseñado para coleccionistas que quieren llevar un control
              profesional de sus cromos
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                    <feature.icon className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-800 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-white">
              Empieza en menos de un minuto
            </h2>
            <div className="mt-12 space-y-8 text-left">
              {[
                { step: "1", title: "Crea tu cuenta gratis", desc: "Regístrate para guardar tus colecciones de forma segura." },
                { step: "2", title: "Añade tu colección", desc: "Empieza con el Mundial 2026 Panini y más próximamente." },
                { step: "3", title: "¡A marcar!", desc: "Marca manualmente o escanea tu álbum con la cámara." },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 font-bold text-white">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{item.title}</h3>
                    <p className="text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/register"
              className="mt-12 inline-block rounded-xl bg-emerald-500 px-8 py-3 font-semibold text-white hover:bg-emerald-400"
            >
              Crear mi primer checklist
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
