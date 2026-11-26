/** Save an element (or detached element) as a PDF file. html2pdf is loaded on demand. */
export async function savePdf(element, filename) {
  const { default: html2pdf } = await import('html2pdf.js');
  await html2pdf()
    .set({
      margin: [10, 10, 10, 10],
      filename: filename.replace(/[^\wऀ-ॿ .–-]+/g, '_'),
      image: { type: 'jpeg', quality: 0.95 },
      // Skip on-screen-only controls, same as the print stylesheet does.
      html2canvas: { scale: 2, useCORS: true, ignoreElements: (el) => el.classList?.contains('no-print') },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    })
    .from(element)
    .save();
}

export const printPage = () => window.print();
