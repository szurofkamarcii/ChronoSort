"use client";

import React, { useState, useEffect } from "react";
import { getContextualLeaderboard } from "@/app/actions/score";
import { getHungarianDateString } from "@/lib/dateUtils";

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string; // Hogy ki tudjuk emelni a jelenlegi játékost, ha be van lépve
}

export default function LeaderboardModal({
  isOpen,
  onClose,
  userId,
}: LeaderboardModalProps) {
  const [scores, setScores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const todayStr = getHungarianDateString();

      getContextualLeaderboard(todayStr, userId).then(
        (res: { success: boolean; data?: any[] }) => {
          if (res.success && res.data) {
            setScores(res.data);
          }
          setIsLoading(false);
        },
      );
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
        {/* Bezáró gomb */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors z-10">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="p-6 pb-4 border-b border-gray-100">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <svg
              className="w-6 h-6 text-yellow-500"
              fill="currentColor"
              viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 2a1 1 0 01.932.638l2.164 5.385 5.86.417a1 1 0 01.57 1.74l-4.48 3.865 1.34 5.688a1 1 0 01-1.49 1.082L10 17.51l-5.066 2.805a1 1 0 01-1.49-1.082l1.34-5.688-4.48-3.865a1 1 0 01.57-1.74l5.86-.417 2.164-5.385A1 1 0 0110 2z"
                clipRule="evenodd"
              />
            </svg>
            Napi Ranglista
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            A mai nap legjobb időrendi zsenijei.
          </p>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <svg
                className="w-8 h-8 animate-spin text-blue-500"
                fill="none"
                viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : scores.length === 0 ? (
            <div className="text-center py-10 text-gray-400 font-medium">
              Még senki sem teljesítette a mai kihívást elmentett eredménnyel.
              <br />
              Légy te az első!
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {scores.map((entry, idx) => {
                // Ha több mint 1 helyezésnyi ugrás van az előző elemhez képest, teszünk be egy elválasztót
                const isGap = idx > 0 && entry.rank > scores[idx - 1].rank + 1;

                return (
                  <React.Fragment key={entry.rank}>
                    {isGap && (
                      <div className="text-center text-gray-300 py-1 font-black text-xl leading-none">
                        ⋮
                      </div>
                    )}
                    <div
                      className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${entry.isCurrentUser ? "bg-blue-50 border-2 border-blue-400 shadow-md scale-[1.02] my-1" : "bg-gray-50 border border-gray-100"}`}>
                      <div
                        className={`w-8 h-8 flex items-center justify-center font-black rounded-full text-sm ${entry.rank === 1 ? "bg-yellow-400 text-yellow-900" : entry.rank === 2 ? "bg-gray-300 text-gray-800" : entry.rank === 3 ? "bg-orange-300 text-orange-900" : "bg-transparent text-gray-400"}`}>
                        {entry.rank}.
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p
                          className={`font-bold truncate text-sm leading-tight ${entry.isCurrentUser ? "text-blue-900" : "text-gray-900"}`}>
                          {entry.player_name || "Névtelen Játékos"}
                        </p>
                        <p
                          className={`text-xs font-medium leading-tight mt-0.5 ${entry.isCurrentUser ? "text-blue-600" : "text-gray-500"}`}>
                          {entry.attempts} tipp • {entry.time_seconds} mp
                        </p>
                      </div>
                      <div
                        className={`font-black text-lg ${entry.isCurrentUser ? "text-blue-700" : "text-blue-600"}`}>
                        {entry.score}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
