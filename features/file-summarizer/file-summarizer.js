// File Summarizer Frontend Logic
(function () {
  const fileInput = document.getElementById('fs-file-input');
  const status = document.getElementById('fs-upload-status');
  const errorBox = document.getElementById('fs-error');
  const summaryEl = document.getElementById('fs-summary-output');
  const summarySection = document.getElementById('fs-summary-section');
  const copyBtn = document.getElementById('fs-copy-btn');
  const clearBtn = document.getElementById('fs-clear-btn');
  const btns = {
    short: document.getElementById('fs-btn-short'),
    detailed: document.getElementById('fs-btn-detailed'),
    key: document.getElementById('fs-btn-key'),
    terms: document.getElementById('fs-btn-terms'),
    quiz: document.getElementById('fs-btn-quiz'),
  };
  const actionBtns = Object.values(btns);

  if (!fileInput) {
    console.error('[FileSummarizer] #fs-file-input not found in DOM');
    return;
  }

  // Single source of truth for the selected file
  let selectedFile = null;

  // Initial state
  actionBtns.forEach(b => b.disabled = true);
  if (summarySection) summarySection.style.display = 'none';

  function setError(msg) {
    if (errorBox) errorBox.textContent = msg;
    if (status) status.textContent = '';
  }

  function setStatus(msg) {
    if (status) status.textContent = msg;
    if (errorBox) errorBox.textContent = '';
  }

  function clearAll() {
    selectedFile = null;
    fileInput.value = '';
    setStatus('');
    if (summaryEl) summaryEl.value = '';
    if (summarySection) summarySection.style.display = 'none';
    actionBtns.forEach(b => b.disabled = true);
  }

  // Step 1: file selected — just validate and show info. No network call.
  fileInput.addEventListener('change', function (e) {
    const file = e.target.files && e.target.files[0];

    if (!file) {
      clearAll();
      return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = ['pdf', 'doc', 'docx', 'ppt', 'pptx'];
    if (!allowed.includes(ext)) {
      setError('Unsupported file type. Only PDF, DOC, DOCX, PPT, and PPTX are allowed.');
      fileInput.value = '';
      selectedFile = null;
      actionBtns.forEach(b => b.disabled = true);
      return;
    }

    const maxBytes = 8 * 1024 * 1024; // 8 MB
    if (file.size > maxBytes) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 8 MB allowed.`);
      fileInput.value = '';
      selectedFile = null;
      actionBtns.forEach(b => b.disabled = true);
      return;
    }

    // File is valid — store it and show info immediately, no network round-trip
    selectedFile = file;
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    setStatus(`✅ Ready: ${file.name} • ${sizeMB} MB • .${ext.toUpperCase()}`);
    if (summaryEl) summaryEl.value = '';
    if (summarySection) summarySection.style.display = 'none';
    actionBtns.forEach(b => b.disabled = false);
  });

  // Step 2: summarize button clicked — NOW upload the file and process
  async function requestSummary(type) {
    if (!selectedFile) {
      setError('No file selected. Please choose a PDF, DOC, DOCX, PPT, or PPTX file first.');
      return;
    }

    actionBtns.forEach(b => b.disabled = true);
    if (summaryEl) summaryEl.value = '';
    setStatus(`Uploading and extracting text from “${selectedFile.name}”…`);

    let extractedText = '';
    let fileType = '';

    try {
      const fd = new FormData();
      fd.append('file', selectedFile);

      const extractRes = await fetch('/api/summarize-file', { method: 'POST', body: fd });
      const extractData = await extractRes.json();

      if (!extractRes.ok) throw new Error(extractData.error || 'Text extraction failed.');
      extractedText = extractData.text || '';
      fileType = extractData.type || '';

      if (!extractedText.trim()) throw new Error('No readable text found in this file.');

    } catch (err) {
      setError(err.message || 'Upload or extraction failed. Please try again.');
      actionBtns.forEach(b => b.disabled = false);
      return;
    }

    setStatus('Summarizing…');

    try {
      const sumRes = await fetch('/api/summarize-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractedText, type }),
      });
      const sumData = await sumRes.json();
      if (!sumRes.ok) throw new Error(sumData.error || 'Summarization failed.');

      if (summaryEl) summaryEl.value = sumData.summary || '';
      if (summarySection) summarySection.style.display = 'block';

      // Attempt to save to Reviewers / Notepad via Supabase
      const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
      const user = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);

      if (client && user && user.username) {
        try {
          setStatus('Saving to private Notepad…');
          const { error: dbErr } = await client.from('reviewers').insert([{
            user_id: user.username,
            title: `${selectedFile.name} (${type})`,
            original_file_name: selectedFile.name,
            summary_content: sumData.summary,
            summary_type: type,
            contributor_name: user.username,
            is_shared: false,
          }]);
          if (dbErr) {
            console.error('[FileSummarizer] Supabase insert error:', dbErr);
            setStatus('Summary ready. (Could not save to Notepad.)');
          } else {
            setStatus('Summary ready — saved to your private Notepad!');
          }
        } catch (dbEx) {
          console.error('[FileSummarizer] Supabase exception:', dbEx);
          setStatus('Summary ready.');
        }
      } else {
        setStatus('Summary ready.');
      }
    } catch (err) {
      setError(err.message || 'Summarization failed. Please try again.');
    }

    actionBtns.forEach(b => b.disabled = false);
  }

  btns.short.addEventListener('click', () => requestSummary('short'));
  btns.detailed.addEventListener('click', () => requestSummary('detailed'));
  btns.key.addEventListener('click', () => requestSummary('key'));
  btns.terms.addEventListener('click', () => requestSummary('terms'));
  btns.quiz.addEventListener('click', () => requestSummary('quiz'));

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (summaryEl && summaryEl.value) {
        navigator.clipboard.writeText(summaryEl.value).then(() => setStatus('Copied to clipboard!'));
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', clearAll);
  }
})();
