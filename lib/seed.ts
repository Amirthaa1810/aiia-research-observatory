import { day, type RecordData, type Kind } from './domain';
export function demoRecords(): RecordData[] {
  const now = new Date().toISOString();
  const out: RecordData[] = [];
  const add = (
    kind: Kind,
    id: string,
    title: string,
    status: string,
    data: Record<string, any> = {},
  ) => out.push({ id, kind, title, status, version: 1, updated: now, ...data });
  const studies = [
    [
      's1',
      'Ashwagandha in stress management',
      'ASHWA-01',
      'Recruiting',
      90,
      'Dr. Meera Sharma',
      'Mental wellbeing',
      72,
      'New Delhi',
    ],
    [
      's2',
      'Triphala for metabolic health',
      'TRIPHALA-02',
      'Recruiting',
      80,
      'Dr. Arjun Rao',
      'Metabolic health',
      56,
      'Goa',
    ],
    [
      's3',
      'Integrative care for knee osteoarthritis',
      'SANDHI-03',
      'Recruiting',
      100,
      'Dr. Kavita Singh',
      'Musculoskeletal',
      61,
      'New Delhi',
    ],
    [
      's4',
      'Brahmi and cognitive performance',
      'MEDHYA-04',
      'Follow-up',
      60,
      'Dr. Nikhil Verma',
      'Cognitive health',
      42,
      'Jaipur',
    ],
    [
      's5',
      'Ayurveda care for sleep quality',
      'NIDRA-05',
      'Draft',
      40,
      'Dr. Meera Sharma',
      'Sleep medicine',
      0,
      'Goa',
    ],
    [
      's6',
      'Guduchi in seasonal wellbeing',
      'GUDUCHI-06',
      'Paused',
      30,
      'Dr. Arjun Rao',
      'Preventive health',
      17,
      'Jaipur',
    ],
  ];
  for (const [id, title, code, status, target, pi, condition, n, site] of studies) {
    add('study', id as string, title as string, status as string, {
      code,
      target,
      pi,
      condition,
      site,
      type: 'Interventional',
      ethics: id === 's5' ? 'Pending' : 'Approved',
      ctri: id === 's5' ? 'Pending' : 'Registered',
      ctriId: id === 's5' ? '' : `DEMO-CTRI-${code}`,
      protocol: id === 's5' ? '' : 'Protocol v2.1',
      siteReady: id !== 's5',
      start: day(-160),
      end: day(120),
      notes: 'Synthetic study for demonstration. No clinical efficacy is implied.',
      formulation: String(title).split(' ')[0],
      category: 'ASU formulation — expert review required',
    });
    for (let i = 0; i < Number(n); i++)
      add(
        'participant',
        `${id}-p${i + 1}`,
        `${code}-P${String(i + 1).padStart(3, '0')}`,
        i % 14 === 0 ? 'Completed' : 'Enrolled',
        {
          study: id,
          site,
          age: 28 + (i % 38),
          sex: i % 2 ? 'Female' : 'Male',
          consent: true,
          eligible: true,
          consentVersion: 'ICF v2.1',
          consentDate: day(-150 + (i % 140)),
          enrolledDate: day(-150 + (i % 140)),
          notes: 'Synthetic participant; no direct identifiers.',
        },
      );
  }
  for (const [id, title, city, lead] of [
    ['site1', 'AIIA New Delhi', 'New Delhi', 'Dr. Meera Sharma'],
    ['site2', 'AIIA Goa', 'Goa', 'Dr. Arjun Rao'],
    ['site3', 'Partner Research Centre', 'Jaipur', 'Dr. Nikhil Verma'],
  ])
    add('site', id, title, 'Active', { city, lead, training: true, agreement: true });
  for (let i = 0; i < 18; i++)
    add(
      'visit',
      `v${i}`,
      i % 3 === 0 ? 'Week 8 · Outcome assessment' : 'Week 4 · Follow-up',
      i < 6 ? 'Completed' : 'Scheduled',
      {
        study: 's1',
        participant: `s1-p${i + 1}`,
        due: day(i - 9),
        assessment: 'Vitals, adherence, outcome questionnaire',
        notes: '',
      },
    );
  add('ethics', 'e1', 'NIDRA-05 · Initial protocol review', 'In review', {
    study: 's5',
    due: day(3),
    reviewer: 'Ethics secretariat',
    type: 'Initial application',
    notes: 'Review participant-information sheet and recruitment materials.',
  });
  add('ethics', 'e2', 'SANDHI-03 · Protocol amendment', 'Submitted', {
    study: 's3',
    due: day(5),
    reviewer: 'Ethics secretariat',
    type: 'Amendment',
    notes: 'Proposed additional follow-up visit.',
  });
  add('ethics', 'e3', 'ASHWA-01 · Continuing review', 'Submitted', {
    study: 's1',
    due: day(9),
    reviewer: 'Ethics secretariat',
    type: 'Continuing review',
    notes: '',
  });
  add('safety', 'ae1', 'Gastrointestinal discomfort', 'Under review', {
    study: 's2',
    participant: 's2-p8',
    onset: day(-2),
    severity: 'Mild',
    serious: false,
    product: 'Triphala formulation',
    batch: 'DEMO-TR-024',
    due: day(2),
    outcome: 'Recovering',
    notes: 'Synthetic case; temporal association only.',
    review: '',
  });
  add('safety', 'ae2', 'Hospital admission following dizziness', 'New', {
    study: 's6',
    participant: 's6-p3',
    onset: day(-1),
    severity: 'Severe',
    serious: true,
    criteria: 'Hospitalization',
    product: 'Guduchi formulation',
    batch: 'DEMO-GU-013',
    due: day(0),
    outcome: 'Ongoing',
    notes: 'Synthetic case requiring investigator review.',
    review: '',
  });
  add('safety', 'ae3', 'Transient headache', 'Closed', {
    study: 's1',
    onset: day(-20),
    severity: 'Mild',
    serious: false,
    product: 'Ashwagandha formulation',
    batch: 'DEMO-AS-018',
    outcome: 'Recovered',
    review: 'Demonstration review completed; causality undetermined.',
  });
  for (let i = 0; i < 5; i++)
    add(
      'query',
      `q${i}`,
      [
        'Missing week 4 blood pressure',
        'Confirm assessment date',
        'Resolve dose discrepancy',
        'Missing outcome questionnaire',
        'Confirm laboratory units',
      ][i],
      i === 4 ? 'Resolved' : 'Open',
      {
        study: i % 2 ? 's2' : 's1',
        due: day(i - 2),
        owner: 'Study coordinator',
        response: i === 4 ? 'Units reconciled with source record.' : '',
        notes: 'Please review against the approved source record.',
      },
    );
  add('task', 't1', 'Complete monitoring follow-up', 'Open', {
    study: 's3',
    due: day(2),
    owner: 'Clinical monitor',
    priority: 'High',
    notes: 'Verify corrective actions from the last site visit.',
  });
  add('task', 't2', 'Acknowledge updated consent version', 'Open', {
    study: 's1',
    due: day(4),
    owner: 'Site coordinator',
    priority: 'Normal',
  });
  for (let study = 1; study <= 6; study++) {
    const sid = 's' + study;
    if (study === 5) continue;
    for (let i = 1; i <= 12; i++)
      for (let phase = 0; phase < 3; phase++)
        add(
          'visit',
          `extended-${sid}-${i}-${phase}`,
          ['Baseline assessment', 'Week 4 follow-up', 'Week 8 outcome review'][phase],
          phase === 0 || i === 1 ? 'Completed' : 'Scheduled',
          {
            study: sid,
            participant: `${sid}-p${i}`,
            due: day(i === 1 ? -40 + phase * 14 : phase === 0 ? -20 - i : phase * 14 - i),
            assessment: [
              'Consent verification, eligibility, baseline vitals',
              'Adherence review, vitals, symptom questionnaire',
              'Outcome assessment, safety follow-up',
            ][phase],
            systolic: phase === 0 ? 112 + (i % 17) : undefined,
            diastolic: phase === 0 ? 72 + (i % 12) : undefined,
            pulse: phase === 0 ? 66 + (i % 15) : undefined,
            notes: 'Synthetic visit. No clinical recommendation.',
          },
        );
    for (let j = 0; j < 3; j++)
      add(
        'document',
        `extended-doc-${sid}-${j}`,
        ['Approved study protocol', 'Participant information sheet', 'Monitoring visit report'][j],
        j === 2 ? 'In review' : 'Approved',
        {
          study: sid,
          type: ['Protocol', 'Consent form', 'Monitoring report'][j],
          documentVersion: j === 0 ? '2.1' : '1.0',
          due: day(25 + j * 12),
          notes: 'Synthetic document metadata; no attachment.',
        },
      );
    add('task', `extended-task-${sid}`, 'Reconcile follow-up visit records', 'In progress', {
      study: sid,
      owner: 'Site research officer',
      due: day(study),
      priority: study % 2 ? 'High' : 'Normal',
      notes: 'Compare visit forms with the participant schedule.',
    });
    add('query', `extended-query-${sid}`, 'Verify consent version against approved ICF', 'Open', {
      study: sid,
      owner: 'Data manager',
      due: day(study + 2),
      notes: 'Check version number and consent date in source records.',
    });
  }
  return out;
}
