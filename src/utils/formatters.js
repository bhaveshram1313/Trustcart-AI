export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export function formatDate(isoString) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export function getTrustMeta(score) {
  if (score >= 85) {
    return {
      level: 'safe',
      label: 'Trusted',
      shortLabel: 'Safe',
      color: '#16A34A',
      bgClass: 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/25',
      dotClass: 'bg-[#16A34A]',
      ringColor: '#16A34A',
    };
  }
  if (score >= 65) {
    return {
      level: 'caution',
      label: 'Moderate Caution',
      shortLabel: 'Caution',
      color: '#F59E0B',
      bgClass: 'bg-[#F59E0B]/12 text-[#B45309] border-[#F59E0B]/30',
      dotClass: 'bg-[#F59E0B]',
      ringColor: '#F59E0B',
    };
  }
  return {
    level: 'high',
    label: 'High Risk Alert',
    shortLabel: 'High Risk',
    color: '#DC2626',
    bgClass: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/25',
    dotClass: 'bg-[#DC2626]',
    ringColor: '#DC2626',
  };
}
