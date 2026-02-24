import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";

const getScoreColor = (score) => {
  if (score >= 80) return "#16a34a";
  if (score >= 60) return "#2563eb";
  if (score >= 40) return "#d97706";
  return "#dc2626";
};

const ScoreGauge = ({ score = 0 }) => {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  const data = [{ name: "Score", value: safeScore, fill: getScoreColor(safeScore) }];

  return (
    <article className="linkedin-chart-card">
      <header className="linkedin-chart-header">
        <h3>Profile Score</h3>
        <p>/100</p>
      </header>
      <div className="linkedin-gauge-wrap">
        <ResponsiveContainer width="100%" height={220}>
          <RadialBarChart
            data={data}
            innerRadius="70%"
            outerRadius="100%"
            barSize={18}
            startAngle={180}
            endAngle={0}
            cx="50%"
            cy="85%"
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" background cornerRadius={9} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="linkedin-gauge-score">{safeScore}</div>
      </div>
    </article>
  );
};

export default ScoreGauge;
