"use client";

import React, { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { PinPad } from "@/components/auth/pin-pad";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, KeyRound, Mail, Lock, AlertCircle } from "lucide-react";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [authMode, setAuthMode] = useState<"pin" | "password">("pin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Login con PIN
  const handlePinSubmit = async (pin: string) => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await signIn("pin", {
          pin,
          redirect: false,
        });

        if (res?.error) {
          setError("El PIN ingresado es incorrecto o el usuario está inactivo.");
        } else {
          router.push(callbackUrl === "/login" ? "/" : callbackUrl);
          router.refresh();
        }
      } catch {
        setError("Ocurrió un error inesperado al iniciar sesión.");
      }
    });
  };

  // Login con Email y Contraseña
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const res = await signIn("credentials", {
          email: email.trim().toLowerCase(),
          password,
          redirect: false,
        });

        if (res?.error) {
          setError("Credenciales incorrectas o usuario inactivo.");
        } else {
          router.push(callbackUrl === "/login" ? "/" : callbackUrl);
          router.refresh();
        }
      } catch {
        setError("Ocurrió un error al autenticar con email.");
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 px-4 py-8 relative">
      {/* Background accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-rose-950/30 to-transparent pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100/10 p-6 sm:p-8 z-10">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#E63946] flex items-center justify-center text-white shadow-lg mb-3">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            RestoManager
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Software de Gestión para Restaurantes
          </p>
        </div>

        {/* Tab switch: PIN vs Email/Password */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setAuthMode("pin");
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              authMode === "pin"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <KeyRound className="w-4 h-4 text-[#E63946]" />
            <span>PIN Rápido</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("password");
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              authMode === "password"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Mail className="w-4 h-4 text-[#457B9D]" />
            <span>Email / Clave</span>
          </button>
        </div>

        {/* PIN MODE */}
        {authMode === "pin" && (
          <PinPad
            onSubmit={handlePinSubmit}
            isLoading={isPending}
            error={error}
            onClearError={() => setError(null)}
            title="Acceso Rápido"
            description="Ingresa tu PIN de 4 dígitos para comenzar tu turno"
          />
        )}

        {/* EMAIL & PASSWORD MODE */}
        {authMode === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@restomanager.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/50 focus:border-[#E63946]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/50 focus:border-[#E63946]"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isPending}
            >
              Iniciar Sesión
            </Button>

            {/* Quick demo helper for email */}
            <div className="pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400 mb-2">Credenciales Demo Admin:</p>
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@restomanager.com");
                  setPassword("Admin123!");
                }}
                className="text-xs text-[#E63946] hover:underline font-medium"
              >
                Autocompletar Admin (admin@restomanager.com / Admin123!)
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <LoginFormContent />
    </Suspense>
  );
}
