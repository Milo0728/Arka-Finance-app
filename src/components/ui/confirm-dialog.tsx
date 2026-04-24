"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * Replacement for native window.confirm — keeps prompts inside the design
 * system. Built on top of the shared Dialog so we don't pull in a new Radix
 * package just for this. Async `onConfirm` is awaited and the dialog closes
 * automatically on success.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = React.useState(false);

  async function handleConfirm() {
    try {
      setBusy(true);
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Tiny hook that wraps the dialog state and lets call sites read like the
 * native confirm — with the obvious advantage of being styled and async-safe.
 *
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title: "Delete?", confirmLabel: "Delete", ... });
 *   if (ok) await doIt();
 */
export interface ConfirmRequest {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
}

export function useConfirm() {
  const [request, setRequest] = React.useState<ConfirmRequest | null>(null);
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback((req: ConfirmRequest) => {
    setRequest(req);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const node = request ? (
    <ConfirmDialog
      open={!!request}
      onOpenChange={(open) => {
        if (!open) {
          resolverRef.current?.(false);
          resolverRef.current = null;
          setRequest(null);
        }
      }}
      title={request.title}
      description={request.description}
      confirmLabel={request.confirmLabel}
      cancelLabel={request.cancelLabel}
      destructive={request.destructive}
      onConfirm={() => {
        resolverRef.current?.(true);
        resolverRef.current = null;
        setRequest(null);
      }}
    />
  ) : null;

  return { confirm, dialog: node };
}
