interface Notice {
  id: string;
  content: string;
  timestamp: string;
  author: string;
}

interface Props {
  notices: Notice[];
  fetchedAt: string;
}

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  return '방금';
}

export default function NoticeSection({ notices }: Props) {
  if (!notices || notices.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="maple-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📢</span>
          <h3 className="text-sm font-bold" style={{ color: 'var(--maple-brown)' }}>길드 공지</h3>
        </div>
        <div className="space-y-2">
          {notices.slice(0, 5).map(notice => (
            <div key={notice.id} className="p-3 rounded-lg" style={{ background: '#FFFDF5', border: '1px solid #FFE0A0' }}>
              <div className="text-xs opacity-50 mb-1 flex items-center gap-2">
                <span>{notice.author}</span>
                <span>·</span>
                <span>{formatRelativeTime(notice.timestamp)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">{notice.content}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
