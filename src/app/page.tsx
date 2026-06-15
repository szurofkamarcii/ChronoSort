import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import UserMenu from "@/components/UserMenu";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-200 flex flex-col items-center justify-center p-4 font-sans selection:bg-blue-200">
      {/* Fejléc & Logó */}
      <div className="mb-10 text-center mt-8 md:mt-0">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg flex items-center justify-center transform -rotate-3 hover:rotate-0 transition-transform">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-2">
          ChronoSort
        </h1>
        <p className="text-gray-500 font-medium">
          Rendezd időrendbe a történelmet!
        </p>
      </div>

      {/* Bekötöttük az interaktív Felhasználói Menüt */}
      <UserMenu user={user} />

      {/* Játékmódok konténere */}
      <div className="w-full max-w-sm flex flex-col gap-5">
        {/* Napi Kihívás Kártya */}
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-blue-900/5 border border-blue-50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  Napi Kihívás
                </h2>
                <p className="text-sm text-gray-500 font-medium">{today}</p>
              </div>
            </div>

            <Link
              href="/daily"
              className="block w-full text-center py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-95">
              Játék Indítása
            </Link>

            <button className="w-full mt-3 py-3 text-blue-600 font-semibold text-sm rounded-2xl bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Korábbi napok
            </button>
          </div>
        </div>

        {/* Végtelen Mód Kártya (Inaktív) */}
        <div className="bg-gray-50 rounded-3xl p-6 border-2 border-dashed border-gray-200 relative">
          <div className="flex justify-between items-center mb-6 opacity-60">
            <div>
              <h2 className="text-xl font-bold text-gray-700 mb-1 flex items-center gap-2">
                Végtelen Mód
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Gyakorlás téma alapján
              </p>
            </div>
            <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
              Hamarosan
            </span>
          </div>
          <button
            disabled
            className="w-full py-4 bg-gray-200 text-gray-400 font-bold text-lg rounded-2xl cursor-not-allowed">
            Zárolva
          </button>
        </div>
      </div>

      {/* Alsó Menü Sáv */}
      <div className="mt-12 mb-8 flex items-center gap-6 text-sm font-medium text-gray-500">
        <button className="hover:text-gray-900 transition-colors flex flex-col items-center gap-1">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          Ranglista
        </button>
        <button className="hover:text-gray-900 transition-colors flex flex-col items-center gap-1">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
            />
          </svg>
          Nyelv
        </button>
        <button className="hover:text-gray-900 transition-colors flex flex-col items-center gap-1">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Súgó
        </button>
      </div>
    </main>
  );
}
