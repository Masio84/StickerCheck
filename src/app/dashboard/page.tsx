import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProgressBar } from "@/components/checklist/ProgressBar";
import { Plus, ScanLine } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: collections } = await supabase
    .from("collections")
    .select("*")
    .order("name");

  const { data: userCollections } = await supabase
    .from("user_collections")
    .select("collection_id")
    .eq("user_id", user.id);

  const userCollectionIds = new Set(
    userCollections?.map((uc) => uc.collection_id) ?? []
  );

  const progressByCollection: Record<string, number> = {};
  if (userCollectionIds.size > 0) {
    const { data: owned } = await supabase
      .from("user_stickers")
      .select("collection_id")
      .eq("user_id", user.id)
      .in("status", ["owned", "duplicate"]);

    owned?.forEach((s) => {
      progressByCollection[s.collection_id] =
        (progressByCollection[s.collection_id] || 0) + 1;
    });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-white">Mis Colecciones</h1>
        <p className="mt-2 text-slate-400">
          Gestiona y completa tus álbumes de cromos
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {collections?.map((collection) => {
            const isAdded = userCollectionIds.has(collection.id);
            const owned = progressByCollection[collection.id] || 0;

            return (
              <div
                key={collection.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6"
              >
                <h2 className="text-lg font-semibold text-white">
                  {collection.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {collection.total_count} cromos · {collection.year}
                </p>

                {isAdded ? (
                  <>
                    <div className="mt-4">
                      <ProgressBar
                        current={owned}
                        total={collection.total_count}
                      />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Link
                        href={`/collections/${collection.slug}`}
                        className="flex-1 rounded-lg bg-emerald-500 py-2 text-center text-sm font-medium text-white hover:bg-emerald-400"
                      >
                        Ver checklist
                      </Link>
                      <Link
                        href={`/collections/${collection.slug}/scan`}
                        className="rounded-lg border border-slate-600 p-2 text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
                        title="Escanear álbum"
                      >
                        <ScanLine className="h-5 w-5" />
                      </Link>
                    </div>
                  </>
                ) : (
                  <form
                    action={`/api/collections/${collection.slug}/add`}
                    method="post"
                    className="mt-4"
                  >
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600 py-3 text-sm text-slate-400 hover:border-emerald-500 hover:text-emerald-400"
                    >
                      <Plus className="h-4 w-4" />
                      Añadir colección
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
