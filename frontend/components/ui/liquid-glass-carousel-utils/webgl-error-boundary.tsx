"use client";
import { Component, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export class WebGLErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error("WebGL error:", error);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export function WebGLFallback({
  className,
  message,
}: {
  className?: string;
  message: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-center bg-white p-6 text-center text-sm text-neutral-600",
        className,
      )}
    >
      {message}
    </div>
  );
}
