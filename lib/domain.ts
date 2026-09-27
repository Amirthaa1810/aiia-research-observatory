export type Kind =
  | 'study'
  | 'participant'
  | 'visit'
  | 'site'
  | 'ethics'
  | 'safety'
  | 'query'
  | 'document'
  | 'task';
export type RecordData = {
  id: string;
  kind: Kind;
  version: number;
  updated: string;
  title: string;
  status: string;
  study?: string;
  [key: string]: any;
};
export const statusOptions: Record<Kind, string[]> = {
  study: ['Draft', 'Recruiting', 'Follow-up', 'Paused', 'Completed'],
  participant: ['Screening', 'Enrolled', 'Withdrawn', 'Completed', 'Screen failed'],
  visit: ['Scheduled', 'Completed', 'Missed', 'Cancelled'],
  site: ['Pending activation', 'Active', 'Suspended', 'Closed'],
  ethics: ['Submitted', 'In review', 'Changes requested', 'Approved', 'Rejected'],
  safety: ['New', 'Under review', 'Follow-up', 'Closed'],
  query: ['Open', 'Answered', 'Resolved'],
  document: ['Draft', 'In review', 'Approved', 'Superseded'],
  task: ['Open', 'In progress', 'Completed'],
};
export function readiness(s: RecordData) {
  return [
    { label: 'Ethics approval verified', ok: s.ethics === 'Approved' },
    { label: 'Prospective CTRI registration verified', ok: s.ctri === 'Registered' && !!s.ctriId },
    { label: 'Approved protocol available', ok: !!s.protocol },
    { label: 'Site activation confirmed', ok: s.siteReady === true },
  ];
}
export function validateRecord(r: RecordData, all: RecordData[], old?: RecordData) {
  if (!statusOptions[r.kind]?.includes(r.status)) throw Error('Choose a valid status.');
  if (!r.title?.trim() || r.title.length > 240)
    throw Error('A title of 1–240 characters is required.');
  const study = all.find((s) => s.kind === 'study' && s.id === r.study);
  if (!['study', 'site'].includes(r.kind) && !study) throw Error('Select an existing study.');
  if (r.kind === 'study') {
    if (!Number.isInteger(Number(r.target)) || Number(r.target) < 1 || Number(r.target) > 100000)
      throw Error('Enrolment target must be a whole number between 1 and 100,000.');
    if (r.status === 'Recruiting' && readiness(r).some((x) => !x.ok))
      throw Error(
        'Recruitment requires verified ethics approval, CTRI registration, protocol and site activation.',
      );
  }
  if (r.kind === 'participant') {
    if (
      r.age !== undefined &&
      r.age !== '' &&
      (!Number.isFinite(Number(r.age)) || Number(r.age) < 0 || Number(r.age) > 120)
    )
      throw Error('Age must be between 0 and 120.');
    if (['Completed', 'Withdrawn'].includes(r.status) && !old?.enrolledDate)
      throw Error('A participant must be enrolled before completing or withdrawing from a study.');
    if (['Screening', 'Screen failed'].includes(r.status)) r.enrolledDate = '';
    if (
      all.some(
        (x) =>
          x.kind === 'participant' &&
          x.id !== r.id &&
          x.study === r.study &&
          x.title.toLowerCase() === r.title.toLowerCase(),
      )
    )
      throw Error('This participant ID already exists in this study.');
    if (r.status === 'Enrolled' && old?.status !== 'Enrolled') {
      if (study?.status !== 'Recruiting' || readiness(study).some((x) => !x.ok))
        throw Error(
          'This study is not ready to enrol participants. Resolve its readiness checks first.',
        );
      if (!r.consent || !r.eligible || !r.consentVersion || !r.consentDate)
        throw Error(
          'Eligibility confirmation, consent version and consent date are required for enrolment.',
        );
      if (r.consentDate > r.enrolledDate)
        throw Error('Consent must be documented on or before enrolment.');
      if (!r.enrolledDate) throw Error('Provide the enrolment date.');
    }
  }
  if (
    r.kind === 'visit' &&
    r.participant &&
    !all.some((x) => x.kind === 'participant' && x.id === r.participant && x.study === r.study)
  )
    throw Error('Select a participant from the same study.');
  if (r.kind === 'visit' && !r.due) throw Error('A visit date is required.');
  if (r.kind === 'visit')
    for (const [key, max] of [
      ['systolic', 300],
      ['diastolic', 200],
      ['pulse', 300],
    ] as const) {
      if (
        r[key] !== undefined &&
        r[key] !== '' &&
        (!Number.isFinite(Number(r[key])) || Number(r[key]) <= 0 || Number(r[key]) > max)
      )
        throw Error(`Check ${key}: enter a value greater than zero and no more than ${max}.`);
    }
  if (r.kind === 'safety') {
    if (!r.onset || !r.severity || !r.product)
      throw Error('Record onset, severity and suspected product.');
    if (r.serious && !r.criteria) throw Error('Describe the seriousness criteria.');
    if (r.status === 'Closed' && (!r.review || !r.outcome))
      throw Error('A clinical review and outcome are required before closing a safety case.');
  }
  if (r.kind === 'ethics' && r.status === 'Approved' && (!r.reference || !r.decisionDate))
    throw Error('An approval reference and decision date are required.');
  if (r.kind === 'query' && r.status === 'Resolved' && !r.response)
    throw Error('Document the resolution before resolving this query.');
  if (old && r.study !== old.study && r.kind !== 'study')
    throw Error('A saved record cannot be moved to another study.');
}
export function day(offset = 0) {
  return new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
}
