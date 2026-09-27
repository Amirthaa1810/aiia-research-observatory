import type { Kind, RecordData } from './domain';
export const roles = {
  administrator: {
    label: 'Administrator',
    description: 'Manage accounts, assignments and the full workspace.',
    read: [
      'study',
      'participant',
      'visit',
      'site',
      'ethics',
      'safety',
      'query',
      'document',
      'task',
    ],
    write: [
      'study',
      'participant',
      'visit',
      'site',
      'ethics',
      'safety',
      'query',
      'document',
      'task',
    ],
  },
  head: {
    label: 'Institutional head',
    description: 'Read the institutional portfolio and reports. No record changes.',
    read: [
      'study',
      'participant',
      'visit',
      'site',
      'ethics',
      'safety',
      'query',
      'document',
      'task',
    ],
    write: [],
  },
  researcher: {
    label: 'Researcher',
    description: 'Manage research records in assigned studies.',
    read: ['study', 'participant', 'visit', 'query', 'document', 'task'],
    write: ['study', 'participant', 'visit', 'query', 'document', 'task'],
  },
  doctor: {
    label: 'Doctor',
    description: 'Review participants, visits and safety in assigned studies.',
    read: ['study', 'participant', 'visit', 'safety', 'query', 'document', 'task'],
    write: ['participant', 'visit', 'safety', 'query'],
  },
  coordinator: {
    label: 'Research officer',
    description: 'Coordinate enrolment, visits, documents and tasks in assigned studies.',
    read: ['study', 'participant', 'visit', 'document', 'task'],
    write: ['participant', 'visit', 'document', 'task'],
  },
  ethics: {
    label: 'Ethics officer',
    description: 'Review ethics submissions and supporting documents in assigned studies.',
    read: ['study', 'ethics', 'document', 'task'],
    write: ['ethics', 'task'],
  },
  safety: {
    label: 'Safety officer',
    description: 'Manage pharmacovigilance cases in assigned studies.',
    read: ['study', 'participant', 'safety', 'document', 'task'],
    write: ['safety', 'task'],
  },
  data_manager: {
    label: 'Data manager',
    description: 'Review collected data and resolve queries in assigned studies.',
    read: ['study', 'participant', 'visit', 'query', 'document', 'task'],
    write: ['query', 'document'],
  },
  participant: {
    label: 'Participant',
    description: 'View only your linked study, your information and your visits.',
    read: [],
    write: [],
  },
} as const;
export type Role = keyof typeof roles;
export type Membership = {
  userId: string;
  name: string;
  email: string;
  role: Role;
  status: 'pending' | 'active' | 'disabled';
  studies: string[];
  participantId: string | null;
  version: number;
};
export const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && Object.hasOwn(roles, value);
export function canWrite(role: Role, kind: Kind) {
  return (roles[role].write as readonly string[]).includes(kind);
}
export function inScope(member: Membership, r: RecordData) {
  return (
    member.role === 'administrator' ||
    member.role === 'head' ||
    member.studies.includes(r.kind === 'study' ? r.id : (r.study ?? ''))
  );
}
export function visibleRecords(member: Membership, records: RecordData[]) {
  if (member.role === 'participant') {
    const own = records.find((r) => r.kind === 'participant' && r.id === member.participantId);
    if (!own) return [];
    return records
      .filter(
        (r) =>
          (r.kind === 'participant' && r.id === own.id) ||
          (r.kind === 'study' && r.id === own.study) ||
          (['visit', 'safety'].includes(r.kind) &&
            r.study === own.study &&
            r.participant === own.id),
      )
      .map((r) => {
        // Explicit portal fields keep internal notes, staff contacts and other participants out of the response.
        const fields =
          r.kind === 'study'
            ? ['id', 'kind', 'title', 'code', 'status']
            : r.kind === 'participant'
              ? [
                  'id',
                  'kind',
                  'title',
                  'study',
                  'status',
                  'consent',
                  'consentVersion',
                  'consentDate',
                  'enrolledDate',
                  'displayName',
                  'age',
                  'sex',
                  'site',
                  'language',
                  'portrait',
                  'photoVersion',
                  'syntheticProfile',
                  'heightCm',
                  'weightKg',
                  'prakriti',
                  'allergies',
                  'medicalHistory',
                  'medications',
                ]
              : r.kind === 'safety'
                ? [
                    'id',
                    'kind',
                    'title',
                    'study',
                    'participant',
                    'status',
                    'onset',
                    'severity',
                    'participantMessage',
                    'participantReported',
                  ]
                : [
                    'id',
                    'kind',
                    'title',
                    'study',
                    'participant',
                    'status',
                    'due',
                    'assessment',
                    'systolic',
                    'diastolic',
                    'pulse',
                  ];
        return Object.fromEntries(fields.map((k) => [k, r[k]])) as RecordData;
      });
  }
  return records.filter(
    (r) => (roles[member.role].read as readonly string[]).includes(r.kind) && inScope(member, r),
  );
}
export function allowedSections(role: Role) {
  if (role === 'participant') return ['My dashboard', 'My study', 'My visits', 'My profile'];
  const labels: Record<string, Kind> = {
    Studies: 'study',
    Participants: 'participant',
    Visits: 'visit',
    'Sites & teams': 'site',
    'Ethics & regulatory': 'ethics',
    'Safety & vigilance': 'safety',
    'Data queries': 'query',
    Documents: 'document',
    'Tasks & monitoring': 'task',
  };
  return [
    'Overview',
    ...Object.keys(labels).filter((s) =>
      (roles[role].read as readonly string[]).includes(labels[s]),
    ),
    'Reports',
    'Research Sahayak',
    ...(role === 'administrator' ? ['Team access', 'Audit trail', 'Settings'] : []),
  ];
}
