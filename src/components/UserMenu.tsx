"use client";

import React, { useState } from "react";
import AuthModal from "./AuthModal";
import { signOut } from "@/app/auth/actions";

export default function UserMenu({ user }: { user: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Ha be van jelentkezve, a profilját mutatjuk
  if (user) {
    return (
      <div className="mb-8 w-full max-w-sm flex flex-col items-center gap-3 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 w-full px-2">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold shadow-inner">
            {user.email?.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold text-gray-900 truncate">
              {user.email}
            </p>
            <p className="text-xs text-gray-500">Játékos</p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="w-full py-2.5 bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 text-sm font-bold rounded-xl transition-colors border border-gray-100 hover:border-red-100">
          Kijelentkezés
        </button>
      </div>
    );
  }

  // Ha nincs bejelentkezve, a belépés gombot mutatjuk
  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="mb-8 w-full max-w-sm flex items-center justify-center gap-3 bg-white px-6 py-4 rounded-full shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all active:scale-95 group">
        <div className="w-8 h-8 bg-gray-100 group-hover:bg-blue-50 rounded-full flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors">
          <svg
            className="w-4 h-4"
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
        <span className="text-gray-700 font-bold group-hover:text-blue-600 transition-colors">
          Bejelentkezés / Regisztráció
        </span>
      </button>

      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
