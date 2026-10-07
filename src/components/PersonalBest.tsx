import { memo, useMemo } from 'react';
import type { Activity } from '../types';
import { useLocale } from '../hooks/useLocale';
import { parseMovingTime } from '../hooks/useActivities';

interface PersonalBestProps {
  activities: Activity[];
  onSelectActivity?: (a: Activity | null) => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const RUN_DISTANCES = [
  { key: '5K', min: 4.8, max: 5.5 },
  { key: '10K', min: 9.5, max: 11 },
  { key: 'Half Marathon', min: 20, max: 22.5 },
  { key: 'Marathon', min: 41, max: 44 },
];

const RIDE_DISTANCES = [
  { key: '20K', min: 18, max: 25 },
  { key: '50K', min: 45, max: 55 },
  { key: '100K', min: 90, max: 110 },
];

export const PersonalBest = memo(function PersonalBest({
  activities,
  onSelectActivity,
}: PersonalBestProps) {
  const { locale } = useLocale();

  const hasRuns = activities.some(
    (a) => a.type === 'Run' && a.summary_polyline && a.summary_polyline.length > 20
  );
  const hasRides = activities.some(
    (a) => a.type === 'Ride' && a.summary_polyline && a.summary_polyline.length > 20
  );

  const runLabels: Record<string, string> =
    locale === 'zh'
      ? { '5K': '5公里', '10K': '10公里', 'Half Marathon': '半程马拉松', Marathon: '全程马拉松' }
      : { '5K': '5K', '10K': '10K', 'Half Marathon': 'Half Marathon', Marathon: 'Marathon' };

  const rideLabels: Record<string, string> =
    locale === 'zh'
      ? { '20K': '20公里', '50K': '50公里', '100K': '100公里' }
      : { '20K': '20K', '50K': '50K', '100K': '100K' };

  const runBests = useMemo(() => {
    if (!hasRuns) return [];
    const runs = activities.filter(
      (a) => a.type === 'Run' && a.summary_polyline && a.summary_polyline.length > 20
    );
    return RUN_DISTANCES.map(({ key, min, max }) => {
      const matching = runs.filter((a) => {
        const km = a.distance / 1000;
        if (km < min || km > max) return false;
        const time = parseMovingTime(a.moving_time);
        const pacePerKm = time / km;
        return pacePerKm >= 180 && pacePerKm <= 480;
      });
      if (!matching.length) return { key, activity: null, time: 0 };
      const best = matching.reduce((b, a) =>
        parseMovingTime(a.moving_time) < parseMovingTime(b.moving_time) ? a : b
      );
      return { key, activity: best, time: parseMovingTime(best.moving_time) };
    });
  }, [activities, hasRuns]);

  const rideBests = useMemo(() => {
    if (!hasRides) return [];
    const rides = activities.filter(
      (a) => a.type === 'Ride' && a.summary_polyline && a.summary_polyline.length > 20
    );
    return RIDE_DISTANCES.map(({ key, min, max }) => {
      const matching = rides.filter((a) => {
        const km = a.distance / 1000;
        if (km < min || km > max) return false;
        const speed = a.average_speed;
        return speed >= 4.2 && speed <= 12.5;
      });
      if (!matching.length) return { key, activity: null, time: 0 };
      const best = matching.reduce((b, a) =>
        parseMovingTime(a.moving_time) < parseMovingTime(b.moving_time) ? a : b
      );
      return { key, activity: best, time: parseMovingTime(best.moving_time) };
    });
  }, [activities, hasRides]);

  const hasBests = runBests.some((b) => b.activity !== null) || rideBests.some((b) => b.activity !== null);
  if (!hasBests) return null;

  const sections = [
    { label: locale === 'zh' ? '跑步' : 'Running', icon: '🏃', items: runBests, labels: runLabels },
    { label: locale === 'zh' ? '骑行' : 'Cycling', icon: '🚴', items: rideBests, labels: rideLabels },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 hover:shadow-[var(--color-accent)]/5 hover:shadow-lg">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <svg
          className="h-4 w-4 text-[var(--color-accent)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
        {locale === 'zh' ? '个人最佳' : 'Personal Best'}
      </h3>

      {sections.map((section) => (
        <div key={section.label} className="mb-2 last:mb-0">
          {sections.length > 1 && (
            <p className="mb-1 flex items-center gap-1 text-[10px] tracking-wider text-[var(--color-muted)] uppercase">
              <span>{section.icon}</span>
              {section.label}
            </p>
          )}
          <div className="divide-y divide-[var(--color-border)]">
            {section.items.map(({ key, activity, time }) => (
              <button
                type="button"
                disabled={!activity || !onSelectActivity}
                key={key}
                className={`flex w-full items-center justify-between gap-3 py-2 text-left ${
                  activity
                    ? '-mx-2 cursor-pointer rounded-lg px-2 transition-colors hover:bg-[var(--color-bg)]'
                    : ''
                }`}
                onClick={() => activity && onSelectActivity?.(activity)}
              >
                <span className="text-xs text-[var(--color-text)]">
                  {section.labels[key]}
                </span>
                <span
                  className={`font-mono text-xs font-bold ${activity ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}
                >
                  {activity ? formatTime(time) : '--'}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});