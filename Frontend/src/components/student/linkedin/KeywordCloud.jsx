const KeywordCloud = ({ keywords = [] }) => (
  <article className="linkedin-chart-card">
    <header className="linkedin-chart-header">
      <h3>Keyword Optimization</h3>
      <p>Use these in headline/about/experience</p>
    </header>
    {keywords.length ? (
      <div className="linkedin-keyword-cloud">
        {keywords.map((keyword, index) => {
          const fontSize = 12 + Math.max(0, 20 - index);
          return (
            <span
              key={`${keyword}-${index}`}
              className="linkedin-keyword-chip"
              style={{ fontSize: `${fontSize}px` }}
            >
              {keyword}
            </span>
          );
        })}
      </div>
    ) : (
      <p className="linkedin-muted">Keywords will appear after analysis.</p>
    )}
  </article>
);

export default KeywordCloud;
