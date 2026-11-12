// On and Off as words on traces, the chosen one in ink, with a note under them: a goal's
// Reminders in the editor, Silent in a sticker's link panel. The value is "on" or "off".
export function OnOff({
  id,
  label,
  name,
  on,
  set,
  note,
  className = "",
}: {
  id: string;
  label: string;
  name: string;
  on: boolean;
  set: (on: boolean) => void;
  note: string;
  className?: string;
}) {
  return (
    <div className={`field ${className}`.trim()}>
      <span id={`${id}-label`}>{label}</span>
      <div className="words on-off" role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={`${id}-note`}>
        {[true, false].map((value) => (
          <label key={String(value)}>
            <input type="radio" name={name} value={value ? "on" : "off"} checked={on === value} onChange={() => set(value)} />
            <span className="trace">{value ? "On" : "Off"}</span>
          </label>
        ))}
      </div>
      <p id={`${id}-note`} className="field__note">
        {note}
      </p>
    </div>
  );
}
