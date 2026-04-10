import AdminPage from '@/features/admin/AdminPage';

interface Props {
  params: Promise<{ secret: string }>;
}

export default async function Page({ params }: Props) {
  const { secret } = await params;
  const adminSecret = process.env.ADMIN_SECRET ?? 'gw2k9x';

  if (secret !== adminSecret) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="text-4xl mb-4">🍄</div>
        <p className="text-lg font-bold">404 - 페이지를 찾을 수 없습니다</p>
      </div>
    );
  }

  return <AdminPage secret={secret} />;
}
