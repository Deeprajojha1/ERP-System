export default function Toast({ toast }) {
  return (
    <div
      className={`faculty-toast ${toast.show ? "show" : "hide"} ${toast.type}`}
    >
      {toast.text}
    </div>
  );
}
