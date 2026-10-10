"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Renders floating UI at <body> so animated or transformed parents can't trap position: fixed. */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}
