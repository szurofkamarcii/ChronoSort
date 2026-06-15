"use client";

import React, { useState, useEffect, forwardRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { saveDailyScore } from "@/app/actions/score";
import AuthModal from "./AuthModal";

type CardData = {
  id: string;
  image_url: string;
  date: string;
  title: string;
  description: string;
};

type CardStatus = "correct" | "incorrect" | "none";

interface GameBoardProps {
  initialCards: CardData[];
  user?: any | null;
}

const MAX_ATTEMPTS = 5;

// --- BUTA KÁRTYA KOMPONENS (UI) ---
interface CardViewProps extends React.HTMLAttributes<HTMLDivElement> {
  card: CardData;
  status: CardStatus;
  index: number;
  isOverlay?: boolean;
  isPlaceholder?: boolean;
  isManualLocked?: boolean;
  showMobileInfo?: boolean;
  onToggleInfo?: () => void;
}

const CardView = forwardRef<HTMLDivElement, CardViewProps>(
  (
    {
      card,
      status,
      index,
      isOverlay,
      isPlaceholder,
      isManualLocked,
      showMobileInfo,
      onToggleInfo,
      style,
      ...props
    },
    ref,
  ) => {
    const isCorrectLocked = status === "correct";
    const isLocked = isCorrectLocked || isManualLocked;
    const isEven = index % 2 === 0;

    let baseStyle = "border-gray-200 bg-white shadow-sm";
    if (isCorrectLocked)
      baseStyle =
        "border-green-500 border-4 md:border-4 bg-green-50 shadow-green-200";
    else if (isManualLocked)
      baseStyle =
        "border-blue-400 border-[3px] md:border-4 bg-blue-50 shadow-blue-100";
    else if (status === "incorrect")
      baseStyle = "border-red-500 border-2 bg-red-50 shadow-red-100";

    if (isOverlay)
      baseStyle += " shadow-2xl scale-105 rotate-2 cursor-grabbing z-50";
    if (isPlaceholder) baseStyle += " opacity-30";

    return (
      <div
        ref={ref}
        style={style}
        className={`group relative flex items-center rounded-xl md:rounded-2xl w-full h-16 md:w-36 md:h-36 flex-shrink-0 md:justify-center select-none touch-none transition-shadow ${baseStyle} ${
          isLocked
            ? "cursor-default"
            : !isOverlay
              ? "cursor-grab hover:shadow-lg hover:-translate-y-1 transition-transform"
              : ""
        }`}
        {...props}>
        <div className="flex md:hidden h-full w-full items-center p-1.5 gap-2 overflow-hidden relative">
          <img
            src={card.image_url}
            alt={card.title}
            className="w-12 h-12 object-cover rounded-lg flex-shrink-0 shadow-sm"
            draggable={false}
          />
          <div className="flex flex-col justify-center overflow-hidden flex-1">
            <span className="font-bold text-[11px] leading-tight text-gray-800 line-clamp-3">
              {card.title}
            </span>
          </div>

          {!isOverlay && !isPlaceholder && (
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                onToggleInfo?.();
              }}
              className="p-1.5 mr-1 text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full hover:bg-indigo-100 transition-colors shadow-sm z-10">
              <svg
                className="w-4 h-4"
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
            </button>
          )}

          {showMobileInfo && !isOverlay && !isPlaceholder && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-30 p-2 pt-6 flex flex-col justify-center rounded-xl shadow-inner text-center border border-indigo-100">
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onToggleInfo?.();
                }}
                className="absolute top-1 left-1 text-gray-500 p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                <svg
                  className="w-4 h-4"
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
              <span className="font-bold text-[11px] leading-tight text-gray-900 mb-0.5">
                {card.title}
              </span>
              <span className="text-[10px] leading-tight text-gray-600 line-clamp-2">
                {card.description}
              </span>
            </div>
          )}
        </div>

        <div className="hidden md:flex h-full w-full p-2 relative overflow-hidden rounded-2xl">
          <img
            src={card.image_url}
            alt={card.title}
            className={`w-full h-full object-cover rounded-xl pointer-events-none transition-transform duration-500 ${isLocked ? "scale-110 opacity-70" : "group-hover:scale-110"}`}
            draggable={false}
          />
          {isCorrectLocked && (
            <div className="absolute inset-0 bg-green-500/20 rounded-xl pointer-events-none"></div>
          )}
        </div>

        {!isOverlay && !isPlaceholder && (
          <div
            className={`hidden md:flex absolute left-1/2 -translate-x-1/2 w-64 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-gray-100 flex-col gap-2 opacity-0 group-hover:opacity-100 group-hover:-translate-y-2 transition-all duration-300 pointer-events-none z-[100] ${
              isEven ? "bottom-[calc(100%+15px)]" : "top-[calc(100%+15px)]"
            }`}>
            <span className="font-extrabold text-sm text-gray-900 text-center leading-tight">
              {card.title}
            </span>
            <span className="text-xs text-gray-600 text-center">
              {card.description}
            </span>
            <div
              className={`absolute left-1/2 -translate-x-1/2 border-8 border-transparent ${
                isEven
                  ? "top-full border-t-white/95"
                  : "bottom-full border-b-white/95"
              }`}></div>
          </div>
        )}
      </div>
    );
  },
);
CardView.displayName = "CardView";

// --- SORTABLE WRAPPER ---
function SortableCard({ card, index, status, isManualLocked, disabled }: any) {
  const [showMobileInfo, setShowMobileInfo] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    disabled, // Letiltja a DND-t cooldown alatt
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <CardView
      ref={setNodeRef}
      style={style}
      card={card}
      index={index}
      status={status}
      isPlaceholder={isDragging}
      isManualLocked={isManualLocked}
      showMobileInfo={showMobileInfo}
      onToggleInfo={() => setShowMobileInfo(!showMobileInfo)}
      {...attributes}
      {...listeners}
    />
  );
}

// --- FŐ JÁTÉKTÉR KOMPONENS ---
export default function GameBoard({
  initialCards,
  user = null,
}: GameBoardProps) {
  const [cards, setCards] = useState<CardData[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [cardStatuses, setCardStatuses] = useState<Record<string, CardStatus>>(
    {},
  );

  const [manualLocks, setManualLocks] = useState<Record<number, boolean>>({});
  const [attemptsLog, setAttemptsLog] = useState<string[][]>([]);
  const [isLogDropdownOpen, setIsLogDropdownOpen] = useState(false);

  // Új állapotok
  const [isWon, setIsWon] = useState(false);
  const [isLost, setIsLost] = useState(false);
  const [cooldown, setCooldown] = useState(0); // Másodpercben
  const [startTime, setStartTime] = useState<number>(0);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [timeTaken, setTimeTaken] = useState<number>(0);

  const [copied, setCopied] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (!initialCards || initialCards.length === 0) return;

    let shuffled = [...initialCards];
    let isDerangement = false;
    let attempts = 0;

    while (!isDerangement && attempts < 20) {
      shuffled = [...initialCards].sort(() => 0.5 - Math.random());
      isDerangement = shuffled.every(
        (card, i) => card.id !== initialCards[i].id,
      );
      attempts++;
    }

    setCards(shuffled);
    setIsClient(true);
    setStartTime(Date.now());
  }, [initialCards]);

  // Cooldown időzítő
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // LocalStorage szinkronizáció login után
  useEffect(() => {
    if (user && isClient) {
      const pendingScoreStr = localStorage.getItem("pending_score");
      if (pendingScoreStr) {
        try {
          const pendingScore = JSON.parse(pendingScoreStr);
          const todayStr = new Date().toISOString().split("T")[0];

          if (pendingScore.date === todayStr) {
            setIsSaving(true);
            saveDailyScore(
              pendingScore.attempts,
              pendingScore.score,
              pendingScore.time_seconds,
              todayStr,
            ).then((res) => {
              if (res.success) {
                setScoreSaved(true);
                localStorage.removeItem("pending_score");
              }
              setIsSaving(false);
            });
          } else {
            localStorage.removeItem("pending_score");
          }
        } catch (e) {
          localStorage.removeItem("pending_score");
        }
      }
    }
  }, [user, isClient]);

  const isIndexLocked = (idx: number) => {
    return manualLocks[idx] || cardStatuses[cards[idx]?.id] === "correct";
  };

  const toggleManualLock = (idx: number) => {
    if (cooldown > 0 || isWon || isLost) return; // Nem lehet lockolni időzár alatt
    if (cardStatuses[cards[idx].id] === "correct") return;
    setManualLocks((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (cooldown > 0 || isWon || isLost) return;
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    if (cooldown > 0 || isWon || isLost) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setCards((prevCards) => {
      const unlockedCards: CardData[] = [];
      const lockedMap = new Map<number, CardData>();

      prevCards.forEach((c, idx) => {
        if (isIndexLocked(idx)) {
          lockedMap.set(idx, c);
        } else {
          unlockedCards.push(c);
        }
      });

      const oldUnlockedIdx = unlockedCards.findIndex((c) => c.id === active.id);
      const newUnlockedIdx = unlockedCards.findIndex((c) => c.id === over.id);

      if (oldUnlockedIdx === -1 || newUnlockedIdx === -1) return prevCards;

      const reorderedUnlocked = arrayMove(
        unlockedCards,
        oldUnlockedIdx,
        newUnlockedIdx,
      );

      const newCards: CardData[] = [];
      let unlockedCounter = 0;

      for (let i = 0; i < prevCards.length; i++) {
        if (lockedMap.has(i)) {
          newCards.push(lockedMap.get(i)!);
        } else {
          newCards.push(reorderedUnlocked[unlockedCounter++]);
        }
      }
      return newCards;
    });

    setCardStatuses((prev) => {
      const next = { ...prev };
      if (next[active.id as string] === "incorrect")
        next[active.id as string] = "none";
      return next;
    });
  };

  const handleCheck = () => {
    if (isWon || isLost || cooldown > 0) return;

    const newStatuses: Record<string, CardStatus> = { ...cardStatuses };
    let correctCount = 0;
    const currentAttemptLog: string[] = [];

    cards.forEach((card, index) => {
      if (
        newStatuses[card.id] === "correct" &&
        card.id === initialCards[index].id
      ) {
        correctCount++;
        currentAttemptLog.push("🟢");
        return;
      }

      const isCorrect = card.id === initialCards[index].id;
      newStatuses[card.id] = isCorrect ? "correct" : "incorrect";
      currentAttemptLog.push(isCorrect ? "🟢" : "🔴");

      if (isCorrect) correctCount++;
    });

    setCardStatuses(newStatuses);

    const updatedAttemptsLog = [...attemptsLog, currentAttemptLog];
    setAttemptsLog(updatedAttemptsLog);
    setIsLogDropdownOpen(false);

    // Számítások
    const endTime = Date.now();
    const elapsedSeconds = Math.floor((endTime - startTime) / 1000);
    const totalAttempts = updatedAttemptsLog.length;

    if (correctCount === cards.length) {
      // GYŐZELEM
      setIsWon(true);
      const calculatedScore = Math.max(
        0,
        10000 - (totalAttempts - 1) * 1000 - elapsedSeconds * 10,
      );
      setFinalScore(calculatedScore);
      setTimeTaken(elapsedSeconds);

      saveScoreToDBorLocal(totalAttempts, calculatedScore, elapsedSeconds);
    } else {
      // HIBÁS TIPP
      if (totalAttempts >= MAX_ATTEMPTS) {
        // JÁTÉK VÉGE (Vereség)
        setIsLost(true);
        setFinalScore(0);
        setTimeTaken(elapsedSeconds);

        // Felfedjük a helyes sorrendet
        setCards([...initialCards]);
        const allCorrectStatuses: Record<string, CardStatus> = {};
        initialCards.forEach((c) => (allCorrectStatuses[c.id] = "correct"));
        setCardStatuses(allCorrectStatuses);

        saveScoreToDBorLocal(totalAttempts, 0, elapsedSeconds);
      } else {
        // Időzár beállítása (5mp)
        setCooldown(5);
      }
    }
  };

  const saveScoreToDBorLocal = (
    attempts: number,
    score: number,
    time: number,
  ) => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (user) {
      setIsSaving(true);
      saveDailyScore(attempts, score, time, todayStr).then((res) => {
        if (res.success) setScoreSaved(true);
        setIsSaving(false);
      });
    } else {
      localStorage.setItem(
        "pending_score",
        JSON.stringify({
          attempts: attempts,
          score: score,
          time_seconds: time,
          date: todayStr,
        }),
      );
    }
  };

  const generateShareText = () => {
    const grid = attemptsLog.map((log) => log.join("")).join("\n");
    const todayStr = new Date().toLocaleDateString("hu-HU");
    const resultText = isWon
      ? `${finalScore} pont (${attemptsLog.length}/5 próbálkozás, ${timeTaken}mp)`
      : `Elbukott (0 pont)`;
    return `ChronoSort - ${todayStr}\nEredmény: ${resultText}\n\n${grid}\n\nJátssz te is: https://chronosort.app`;
  };

  const handleShareClick = async () => {
    const textToShare = generateShareText();

    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: "ChronoSort Eredmény",
          text: textToShare,
        });
        return;
      } catch (err) {
        console.log("Natív megosztás elvetve");
      }
    }
    setIsShareModalOpen(true);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateShareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Sikertelen másolás", err);
    }
  };

  const handleSocialShare = async (platform: string) => {
    const text = generateShareText();
    const encodedText = encodeURIComponent(text);
    const url = "https://chronosort.app";
    const encodedUrl = encodeURIComponent(url);

    if (["facebook", "messenger", "instagram"].includes(platform)) {
      await copyToClipboard();
    }

    switch (platform) {
      case "twitter":
        window.open(
          `https://twitter.com/intent/tweet?text=${encodedText}`,
          "_blank",
        );
        break;
      case "whatsapp":
        window.open(
          `https://api.whatsapp.com/send?text=${encodedText}`,
          "_blank",
        );
        break;
      case "telegram":
        window.open(
          `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
          "_blank",
        );
        break;
      case "facebook":
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
          "_blank",
        );
        break;
      case "messenger":
        window.open(
          `http://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=YOUR_APP_ID&redirect_uri=${encodedUrl}`,
          "_blank",
        );
        break;
      case "instagram":
        window.open("https://instagram.com", "_blank");
        break;
    }
  };

  const activeCard = cards.find((c) => c.id === activeId);
  const sortableIds = cards
    .filter((_, i) => !isIndexLocked(i))
    .map((c) => c.id);

  if (!isClient)
    return (
      <div className="animate-pulse h-64 w-full max-w-5xl bg-gray-200 rounded-3xl mx-auto"></div>
    );

  return (
    <div className="w-full flex flex-col items-center">
      {/* Cím alatti info az életekről */}
      {!isWon && !isLost && (
        <div className="mb-4 text-sm font-bold text-gray-500 bg-white/50 px-4 py-2 rounded-full border border-gray-200">
          Próbálkozások:{" "}
          <span className="text-gray-900">
            {attemptsLog.length} / {MAX_ATTEMPTS}
          </span>
        </div>
      )}

      <div className="hidden md:flex mb-12 flex-col items-center gap-2">
        {attemptsLog.map((log, i) => (
          <div
            key={i}
            className="flex gap-2 bg-white/50 p-2 rounded-xl shadow-sm border border-gray-100">
            {log.map((emoji, j) => (
              <span key={j} className="text-2xl drop-shadow-sm">
                {emoji}
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="md:hidden relative z-30 mb-4 h-10 flex justify-center w-full">
        {attemptsLog.length > 0 && (
          <div className="relative flex flex-col items-center">
            <button
              onClick={() => setIsLogDropdownOpen(!isLogDropdownOpen)}
              className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-gray-200 hover:bg-gray-50 hover:shadow transition-all">
              <div className="flex gap-0.5">
                {attemptsLog[attemptsLog.length - 1].map((emoji, j) => (
                  <span key={j} className="text-xs drop-shadow-sm">
                    {emoji}
                  </span>
                ))}
              </div>
              <div className="flex items-center text-[10px] font-semibold text-gray-500 pl-1 border-l border-gray-300">
                {attemptsLog.length}. tipp
                <svg
                  className={`w-3 h-3 ml-1 transition-transform ${isLogDropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {isLogDropdownOpen && attemptsLog.length > 1 && (
              <div className="absolute top-full mt-2 w-max bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-xl p-3 flex flex-col gap-2 max-h-48 overflow-y-auto">
                {attemptsLog.slice(0, -1).map((log, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-4 text-xs">
                    <span className="text-gray-400 font-medium">{i + 1}.</span>
                    <div className="flex gap-1">
                      {log.map((emoji, j) => (
                        <span key={j} className="drop-shadow-sm">
                          {emoji}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className={`relative w-full max-w-sm md:max-w-6xl mx-auto px-4 md:p-4 flex justify-center transition-opacity ${cooldown > 0 ? "opacity-80" : ""}`}>
        <div className="absolute inset-0 flex flex-col md:flex-row gap-2 md:gap-6 items-center justify-center px-4 md:p-4 z-20 pointer-events-none">
          {cards.map((_, index) => {
            const isCorrect = cardStatuses[cards[index].id] === "correct";
            const isManual = manualLocks[index];
            const locked = isCorrect || isManual;

            return (
              <div
                key={`lock-${index}`}
                className="relative w-full h-16 md:w-36 md:h-36 flex-shrink-0 flex items-start justify-end md:justify-center">
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => !isCorrect && toggleManualLock(index)}
                  className={`pointer-events-auto absolute -top-2 -right-1.5 md:-top-3 md:-right-3 w-6 h-6 md:w-8 md:h-8 flex items-center justify-center bg-white rounded-full shadow-md border transition-transform hover:scale-110 active:scale-95 ${
                    isCorrect
                      ? "border-green-500 text-green-500"
                      : isManual
                        ? "border-blue-500 text-blue-500 bg-blue-50"
                        : "border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-300"
                  } ${cooldown > 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={isCorrect || cooldown > 0 || isWon || isLost}
                  title={isCorrect ? "Helyes pozíció" : "Zárol"}>
                  {isCorrect ? (
                    <svg
                      className="w-3 h-3 md:w-4 md:h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : locked ? (
                    <svg
                      className="w-3 h-3 md:w-4 md:h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-3 h-3 md:w-4 md:h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}>
          <div className="flex flex-col md:flex-row gap-2 md:gap-6 items-center justify-center w-full z-10">
            <div className="hidden md:block absolute top-1/2 left-8 right-8 h-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 -translate-y-1/2 z-0 rounded-full shadow-inner pointer-events-none"></div>

            <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
              {cards.map((card, index) => {
                const locked = isIndexLocked(index);
                if (locked) {
                  return (
                    <CardView
                      key={card.id}
                      card={card}
                      index={index}
                      status={cardStatuses[card.id] || "none"}
                      isManualLocked={manualLocks[index]}
                    />
                  );
                }
                return (
                  <SortableCard
                    key={card.id}
                    card={card}
                    index={index}
                    status={cardStatuses[card.id] || "none"}
                    isManualLocked={manualLocks[index]}
                    disabled={cooldown > 0 || isWon || isLost}
                  />
                );
              })}
            </SortableContext>
          </div>

          <DragOverlay
            dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: { active: { opacity: "0.4" } },
              }),
            }}>
            {activeId && activeCard ? (
              <CardView
                card={activeCard}
                index={cards.findIndex((c) => c.id === activeId)}
                status={cardStatuses[activeId] || "none"}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <div className="mt-6 mb-4 md:mt-16 md:mb-8">
        {isWon || isLost ? (
          <div className="flex flex-col items-center gap-4 md:gap-6 animate-bounce-short">
            <h2
              className={`text-3xl md:text-4xl font-black drop-shadow-sm ${isWon ? "text-green-600" : "text-red-600"}`}>
              {isWon ? "Tökéletes! 🎉" : "Vesztettél! 😢"}
            </h2>
            <div className="text-center">
              <p
                className={`text-2xl font-bold ${isWon ? "text-gray-800" : "text-gray-500"}`}>
                {finalScore} pont
              </p>
              <p className="text-sm md:text-base text-gray-500 font-medium">
                {attemptsLog.length} / {MAX_ATTEMPTS} próbálkozás • {timeTaken}{" "}
                másodperc
              </p>
              {isLost && (
                <p className="text-sm font-bold text-gray-700 mt-2">
                  A gép felfedte a helyes sorrendet.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleShareClick}
                className={`px-6 py-3 font-bold text-base rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-gray-900 text-white hover:bg-gray-800"
                }`}>
                {copied ? (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Másolva!
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.632l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      />
                    </svg>
                    Megosztás
                  </>
                )}
              </button>

              {!user ? (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-6 py-3 font-bold text-base rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    />
                  </svg>
                  Eredmény elmentése
                </button>
              ) : (
                <div className="px-6 py-3 font-bold text-base rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center gap-2 cursor-default">
                  {isSaving
                    ? "Mentés folyamatban..."
                    : scoreSaved
                      ? "✓ Eredmény elmentve"
                      : "Hiba a mentésnél"}
                </div>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={handleCheck}
            disabled={cooldown > 0}
            className={`px-6 py-3 md:px-10 md:py-4 font-black text-lg md:text-xl rounded-xl md:rounded-2xl transition-all shadow-lg md:shadow-xl flex items-center justify-center gap-2
              ${
                cooldown > 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-2xl active:scale-95 hover:-translate-y-1"
              }
            `}>
            {cooldown > 0 ? (
              <>
                <svg
                  className="w-5 h-5 animate-spin"
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
                Időzár: {cooldown} mp
              </>
            ) : (
              "Ellenőrzés"
            )}
          </button>
        )}
      </div>

      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors">
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
            <h3 className="text-2xl font-black text-gray-900 mb-2">
              Oszd meg a sikert!
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              A Meta appoknál (Facebook, Insta) a vágólapra másoljuk az
              eredményt, csak be kell illesztened.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 relative group">
              <pre className="text-sm text-gray-700 font-mono whitespace-pre-wrap">
                {generateShareText()}
              </pre>
              <button
                onClick={copyToClipboard}
                className={`absolute top-2 right-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${copied ? "bg-green-500 text-white" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"}`}>
                {copied ? "Másolva!" : "Másolás"}
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => handleSocialShare("twitter")}
                className="flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-md">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 4.15H5.078z" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-gray-600">X</span>
              </button>
              <button
                onClick={() => handleSocialShare("whatsapp")}
                className="flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 bg-[#25D366] text-white rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-md">
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-gray-600">
                  WhatsApp
                </span>
              </button>
              <button
                onClick={() => handleSocialShare("telegram")}
                className="flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 bg-[#0088cc] text-white rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-md">
                  <svg
                    className="w-5 h-5 ml-[-2px]"
                    fill="currentColor"
                    viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-gray-600">
                  Telegram
                </span>
              </button>
              <button
                onClick={() => handleSocialShare("facebook")}
                className="flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 bg-[#1877F2] text-white rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-md relative">
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                    <svg
                      className="w-3 h-3 text-gray-600"
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
                  </div>
                </div>
                <span className="text-[10px] font-bold text-gray-600">
                  Facebook
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        redirectPath="/daily"
      />
    </div>
  );
}
