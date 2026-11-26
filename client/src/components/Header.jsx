import { fmtDate, fullName } from '../utils/format';

/**
 * Green "Steno Drive" banner from the mockup.
 * `person` – whose name/photo to show (defaults to nothing on public pages).
 * `showDate` – test pages show the date under the name.
 */
export default function Header({ person, showDate = false, badge }) {
  const initials = person
    ? fullName(person).split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '';

  return (
    <header className="site-header">
      <div className="site-header__left">
        {person && <div className="site-header__name">{fullName(person)}</div>}
        {showDate && <div className="site-header__date">{fmtDate()}</div>}
      </div>
      <h1 className="site-header__title">
        Steno Drive{badge && <span className="site-header__badge">{badge}</span>}
      </h1>
      <div className="site-header__right">
        {person && (
          <div className="avatar" title={fullName(person)}>
            {person.photoUrl ? <img src={person.photoUrl} alt="" /> : <span>{initials || 'SD'}</span>}
          </div>
        )}
      </div>
    </header>
  );
}
