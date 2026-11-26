import { Link } from 'react-router-dom';
import { useAuth, homePathFor } from '../context/AuthContext';
import { fmtDate, fullName } from '../utils/format';
import { Avatar } from './ui';

/**
 * Brand top bar (the mockup's green "Steno Drive" band).
 * `person` – whose name/photo to show; defaults to the logged-in user.
 */
export default function Header({ person, badge, showUser = true }) {
  const { user } = useAuth();
  const who = person || (showUser ? user : null);

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <Link to={user ? homePathFor(user) : '/'} className="brand" aria-label="Steno Drive home">
          <img src="/logo.svg" alt="" />
          <span className="brand__name">Steno Drive</span>
        </Link>
        {badge && <span className="brand__tag">{badge}</span>}
        <span className="spacer" />
        {who && (
          <div className="user-chip">
            <div className="user-chip__text">
              <div className="user-chip__name">{fullName(who)}</div>
              <div className="user-chip__meta">
                {who.role === 'ADMIN' ? 'Administrator' : who.username ? `@${who.username}` : 'Student'} · {fmtDate()}
              </div>
            </div>
            <Avatar person={who} size={42} />
          </div>
        )}
      </div>
    </header>
  );
}
