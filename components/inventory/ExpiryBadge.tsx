// ============================================================
// MealStack · ExpiryBadge Component
// Color-coded pill: RED <24h · AMBER <48h · GREEN otherwise
// ============================================================

import { getExpiryInfo, EXPIRY_COLORS } from '@/lib/expiryLogic';

interface ExpiryBadgeProps {
  expiresAt: string;
  showDot?: boolean;
}

export default function ExpiryBadge({ expiresAt, showDot = false }: ExpiryBadgeProps) {
  const info = getExpiryInfo(expiresAt);
  const colors = EXPIRY_COLORS[info.status];

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] px-2 py-0.5 rounded-full border ${colors.badge}`}>
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      )}
      {info.label}
    </span>
  );
}
