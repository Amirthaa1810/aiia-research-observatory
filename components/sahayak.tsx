'use client';
import { useState, useEffect } from 'react';
import { Sparkles, Send, ExternalLink } from 'lucide-react';
export default function Sahayak() {
  const [question, setQuestion] = useState(''),
    [jurisdiction, setJurisdiction] = useState('India'),
    [language, setLanguage] = useState('English'),
    [connected, setConnected] = useState(false),
    [useAI, setUseAI] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [history, setHistory] = useState<any[]>([]),
    [purpose, setPurpose] = useState('Medicine'),
    [text, setText] = useState('Unknown'),
    [changed, setChanged] = useState('Unknown');
  useEffect(() => {
    fetch('/api/sahayak')
      .then((r) => r.json())
      .then((d: any) => setConnected(!!d.connected))
      .catch(() => {});
  }, []);
  async function ask(q = question) {
    if (!q.trim() || busy) return;
    setQuestion(q);
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/sahayak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, jurisdiction, language, useAI }),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setHistory((h) => [...h, { ...d, question: q }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="assistant-layout">
      <section className="assistant-main">
        <span className="assistant-icon">
          <Sparkles size={29} />
        </span>
        <h2>IP-SAKTI Research Sahayak</h2>
        <p>Ayurveda research, intellectual property and regulatory reference guidance.</p>
        <div className="assistant-disclosure">
          {connected
            ? 'AI connection available · grounded in a curated reference corpus'
            : 'AI connection pending · source retrieval works now'}
        </div>
        <div className="sahayak-controls">
          <label className="field">
            <span>Jurisdiction</span>
            <select value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}>
              <option>India</option>
              <option>International</option>
            </select>
          </label>
          <label className="field">
            <span>Answer language</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option>English</option>
              <option>Hindi</option>
              <option>Tamil</option>
            </select>
          </label>
        </div>
        <p className="muted">
          International mode covers treaties and standards, not individual country laws. References
          are curated summaries, not a complete legal database.
        </p>
        <form
          className="ask-box"
          onSubmit={(e) => {
            e.preventDefault();
            void ask();
          }}
        >
          <textarea
            maxLength={1500}
            required
            aria-label="Ask Research Sahayak"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Can traditional Ayurvedic knowledge be patented in India?"
          />
          <label className="check-field">
            <input
              type="checkbox"
              disabled={!connected}
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
            />
            Use connected AI: send this question and public references to OpenAI. Do not include
            personal medical details.
          </label>
          <button className="primary" disabled={busy}>
            {busy ? (
              <span className="thinking-dots">Finding guidance…</span>
            ) : (
              <>
                <Send size={16} /> Ask Sahayak
              </>
            )}
          </button>
        </form>
        <div className="suggestions">
          {[
            'Traditional knowledge and patents',
            'CTRI registration before enrolment',
            'Consent and ethics approval',
            'Adverse event reporting',
          ].map((q) => (
            <button className="outline" disabled={busy} key={q} onClick={() => void ask(q)}>
              {q}
            </button>
          ))}
        </div>
        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}
        <div aria-live="polite">
          {history.map((a, i) => (
            <article className="answer panel" key={i}>
              <span className="eyebrow">
                {a.mode === 'ai' ? 'AI WITH RETRIEVED REFERENCES' : 'SOURCE RETRIEVAL'} ·{' '}
                {a.jurisdiction} · {a.language}
              </span>
              <h3>{a.question}</h3>
              {a.notice && <p className="notice-banner">{a.notice}</p>}
              <p className="answer-text">{a.answer}</p>
              {a.sources.map((s: any, n: number) => (
                <a
                  className="source-citation"
                  key={s.id}
                  target="_blank"
                  rel="noreferrer"
                  href={s.url}
                >
                  [{n + 1}] {s.title} <ExternalLink size={13} />
                </a>
              ))}
              <small>
                Corpus {a.corpusVersion}. Verify source applicability with your institutional
                reviewer.
              </small>
            </article>
          ))}
        </div>
      </section>
      <aside className="source-library">
        <h2>Formulation briefing</h2>
        <p>Prepare the minimum facts for a classification review.</p>
        {[
          ['Intended use', purpose, setPurpose, ['Medicine', 'Food / nutrition', 'Cosmetic']],
          ['Authoritative text identified?', text, setText, ['Unknown', 'Yes', 'No']],
          ['Changed ingredients or method?', changed, setChanged, ['Unknown', 'Yes', 'No']],
        ].map(([label, value, set, options]: any) => (
          <label className="field" key={label}>
            <span>{label}</span>
            <select value={value} onChange={(e) => set(e.target.value)}>
              {options.map((o: string) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        ))}
        <p>
          {purpose === 'Medicine' && text === 'Yes' && changed === 'No'
            ? 'A classical formulation may be a candidate for review; the exact text, preparation and claims still need verification.'
            : 'The category needs review. Prepare the complete ingredient list, method, intended claims and any authoritative-text references.'}
        </p>
        <button
          className="outline"
          onClick={() => {
            setJurisdiction('India');
            setQuestion(
              `For an Ayurveda product intended as ${purpose}, authoritative text: ${text}, changed ingredients or method: ${changed}. What information is needed to review its regulatory classification?`,
            );
          }}
        >
          Use these facts in a question
        </button>
        <details className="ai-setup">
          <summary>Connect generative AI</summary>
          <p>
            Configure OPENAI_API_KEY as a server secret and OPENAI_MODEL as a model available to
            your account. Restart localhost or redeploy the hosted site.
          </p>
          <p>
            See docs/openai-integration.md in the project. Never enter the key into a browser
            field or commit it.
          </p>
        </details>
      </aside>
    </div>
  );
}
