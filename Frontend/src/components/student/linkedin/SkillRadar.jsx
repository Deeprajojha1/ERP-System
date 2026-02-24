import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const SkillRadar = ({ dimensionScores = {} }) => {
  const data = [
    { metric: "Headline", value: Number(dimensionScores.headline || 0) },
    { metric: "About", value: Number(dimensionScores.about || 0) },
    { metric: "Skills", value: Number(dimensionScores.skills || 0) },
    {
      metric: "Keywords",
      value: Number(dimensionScores.keywordAlignment || 0),
    },
  ];

  return (
    <article className="linkedin-chart-card">
      <header className="linkedin-chart-header">
        <h3>Skill Alignment Radar</h3>
        <p>Dimension-wise quality</p>
      </header>
      <div className="linkedin-radar-wrap">
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
            <PolarGrid stroke="#cbd5e1" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: "#334155", fontSize: 12 }} />
            <Tooltip formatter={(value) => [`${value}/100`, "Score"]} />
            <Radar
              name="Score"
              dataKey="value"
              stroke="#2563eb"
              fill="#60a5fa"
              fillOpacity={0.45}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
};

export default SkillRadar;
