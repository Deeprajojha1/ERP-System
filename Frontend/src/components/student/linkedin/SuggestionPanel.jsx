const SuggestionPanel = ({
  suggestions = [],
  missingSkills = [],
  strengths = [],
  concerns = [],
  summary = "",
}) => (
  <section className="linkedin-suggestions-grid">
    <article className="linkedin-list-card">
      <h3>Improvement Suggestions</h3>
      {suggestions.length ? (
        <ul>
          {suggestions.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="linkedin-muted">No suggestions available yet.</p>
      )}
    </article>

    <article className="linkedin-list-card">
      <h3>Missing Skills</h3>
      {missingSkills.length ? (
        <ul>
          {missingSkills.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="linkedin-muted">No major skill gaps detected.</p>
      )}
    </article>

    <article className="linkedin-list-card">
      <h3>Strengths</h3>
      {strengths.length ? (
        <ul>
          {strengths.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="linkedin-muted">Add more measurable achievements to build strengths.</p>
      )}
    </article>

    <article className="linkedin-list-card">
      <h3>Concerns</h3>
      {concerns.length ? (
        <ul>
          {concerns.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="linkedin-muted">No critical concerns detected.</p>
      )}
    </article>

    {summary ? (
      <article className="linkedin-summary-card">
        <h3>AI Summary</h3>
        <p>{summary}</p>
      </article>
    ) : null}
  </section>
);

export default SuggestionPanel;
