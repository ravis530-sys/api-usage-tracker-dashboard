'use client';

export default function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading-center">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  );
}
