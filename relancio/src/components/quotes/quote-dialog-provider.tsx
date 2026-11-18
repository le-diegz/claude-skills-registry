"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { QuoteFormDialog, type QuoteFormInitial } from "./quote-form-dialog";

interface Ctx {
  openCreate: (initial?: Partial<QuoteFormInitial>) => void;
  openEdit: (quoteId: string, initial: QuoteFormInitial) => void;
}

const QuoteDialogContext = createContext<Ctx | null>(null);

export function QuoteDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; quoteId?: string; initial?: Partial<QuoteFormInitial>; key: number }>({ open: false, key: 0 });

  const openCreate = useCallback((initial?: Partial<QuoteFormInitial>) => {
    setState((s) => ({ open: true, initial, quoteId: undefined, key: s.key + 1 }));
  }, []);
  const openEdit = useCallback((quoteId: string, initial: QuoteFormInitial) => {
    setState((s) => ({ open: true, initial, quoteId, key: s.key + 1 }));
  }, []);
  const value = useMemo(() => ({ openCreate, openEdit }), [openCreate, openEdit]);

  return (
    <QuoteDialogContext.Provider value={value}>
      {children}
      <QuoteFormDialog
        key={state.key}
        open={state.open}
        onOpenChange={(open) => setState((s) => ({ ...s, open }))}
        quoteId={state.quoteId}
        initial={state.initial}
      />
    </QuoteDialogContext.Provider>
  );
}

export function useQuoteDialog(): Ctx {
  const ctx = useContext(QuoteDialogContext);
  if (!ctx) throw new Error("useQuoteDialog doit être utilisé dans QuoteDialogProvider");
  return ctx;
}
