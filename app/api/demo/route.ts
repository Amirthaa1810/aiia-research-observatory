import { requireMember, requireRole, apiFailure, AccessError } from '@/lib/access';
import { isRole, visibleRecords, allowedSections, roles, type Membership } from '@/lib/permissions';
import { demoRecords } from '@/lib/seed';
import { withDemoProfile } from '@/lib/participant-profile';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { member } = await requireMember();
    requireRole(member.role, 'administrator');
    const role = new URL(request.url).searchParams.get('role');
    if (!isRole(role)) throw new AccessError('Unknown role.', 400);
    const previewMember: Membership = {
      userId: 'synthetic-preview',
      name: role === 'participant' ? 'Demo participant' : 'Demo ' + roles[role].label,
      email: 'preview@example.test',
      role,
      status: 'active',
      studies: ['s1', 's2', 's3', 's6'],
      participantId: 's1-p2',
      version: 1,
    };
    const records = visibleRecords(previewMember, demoRecords().map(withDemoProfile));
    return Response.json(
      {
        records,
        audit: [],
        settings: {
          institution: 'AIIA demo preview',
          alertDays: 7,
          initialized: true,
          demoVersion: 2,
        },
        membership: previewMember,
        user: { name: previewMember.name, role, email: previewMember.email },
        sections: allowedSections(role),
        updated: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return apiFailure(e);
  }
}
