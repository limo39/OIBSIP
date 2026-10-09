export default function Field({ label, error, textarea, ...props }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {textarea ? <textarea className="input min-h-24" {...props} /> : <input className="input" {...props} />}
      {error && <span className="mt-1 block text-xs text-ember">{error}</span>}
    </label>
  );
}
