export const corpusVersion = '2026-09-26.1';
export const knowledge = [
  {
    id: 'ctri',
    jurisdiction: 'India',
    title: 'CTRI registration',
    url: 'https://ctri.nic.in/',
    tags: 'ctri registration trial enrolment enrollment registry prospective',
    text: 'Check prospective registration and the issued CTRI number before first participant enrolment. A submission acknowledgement is not a completed registration.',
  },
  {
    id: 'ethics',
    jurisdiction: 'India',
    title: 'ICMR ethical guidelines (2017)',
    url: 'https://ncdirindia.org/Downloads/ICMR_Ethical_Guidelines_2017.pdf',
    tags: 'ethics consent participant approval review rights withdraw',
    text: 'Use an ethics-approved participant information sheet and consent process. Record the approved version and dates. Refer protocol amendments and re-consent questions to the ethics committee.',
  },
  {
    id: 'ndct',
    jurisdiction: 'India',
    title: 'CDSCO new-drug rules and amendments',
    url: 'https://www.cdsco.gov.in/opencms/opencms/en/Acts-and-rules/New-Drugs/',
    tags: 'ndct regulation safety drug classification phytopharmaceutical clinical trial deadline',
    text: 'Determine the applicable product and study category before selecting a regulatory pathway. Check current rules and amendments; this guide does not assign a universal reporting deadline.',
  },
  {
    id: 'class',
    jurisdiction: 'India',
    title: 'Traditional drugs reference',
    url: 'https://www.cdsco.gov.in/opencms/opencms/en/Traditional_Drugs/',
    tags: 'classical proprietary patent ayurveda formulation classify ingredients authoritative text medicine cosmetic food aahar',
    text: 'Collect the intended use, claims, ingredients, preparation method, authoritative-text reference and deviations before asking a regulatory expert to confirm the category. A patent-or-proprietary medicine classification does not itself establish patent protection.',
  },
  {
    id: 'tk',
    jurisdiction: 'India',
    title: 'IP India: traditional knowledge guidelines (2012)',
    url: 'https://ipindia.gov.in/frontend/pdf/patents/guidelines/Guidelines%20for%20Processing%20of%20Patent%20Applications%20relating%20to%20Traditional%20Knowledge%20and%20Biological%20Material%20-%202012.pdf',
    tags: 'patent intellectual property traditional knowledge prior art invention ipr ip sakti ayurveda',
    text: 'The 2012 guidance explains traditional-knowledge exclusions under section 3(p) and mere-admixture issues under section 3(e). Assess novelty and inventive step with a qualified reviewer. This historical source is not sufficient for current biodiversity or benefit-sharing duties.',
  },
  {
    id: 'wipo',
    jurisdiction: 'International',
    title: 'WIPO: patent law and treaties',
    url: 'https://www.wipo.int/en/web/patents/law',
    tags: 'patent international jurisdiction pct territorial treaty intellectual property ipr',
    text: 'Patent protection is territorial. The PCT supports an international filing process; national and regional patent requirements remain relevant. Choose the target country before seeking a country-specific conclusion.',
  },
  {
    id: 'safety',
    jurisdiction: 'India',
    title: 'AIIA pharmacovigilance programme',
    url: 'https://archive.aiia.gov.in/pharmacovigilance/',
    tags: 'safety adverse side effect symptoms pharmacovigilance ae sae report',
    text: 'Record suspected adverse reactions and route them for clinical assessment. A suspected association does not establish causation. Contact the study team about symptoms; this assistant does not diagnose or recommend treatment.',
  },
  {
    id: 'fhir',
    jurisdiction: 'International',
    title: 'HL7 FHIR R4 ResearchStudy',
    url: 'https://hl7.org/fhir/R4/researchstudy.html',
    tags: 'fhir interoperability researchstudy data export',
    text: 'FHIR ResearchStudy represents research study information. Resource export requires implementation-profile validation before institutional integration.',
  },
  {
    id: 'cdisc',
    jurisdiction: 'International',
    title: 'CDISC foundational standards',
    url: 'https://www.cdisc.org/standards/foundational',
    tags: 'cdisc cdash sdtm adam export data standard',
    text: 'CDASH supports collection, SDTM tabulation and ADaM analysis datasets. A CSV export alone is not a validated CDISC submission.',
  },
];
export function retrieve(question: string, jurisdiction: string) {
  const synonyms: Record<string, string> = {
    पेटेंट: 'patent',
    परीक्षण: 'trial',
    सहमति: 'consent',
    दुष्प्रभाव: 'safety',
    आयुर्वेद: 'ayurveda',
    காப்புரிமை: 'patent',
    சம்மதம்: 'consent',
    பக்கவிளைவு: 'safety',
  };
  let q = question.toLowerCase();
  for (const [a, b] of Object.entries(synonyms)) q = q.replaceAll(a, ' ' + b + ' ');
  const words = q
    .split(/[^\p{L}\p{N}]+/u)
    .filter(
      (w) =>
        w.length > 2 &&
        !['the', 'and', 'what', 'how', 'can', 'for', 'with', 'does', 'about'].includes(w),
    );
  return knowledge
    .filter((s) => s.jurisdiction === jurisdiction)
    .map((s) => ({
      ...s,
      score: words.filter((w) => (s.tags + ' ' + s.title).toLowerCase().includes(w)).length,
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
