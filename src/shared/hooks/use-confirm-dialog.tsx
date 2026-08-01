import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConfirmDialog,
  type ConfirmDialogTone,
} from "@/shared/components/ui/ConfirmDialog";

export type ConfirmDialogOptions = {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  title: string;
  tone?: ConfirmDialogTone;
};

export function useConfirmDialog() {
  const [pendingConfirmation, setPendingConfirmation] =
    useState<ConfirmDialogOptions | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    resolverRef.current?.(false);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setPendingConfirmation(options);
    });
  }, []);

  const closeConfirmation = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setPendingConfirmation(null);
  }, []);

  useEffect(
    () => () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
    },
    [],
  );

  const confirmationDialog = (
    <ConfirmDialog
      cancelLabel={pendingConfirmation?.cancelLabel}
      confirmLabel={pendingConfirmation?.confirmLabel}
      description={pendingConfirmation?.description ?? ""}
      isOpen={Boolean(pendingConfirmation)}
      title={pendingConfirmation?.title ?? ""}
      tone={pendingConfirmation?.tone}
      onCancel={() => closeConfirmation(false)}
      onConfirm={() => closeConfirmation(true)}
    />
  );

  return {
    confirm,
    confirmationDialog,
  };
}
