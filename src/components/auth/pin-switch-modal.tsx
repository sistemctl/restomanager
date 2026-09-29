"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { PinPad } from "@/components/auth/pin-pad";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

interface PinSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName?: string | null;
}

export function PinSwitchModal({
  isOpen,
  onClose,
  currentUserName,
}: PinSwitchModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePinSubmit = async (pin: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await signIn("pin", {
        pin,
        redirect: false,
      });

      if (res?.error) {
        setError("PIN inválido o empleado inactivo");
        setIsLoading(false);
      } else {
        onClose();
        router.refresh();
      }
    } catch {
      setError("Error al autenticar con PIN");
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cambio Rápido de Usuario"
      description={
        currentUserName
          ? `Sesión actual: ${currentUserName}. Ingresa el PIN del nuevo usuario:`
          : "Ingresa tu PIN de 4 dígitos:"
      }
      maxWidth="sm"
    >
      <div className="py-2">
        <PinPad
          onSubmit={handlePinSubmit}
          isLoading={isLoading}
          error={error}
          onClearError={() => setError(null)}
          title=""
          description=""
        />
      </div>
    </Modal>
  );
}
