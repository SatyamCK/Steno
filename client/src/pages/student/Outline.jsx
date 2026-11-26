import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import { testLabel } from '../../utils/format';
import { useApi } from '../../utils/hooks';
import { savePdf } from '../../utils/pdf';

/** Mockup page 10: shorthand outline viewer with paging, print and save. */
export default function Outline() {
  const { testId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, error } = useApi(`/tests/${testId}/outline`);
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const pages = data?.pages || [];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setPage((p) => Math.min(p + 1, pages.length - 1));
      if (e.key === 'ArrowLeft') setPage((p) => Math.max(p - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pages.length]);

  const onSave = async () => {
    setSaving(true);
    try {
      const wrap = document.createElement('div');
      pages.forEach((src, i) => {
        const img = document.createElement('img');
        img.src = src;
        img.style.cssText = 'width:100%;display:block;';
        if (i < pages.length - 1) img.style.pageBreakAfter = 'always';
        wrap.appendChild(img);
      });
      await savePdf(wrap, `${data.title} - outline.pdf`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header person={user} showDate />
      <div className="page page--wide outline">
        <h2 className="page-title no-print">Outline</h2>
        {error && <p className="form-error">{error.message} <Link to="/shorthand">Go back</Link></p>}
        {data && <p className="center muted no-print">{testLabel(data)}</p>}
        {data && pages.length === 0 && <p className="empty">Outline has not been uploaded for this test.</p>}

        {pages.length > 0 && (
          <>
            <div className="outline__viewer no-print">
              <button type="button" className="outline__nav" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page">‹</button>
              <div className="outline__paper">
                <img src={pages[page]} alt={`Outline page ${page + 1}`} />
              </div>
              <button type="button" className="outline__nav" disabled={page >= pages.length - 1} onClick={() => setPage(page + 1)} aria-label="Next page">›</button>
            </div>
            {/* All pages, used only when printing */}
            <div className="print-only">
              {pages.map((src) => <img key={src} src={src} alt="" className="print-page" />)}
            </div>
            <div className="outline__footer no-print">
              <span>Page : {page + 1}/{pages.length}</span>
              <span className="spacer" />
              <button type="button" className="btn btn--secondary" onClick={() => navigate(-1)}>Back</button>
              <button type="button" className="btn" onClick={() => window.print()}>Print Pdf</button>
              <button type="button" className="btn" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save Pdf'}</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
