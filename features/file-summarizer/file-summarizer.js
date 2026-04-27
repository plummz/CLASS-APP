// File Summarizer Frontend Logic
(function(){
  const fileInput = document.getElementById('fs-file-input');
  const status    = document.getElementById('fs-upload-status');
  const errorBox  = document.getElementById('fs-error');
  const summaryEl = document.getElementById('fs-summary-output');
  const summarySection = document.getElementById('fs-summary-section');
  const copyBtn   = document.getElementById('fs-copy-btn');
  const clearBtn  = document.getElementById('fs-clear-btn');
  const btns = {
    short:   document.getElementById('fs-btn-short'),
    detailed:document.getElementById('fs-btn-detailed'),
    key:     document.getElementById('fs-btn-key'),
    terms:   document.getElementById('fs-btn-terms'),
    quiz:    document.getElementById('fs-btn-quiz'),
  };
  let extractedText = '';
  let fileType = '';

  function resetAll() {
    summaryEl.value = '';
    extractedText = '';
    fileType = '';
    fileInput.value = '';
    status.textContent = '';
    errorBox.textContent = '';
    summarySection.style.display = 'none';
  }

  function setError(msg) {
    errorBox.textContent = msg;
    status.textContent = '';
  }

  function setStatus(msg) {
    status.textContent = msg;
    errorBox.textContent = '';
  }

  fileInput.addEventListener('change', async function(e) {
    resetAll();
    const file = fileInput.files[0];
    if (!file) return;
    if (!/\.(pdf|docx|pptx)$/i.test(file.name)) {
      setError('Unsupported file type. Only PDF, DOCX, and PPTX are allowed.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('File too large. Max 8 MB allowed.');
      return;
    }
    setStatus('Extracting text...');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/summarize-file', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');
      extractedText = data.text || '';
      fileType = data.type || '';
      if (!extractedText) throw new Error('No readable text found in file.');
      setStatus('File loaded. Choose a summary type.');
      summarySection.style.display = 'block';
    } catch(e) {
      setError(e.message);
      summarySection.style.display = 'none';
    }
  });

  async function requestSummary(type) {
    if (!extractedText) return setError('No file loaded.');
    setStatus('Summarizing...');
    summaryEl.value = '';
    errorBox.textContent = '';
    try {
      const res = await fetch('/api/summarize-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractedText, type })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Summary failed');
      summaryEl.value = data.summary || '';
      setStatus('Summary ready.');
    } catch(e) {
      setError(e.message);
    }
  }

  btns.short.addEventListener('click', () => requestSummary('short'));
  btns.detailed.addEventListener('click', () => requestSummary('detailed'));
  btns.key.addEventListener('click', () => requestSummary('key'));
  btns.terms.addEventListener('click', () => requestSummary('terms'));
  btns.quiz.addEventListener('click', () => requestSummary('quiz'));

  copyBtn.addEventListener('click', () => {
    if (summaryEl.value) {
      navigator.clipboard.writeText(summaryEl.value);
      setStatus('Copied!');
    }
  });
  clearBtn.addEventListener('click', resetAll);

  // Hide summary section initially
  summarySection.style.display = 'none';
})();
