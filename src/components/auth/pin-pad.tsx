"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Delete, Lock } from "lucide-react";

interface PinPadProps {
  onSubmit: (pin: string) => Promise<void> | void;
  isLoading?: boolean;
  error?: string | null;
  onClearError?: () => void;
  title?: string;
  description?: string;
}

export function PinPad({
  onSubmit,
  isLoading = false,
  error = null,
  onClearError,
  title = "Ingreso con PIN Rápido",
  description = "Ingresa tu PIN de 4 dígitos para acceder al sistema",
}: PinPadProps) {
  const [pin, setPin] = useState<string>("");

  const handleComplete = useCallback(
    async (completedPin: string) => {
      if (completedPin.length === 4 && !isLoading) {
        await onSubmit(completedPin);
      }
    },
    [isLoading, onSubmit]
  );

  const handleDigit = useCallback(
    (digit: string) => {
      if (isLoading) return;
      if (error && onClearError) onClearError();
      if (pin.length < 4) {
        const nextPin = pin + digit;
        setPin(nextPin);
        if (nextPin.length === 4) {
          handleComplete(nextPin);
        }
      }
    },
    [pin, isLoading, error, onClearError, handleComplete]
  );

  const handleBackspace = useCallback(() => {
    if (isLoading) return;
    if (error && onClearError) onClearError();
    setPin((prev) => prev.slice(0, -1));
  }, [isLoading, error, onClearError]);

  const handleClear = useCallback(() => {
    if (isLoading) return;
    if (error && onClearError) onClearError();
    setPin("");
  }, [isLoading, error, onClearError]);

  // Soporte para teclado físico
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Escape" || e.key === "Delete") {
        handleClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDigit, handleBackspace, handleClear]);

  // Si hay error externo, limpiar el PIN para reintentar
  useEffect(() => {
    if (error) {
      setPin("");
    }
  }, [error]);


  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto select-none">
      {/* Icon & Title */}
      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 text-[#E63946] mb-3 shadow-inner">
        <Lock className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
      <p className="text-xs text-slate-500 mt-1 text-center">{description}</p>

      {/* PIN Dots Display */}
      <div className="flex items-center justify-center gap-4 my-6">
        {[0, 1, 2, 3].map((index) => {
          const filled = index < pin.length;
          return (
            <div
              key={index}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                filled
                  ? "bg-[#E63946] border-[#E63946] scale-110 shadow-xs"
                  : error
                  ? "border-rose-400 bg-rose-50 animate-shake"
                  : "border-slate-300 bg-slate-100"
              }`}
            />
          );
        })}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium text-center animate-in fade-in">
          {error}
        </div>
      )}

      {/* Numeric Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
          <button
            key={num}
            type="button"
            disabled={isLoading}
            onClick={() => handleDigit(num)}
            className="h-16 rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 text-2xl font-bold text-slate-800 shadow-xs flex items-center justify-center transition-all duration-100 active:scale-95 disabled:opacity-50"
          >
            {num}
          </button>
        ))}

        {/* Clear */}
        <button
          type="button"
          disabled={isLoading || pin.length === 0}
          onClick={handleClear}
          className="h-16 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 border border-slate-200 flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
        >
          Borrar
        </button>

        {/* Zero */}
        <button
          type="button"
          disabled={isLoading}
          onClick={() => handleDigit("0")}
          className="h-16 rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 text-2xl font-bold text-slate-800 shadow-xs flex items-center justify-center transition-all duration-100 active:scale-95 disabled:opacity-50"
        >
          0
        </button>

        {/* Backspace */}
        <button
          type="button"
          disabled={isLoading || pin.length === 0}
          onClick={handleBackspace}
          className="h-16 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 border border-slate-200 flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>

    </div>
  );
}
