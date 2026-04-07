'use client';

import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { formatCombatPower } from '@/lib/constants';

// 메이플 감성 컬러 팔레트
const COLORS = [
  '#FF9B37', '#5B9BD5', '#B088F9', '#7CC576', '#FF8FAB',
  '#6BB5FF', '#FFD93D', '#E57373', '#4DB6AC', '#FF8A65',
];

interface SnapshotData {
  date: string;
  members: {
    characterName: string;
    level: number;
    expRate: number;
    combatPower: number;
    unionLevel: number;
  }[];
}

interface Props {
  snapshots: SnapshotData[];
  allMembers: string[];
}

type ChartMetric = 'combatPower' | 'level' | 'expRate' | 'unionLevel';

const METRIC_OPTIONS: { key: ChartMetric; label: string; emoji: string }[] = [
  { key: 'combatPower', label: '전투력', emoji: '⚔️' },
  { key: 'level', label: '레벨', emoji: '⭐' },
  { key: 'expRate', label: '경험치%', emoji: '📊' },
  { key: 'unionLevel', label: '유니온', emoji: '🏰' },
];

function formatTooltipValue(value: number, metric: ChartMetric): string {
  switch (metric) {
    case 'combatPower': return formatCombatPower(value);
    case 'level': return `Lv.${value}`;
    case 'expRate': return `${value.toFixed(1)}%`;
    case 'unionLevel': return value.toLocaleString();
  }
}

function formatYAxis(value: number, metric: ChartMetric): string {
  switch (metric) {
    case 'combatPower':
      if (value >= 100000000) return `${(value / 100000000).toFixed(0)}억`;
      if (value >= 10000000) return `${(value / 10000000).toFixed(0)}천만`;
      if (value >= 10000) return `${(value / 10000).toFixed(0)}만`;
      return String(value);
    case 'expRate': return `${value}%`;
    default: return String(value);
  }
}

export default function GrowthChart({ snapshots, allMembers }: Props) {
  const [metric, setMetric] = useState<ChartMetric>('combatPower');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    allMembers.slice(0, 5) // 기본 TOP 5
  );
  const [showSelector, setShowSelector] = useState(false);

  // 차트 데이터 변환
  const chartData = useMemo(() => {
    return snapshots.map(snap => {
      const point: Record<string, any> = { date: snap.date.slice(5) }; // "04-06"
      for (const name of selectedMembers) {
        const member = snap.members.find(m => m.characterName === name);
        if (member) {
          point[name] = member[metric];
        }
      }
      return point;
    });
  }, [snapshots, selectedMembers, metric]);

  const toggleMember = (name: string) => {
    setSelectedMembers(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : prev.length < 10
          ? [...prev, name]
          : prev
    );
  };

  if (snapshots.length < 2) {
    return (
      <div className="maple-card p-6 text-center">
        <div className="text-3xl mb-2 slime-squish">🐌</div>
        <p className="text-sm opacity-60">차트를 그리려면 2일 이상의 데이터가 필요해요</p>
        <p className="text-xs opacity-40 mt-1">내일 수집 후 차트를 확인할 수 있습니다</p>
      </div>
    );
  }

  return (
    <div>
      {/* 지표 선택 탭 */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {METRIC_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setMetric(opt.key)}
            className={`maple-tab whitespace-nowrap text-xs ${metric === opt.key ? 'maple-tab-active' : 'maple-tab-inactive'}`}
          >
            {opt.emoji} {opt.label}
          </button>
        ))}
      </div>

      {/* 차트 */}
      <div className="maple-card p-4">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#FFE0B2" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#6B4226' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#999' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatYAxis(v, metric)}
              width={60}
            />
            <Tooltip
              contentStyle={{
                background: 'white',
                border: '2px solid #FFE0B2',
                borderRadius: '12px',
                fontSize: '12px',
              }}
              formatter={(value: any) => [formatTooltipValue(Number(value), metric), '']}
              labelStyle={{ color: '#6B4226', fontWeight: 'bold' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
            />
            {selectedMembers.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: COLORS[i % COLORS.length] }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 멤버 선택 */}
      <div className="mt-3">
        <button
          onClick={() => setShowSelector(!showSelector)}
          className="text-xs opacity-60 hover:opacity-100 transition-opacity"
        >
          {showSelector ? '▲ 멤버 선택 닫기' : `▼ 멤버 선택 (${selectedMembers.length}/10)`}
        </button>

        {showSelector && (
          <div className="maple-card p-3 mt-2 max-h-48 overflow-y-auto">
            <div className="flex flex-wrap gap-1">
              {allMembers.map((name, i) => (
                <button
                  key={name}
                  onClick={() => toggleMember(name)}
                  className="text-xs px-2 py-1 rounded-full transition-all"
                  style={{
                    background: selectedMembers.includes(name)
                      ? COLORS[selectedMembers.indexOf(name) % COLORS.length]
                      : '#F5F5F5',
                    color: selectedMembers.includes(name) ? 'white' : '#666',
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
