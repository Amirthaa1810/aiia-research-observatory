import type { RecordData } from './domain';
export function withDemoProfile(r: RecordData): RecordData {
  if (
    r.kind !== 'participant' ||
    !/^s[1-6]-p\d+$/.test(r.id) ||
    !String(r.notes ?? '').includes('Synthetic participant')
  )
    return r;
  const n = Number(r.id.split('-p')[1]);
  const woman = r.sex === 'Female';
  const first = woman
    ? ['Ananya', 'Meera', 'Kavya', 'Priya', 'Nandini', 'Asha', 'Divya', 'Suma']
    : ['Arjun', 'Ravi', 'Kiran', 'Vikram', 'Anil', 'Rahul', 'Suresh', 'Dev'];
  const surnames = ['Sharma', 'Rao', 'Menon', 'Patel', 'Iyer', 'Nair', 'Singh', 'Joshi'];
  const portrait = woman
    ? Number(r.age) > 48
      ? 'woman-58'
      : 'woman-32'
    : Number(r.age) > 38
      ? 'man-45'
      : 'man-28';
  return {
    displayName: first[n % 8] + ' ' + surnames[Math.floor(n / 8) % 8],
    language: ['Hindi', 'English', 'Tamil', 'Marathi'][n % 4],
    heightCm: 152 + (n % 29),
    weightKg: 52 + (n % 32),
    prakriti: ['Vata-Pitta', 'Pitta-Kapha', 'Vata-Kapha'][n % 3],
    allergies: 'Not recorded',
    ...r,
    syntheticProfile: true,
    portrait: '/images/portraits/' + portrait + '.webp',
  };
}
export function photoSource(r: RecordData) {
  return r.photoVersion
    ? '/api/photos?id=' + encodeURIComponent(r.id) + '&v=' + r.photoVersion
    : r.portrait || '';
}
