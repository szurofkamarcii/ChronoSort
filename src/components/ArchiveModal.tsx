"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getArchiveStats } from "@/app/actions/score";
import { getHungarianDateString } from "@/lib/dateUtils";

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ArchiveModal({ isOpen, onClose }: ArchiveModalProps) {
  const router = useRouter();
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [userScores, setUserScores] = useState<
    Record<string, { won: boolean; score: number }>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getArchiveStats().then((res) => {
        if (res.success) {
          setAvailableDates(res.availableDates || []);
          setUserScores(res.userScores || {});
        }
        setIsLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const todayStr = getHungarianDateString();

  // Csoportosítás YYYY-MM formátum alapján
  const monthsSet = new Set<string>();
  availableDates.forEach((d) => monthsSet.add(d.substring(0, 7)));
  monthsSet.add(todayStr.substring(0, 7)); // A jelenlegi hónap mindenképp legyen benne

  // Rendezzük a hónapokat csökkenő sorrendbe (legújabb legfelül)
  const sortedMonths = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));

  const monthNames = [
    "Január",
    "Február",
    "Március",
    "Április",
    "Május",
    "Június",
    "Július",
    "Augusztus",
    "Szeptember",
    "Október",
    "November",
    "December",
  ];
  const weekDays = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
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
              className="w-6 h-6 text-blue-500"
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
            Archívum
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Játssz újra a korábbi napok feladványaival!
          </p>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
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
          ) : (
            <div className="flex flex-col gap-8">
              {sortedMonths.map((monthStr) => {
                const [year, monthNum] = monthStr.split("-").map(Number);
                // Kiszámoljuk a napok számát és az első napot (0=Hétfő, 6=Vasárnap)
                const daysInMonth = new Date(year, monthNum, 0).getDate();
                let firstDayIndex = new Date(year, monthNum - 1, 1).getDay();
                firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

                const blanks = Array.from(
                  { length: firstDayIndex },
                  (_, i) => i,
                );
                const days = Array.from(
                  { length: daysInMonth },
                  (_, i) => i + 1,
                );

                return (
                  <div
                    key={monthStr}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-black text-gray-800 mb-4 capitalize text-center">
                      {year}. {monthNames[monthNum - 1]}
                    </h3>

                    {/* Naptár Fejléc */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {weekDays.map((d) => (
                        <div
                          key={d}
                          className="text-center text-[10px] font-black text-gray-400">
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Naptár Rács */}
                    <div className="grid grid-cols-7 gap-1.5 md:gap-2">
                      {blanks.map((b) => (
                        <div key={`blank-${b}`} className="aspect-square" />
                      ))}

                      {days.map((day) => {
                        const dateStr = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const isFuture = dateStr > todayStr;
                        const isAvailable = availableDates.includes(dateStr);
                        const isPlayed = !!userScores[dateStr];
                        const isWon = userScores[dateStr]?.won;

                        // Osztályok összeállítása az állapot alapján
                        let btnClass =
                          "relative flex items-center justify-center w-full aspect-square rounded-xl text-sm font-bold transition-all ";

                        if (isFuture) {
                          btnClass += "text-transparent pointer-events-none"; // Jövőbeli napok teljesen láthatatlanok a naptár végén
                        } else if (!isAvailable) {
                          btnClass +=
                            "text-gray-300 bg-gray-50 pointer-events-none"; // Nincs még feladvány
                        } else if (isPlayed) {
                          if (isWon) {
                            btnClass +=
                              "bg-green-100 text-green-800 border-2 border-green-400 hover:bg-green-200 cursor-pointer hover:scale-105 shadow-sm";
                          } else {
                            btnClass +=
                              "bg-red-50 text-red-700 border-2 border-red-300 hover:bg-red-100 cursor-pointer hover:scale-105 shadow-sm opacity-90";
                          }
                        } else {
                          btnClass +=
                            "bg-white text-gray-800 border-2 border-gray-200 hover:border-blue-400 hover:text-blue-600 cursor-pointer hover:scale-105 shadow-sm";
                        }

                        return (
                          <button
                            key={dateStr}
                            disabled={!isAvailable || isFuture}
                            onClick={() =>
                              router.push(`/daily?date=${dateStr}`)
                            }
                            className={btnClass}>
                            <span>{day}</span>

                            {/* Ikonok a sarkokba ha játszott */}
                            {isPlayed && (
                              <span className="absolute -bottom-1 -right-1 text-[12px] filter drop-shadow-sm">
                                {isWon ? "🏆" : "💀"}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
