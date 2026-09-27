import AccessGate from '@/components/team-access';
import { isRole } from '@/lib/permissions';
import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function RoleWorkspace({
  params,
  searchParams,
}: {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { role } = await params;
  const query = await searchParams;
  if (!isRole(role)) notFound();
  return <AccessGate requestedRole={role} preview={query.preview === '1'} />;
}
