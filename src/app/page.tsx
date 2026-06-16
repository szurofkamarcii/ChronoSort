import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import UserMenu from "@/components/UserMenu";
import FooterMenu from "@/components/FooterMenu";
import NicknameModal from "@/components/NicknameModal";
import Countdown from "@/components/Countdown";
import DailyCardButtons from "@/components/DailyCardButtons";

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
                <Countdown />
              </div>
            </div>

            <DailyCardButtons />
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
      <FooterMenu />
      <NicknameModal user={user} />
    </main>
  );
}
