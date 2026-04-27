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
  const actionBtns = Object.values(btns);
  let extractedText = '';
  let fileType = '';

  if (!fileInput) {
    console.error('File input element not found');
    return;
  }

  // Initial state: disable action buttons
  actionBtns.forEach(b => b.disabled = true);

  function resetAll(keepFile = false) {
    summaryEl.value = '';
    extractedText = '';
    fileType = '';
    if (!keepFile) {
      fileInput.value = '';
      status.textContent = '';
      errorBox.textContent = '';
      actionBtns.forEach(b => b.disabled = true);
    }
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
    const file = e.target?.files[0];
    resetAll(true); // reset UI but keep file in input
    if (!file) return;
    
    // UI feedback for file selection
    setStatus(`Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    if (!/\.(pdf|doc|docx|ppt|pptx)$/i.test(file.name)) {
      setError('Unsupported file type. Only PDF, DOCX, and PPTX are allowed.');
      fileInput.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('File too large. Max 8 MB allowed.');
      fileInput.value = '';
      return;
    }
    setStatus(`Extracting text from ${file.name}...`);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/summarize-file', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');
      extractedText = data.text || '';
      fileType = data.type || '';
      if (!extractedText) throw new Error('No readable text found in file.');
      setStatus(`File "${file.name}" loaded. Choose a summary type below.`);
      actionBtns.forEach(b => b.disabled = false);
      summarySection.style.display = 'block';
    } catch(e) {
      setError(e.message);
      actionBtns.forEach(b => b.disabled = true);
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
      
      // Save to Notepad / Reviewers in Supabase
      const client = window.sb || (typeof sb !== 'undefined' ? sb : null);
      const user = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);

      if (client && user?.username) {
        try {
          setStatus('Saving to private Notepad...');
          const { error } = await client.from('reviewers').insert([{
            user_id: user.username,
            title: `${fileInput.files[0].name} (${type})`,
            original_file_name: fileInput.files[0].name,
            summary_content: data.summary,
            summary_type: type,
            contributor_name: user.username,
            is_shared: false
          }]);
          if (error) console.error('Failed to save reviewer', error);
          else setStatus('Summary ready & saved to Notepad!');
        } catch(err) {
          console.error(err);
          setStatus('Summary ready.');
        }
      } else {
        setStatus('Summary ready.');
      }
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
