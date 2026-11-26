import { ChevronLeft, ChevronRight, Download, FileText, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useToast } from '../../components/feedback';
import { FocusLayout } from '../../components/Layouts';
import { Alert, Card, EmptyState, IconButton, PageHeader, SkeletonList, Spinner } from '../../components/ui';
import { CATEGORIES } from '../../utils/format';
import { useApi, usePageTitle } from '../../utils/hooks';
import { savePdf } from '../../utils/pdf';

/** Mockup page 10: shorthand outline viewer with paging, print and save. */
export default function Outline() {
  const { testId } = useParams();
  const toast = useToast();
  const { data, error } = useApi(`/tests/${testId}/outline`);
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const pages = data?.pages || [];
  usePageTitle(data ? `Outline — ${data.title}` : 'Outline');

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
      toast('PDF downloaded');
    } catch {
      toast('Could not create the PDF. Please try Print instead.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FocusLayout>
      <main className="main">
        {error && <Alert tone="error">{error.message} <Link to="/shorthand">Go back</Link></Alert>}
        {!data && !error && <SkeletonList rows={1} height={520} />}
        {data && (
          <>
            <PageHeader
              back={CATEGORIES[data.category]?.path || -1}
              title="Outline"
              subtitle={`${data.title}${data.wpm ? ` · ${data.wpm} WPM` : ''}`}
              actions={pages.length > 0 && (
                <>
                  <button type="button" className="btn" onClick={() => window.print()}><Printer size={16} />Print Pdf</button>
                  <button type="button" className="btn btn--primary" onClick={onSave} disabled={saving}>
                    {saving ? <Spinner /> : <Download size={16} />}Save Pdf
                  </button>
                </>
              )}
            />
            {pages.length === 0 ? (
              <Card><EmptyState icon={FileText} title="Outline not available" text="The outline for this test has not been uploaded yet." /></Card>
            ) : (
              <Card
                className="no-print"
                bodyClass={null}
                title={`Page : ${page + 1}/${pages.length}`}
                icon={FileText}
                actions={(
                  <div className="row">
                    <IconButton label="Previous page" icon={ChevronLeft} disabled={page === 0} onClick={() => setPage(page - 1)} />
                    <IconButton label="Next page" icon={ChevronRight} disabled={page >= pages.length - 1} onClick={() => setPage(page + 1)} />
                  </div>
                )}
              >
                <div className="viewer">
                  <img src={pages[page]} alt={`Outline page ${page + 1} of ${pages.length}`} />
                </div>
              </Card>
            )}
            {/* All pages, used only when printing */}
            <div className="print-only">
              {pages.map((src) => <img key={src} src={src} alt="" className="print-page" />)}
            </div>
          </>
        )}
      </main>
    </FocusLayout>
  );
}
