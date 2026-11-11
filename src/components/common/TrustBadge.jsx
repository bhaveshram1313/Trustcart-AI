import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { getTrustMeta } from '../../utils/formatters';

export default function TrustBadge({ score, size = 'sm', showLabel = true }) {
  const meta = getTrustMeta(score);

  const Icon =
    meta.level === 'safe'
      ? ShieldCheck
      : meta.level === 'caution'
      ? AlertTriangle
      : ShieldAlert;

  const sizeClasses =
    size === 'lg'
      ? 'px-3.5 py-1.5 text-sm gap-2'
      : size === 'md'
      ? 'px-2.5 py-1 text-xs gap-1.5'
      : 'px-2 py-0.5 text-[11px] gap-1';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold whitespace-nowrap ${meta.bgClass} ${sizeClasses}`}
      title={`TrustCart AI Score: ${score}/100 (${meta.label})`}
    >
      <Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      <span>{score}/100</span>
      {showLabel && <span className="opacity-85">· {meta.shortLabel}</span>}
    </span>
  );
}
