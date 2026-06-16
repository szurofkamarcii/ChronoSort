"use client";

import React, { useState } from "react";
import { updateUserNickname, signOut } from "@/app/auth/actions";

export default function NicknameModal({ user }: { user: any }) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Csak akkor mutatjuk az ablakot, ha be van lépve a user, DE nincsen nickneve
  const needsNickname = user && !user.user_metadata?.nickname;

  if (!needsNickname) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateUserNickname(formData);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      // Sikeres mentés után újratöltjük az oldalt
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden p-8">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">
          Hogy hívjunk?
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6 font-medium">
          A teljes nevedet és az email címedet elrejtjük a világ elől. Adj meg
          egy egyedi nicknevet, amivel szerepelni fogsz a ranglistákon!
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 text-center">
              {error}
            </div>
          )}

          <div>
            <input
              type="text"
              name="nickname"
              required
              minLength={3}
              maxLength={20}
              autoComplete="off"
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-center text-lg"
              placeholder="Ide írd a neved..."
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md disabled:opacity-70 hover:-translate-y-1">
            {isLoading ? "Mentés..." : "Gyerünk játszani!"}
          </button>
        </form>

        <button
          onClick={() => signOut()}
          className="w-full mt-4 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors">
          Mégsem, inkább kijelentkezem
        </button>
      </div>
    </div>
  );
}
