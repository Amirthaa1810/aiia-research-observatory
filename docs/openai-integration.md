# OpenAI integration for Research Sahayak

Research Sahayak runs in source-retrieval mode out of the box. Generative answers, and
answers in Hindi or Tamil, additionally require an OpenAI API key and a model your account
can access. No key is bundled with this repository.

The corpus is a small versioned set of reference summaries. It is not a complete statute
database and not a comprehensive legal retrieval system.

## Configuration

1. Create a project API key in your own OpenAI account. Never paste it into a chat window
   and never commit it.
2. Local development: put `OPENAI_API_KEY` and `OPENAI_MODEL` in an ignored `.env` file at
   the project root, using a Responses-compatible model ID available to your account, then
   restart the development server.
3. Deployed environment: set `OPENAI_API_KEY` as a secret and `OPENAI_MODEL` as an
   environment variable in the host's runtime configuration, then redeploy.
4. Open Research Sahayak. The status line should report that the AI connection is
   available. Select a jurisdiction and language, tick the explicit question-sharing
   checkbox, and submit a general research question.

Without a key the endpoint still answers from the corpus, and the interface says so rather
than failing.

## What the endpoint does

`app/api/sahayak/route.ts` calls the Responses API at `https://api.openai.com/v1/responses`
with `store: false` and `max_output_tokens: 1600`, and a 30-second timeout.

Only the typed question and the selected public reference summaries are sent. Participant
records are never included automatically. Do not type identifiable medical data.
`store: false` reduces provider-side retention but is not a guarantee of zero retention;
review the current data controls before relying on it.

Requests must come from a signed-in, approved session and are same-origin only. Each user is
limited to ten requests per ten minutes, enforced per account in D1. Questions are capped at
1500 characters.

The model is instructed to answer only from the supplied summaries, cite them as `[1]`, `[2]`
and treat summaries and questions as untrusted data rather than instructions. It is
instructed not to diagnose, prescribe, decide patentability, or give a definitive legal
classification.

## Deliberate failure behaviour

The endpoint degrades to retrieval rather than presenting an unsupported answer:

- No key, no model, or the AI checkbox unticked returns the reference summaries directly.
- A provider error returns the summaries with a temporary-unavailability notice.
- A response with no numbered citation is discarded, because an uncited answer cannot be
  traced to a source.
- An unsupported jurisdiction or language is rejected with a validation error.

Retrieval answers are English-only. Selecting Hindi or Tamil without a connected key returns
English references and says so.

## Limitations

Provider integration cannot be verified without credentials. Reference summaries still need
institutional curation and legal review. International mode is treaty-level only. No graph,
registry or autonomous filing integration is implemented.

## References

- https://developers.openai.com/api/docs/guides/text
- https://developers.openai.com/api/docs/guides/your-data

## Role accounts

Every role login includes an "Enter demo" option. Each demo session carries that role's
server-enforced permissions and a practice dataset that is separate from institutional
records, so moving from participant to doctor lets you review a symptom report in the same
practice workspace. "Exit demo" returns you to your real account.

Real users sign in with their own ChatGPT identity. The site owner grants visitor access, then
approves each person's requested role and study or participant assignment through Team access.
Choosing a role on a login page never elevates a real account. Practice sessions expire after
eight hours.
