"use client";

import React, { useState } from "react";
import Link from "next/link";
import ArchiveModal from "./ArchiveModal";

export default function DailyCardButtons() {
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  return (
    <>
      <Link
        href="/daily"
        className="block w-full text-center py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-95">
        Játék Indítása
      </Link>

      <button
        onClick={() => setIsArchiveOpen(true)}
        className="w-full mt-3 py-3 text-blue-600 font-semibold text-sm rounded-2xl bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
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

      <ArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
      />
    </>
  );
}
