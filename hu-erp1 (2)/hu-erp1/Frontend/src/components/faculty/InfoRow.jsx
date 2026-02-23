import './InfoRow.css'
function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span className="label">{label}</span>
      <span>{value}</span>
    </div>
  )
}

export default InfoRow
