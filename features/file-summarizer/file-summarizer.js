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
  };
  const quizToggle = document.getElementById('fs-btn-quiz-toggle');
  const quizDropdown = document.getElementById('fs-quiz-dropdown');
  const quizTypeButtons = Array.from(document.querySelectorAll('.fs-quiz-option'));
  const quizCountButtons = Array.from(document.querySelectorAll('.fs-quiz-count'));
  const actionBtns = Object.values(btns).concat(quizToggle);

  if (!fileInput) {
    console.error('[FileSummarizer] #fs-file-input not found in DOM');
    return;
  }

  let selectedFile = null;
  let quizSettings = { type: null, count: 10 };

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
    quizDropdown.style.display = 'none';
    quizTypeButtons.forEach(b => b.classList.remove('selected'));
    quizCountButtons.forEach(b => b.classList.remove('selected'));
    quizSettings = { type: null, count: 10 };
  }

  // Quiz dropdown logic
  quizToggle.addEventListener('click', () => {
    quizDropdown.style.display = quizDropdown.style.display === 'none' ? 'block' : 'none';
  });

  quizTypeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      quizTypeButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      quizSettings.type = btn.dataset.quizType;
    });
  });

  quizCountButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      quizCountButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      quizSettings.count = parseInt(btn.dataset.quizCount);
      // Generate quiz after count is selected
      if (quizSettings.type && selectedFile) {
        quizDropdown.style.display = 'none';
        requestQuiz();
      }
    });
  });

  // File selection
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

    const maxBytes = 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 8 MB allowed.`);
      fileInput.value = '';
      selectedFile = null;
      actionBtns.forEach(b => b.disabled = true);
      return;
    }

    selectedFile = file;
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    setStatus(`✅ Ready: ${file.name} • ${sizeMB} MB • .${ext.toUpperCase()}`);
    if (summaryEl) summaryEl.value = '';
    if (summarySection) summarySection.style.display = 'none';
    actionBtns.forEach(b => b.disabled = false);
  });

  // Summarize request
  async function requestSummary(type) {
    if (!selectedFile) {
      setError('No file selected. Please choose a PDF, DOC, DOCX, PPT, or PPTX file first.');
      return;
    }

    actionBtns.forEach(b => b.disabled = true);
    if (summaryEl) summaryEl.value = '';
    setStatus(`Uploading and extracting text from "${selectedFile.name}"…`);

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

      // Save to Notepad
      const user = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
      const userId = user?.username || 'guest';

      try {
        setStatus('Saving to private Notepad…');

        const typeLabel = {
          short: 'Short Summary', detailed: 'Detailed Notes',
          key: 'Key Points', terms: 'Terms & Definitions', quiz: 'Quiz',
        }[type] || type;

        const newNote = {
          title: `${selectedFile.name} — ${typeLabel}`,
          content: sumData.summary,
          date: new Date().toISOString(),
          type: 'file-summary',
          userId,
        };

        console.log('[FileSummarizer] Saving to Notepad:', { title: newNote.title, userId, date: newNote.date });

        const existing = JSON.parse(localStorage.getItem('notepad-notes') || '[]');
        existing.unshift(newNote);
        localStorage.setItem('notepad-notes', JSON.stringify(existing));

        if (window.notepadModule) {
          window.notepadModule.notes = existing;
        }

        const verify = JSON.parse(localStorage.getItem('notepad-notes') || '[]');
        const saved = verify.some(n => n.date === newNote.date);
        if (saved) {
          console.log('[FileSummarizer] Note saved successfully. Total notes:', verify.length);
          setStatus('Summary ready — saved to your private Notepad!');
        } else {
          console.error('[FileSummarizer] Verification failed — note not found after save.');
          setStatus('Summary generated, but could not save to Notepad.');
        }
      } catch (saveErr) {
        console.error('[FileSummarizer] Failed to save to Notepad:', saveErr);
        setStatus('Summary generated, but could not save to Notepad.');
      }
    } catch (err) {
      setError(err.message || 'Summarization failed. Please try again.');
    }

    actionBtns.forEach(b => b.disabled = false);
  }

  // Quiz generation
  async function requestQuiz() {
    if (!selectedFile) {
      setError('No file selected.');
      return;
    }

    if (!quizSettings.type || !quizSettings.count) {
      setError('Please select quiz type and number of items.');
      return;
    }

    actionBtns.forEach(b => b.disabled = true);
    if (summaryEl) summaryEl.value = '';
    setStatus(`Uploading and extracting text from "${selectedFile.name}"…`);

    let extractedText = '';

    try {
      const fd = new FormData();
      fd.append('file', selectedFile);

      const extractRes = await fetch('/api/summarize-file', { method: 'POST', body: fd });
      const extractData = await extractRes.json();

      if (!extractRes.ok) throw new Error(extractData.error || 'Text extraction failed.');
      extractedText = extractData.text || '';
      if (!extractedText.trim()) throw new Error('No readable text found in this file.');
    } catch (err) {
      setError(err.message || 'Upload or extraction failed.');
      actionBtns.forEach(b => b.disabled = false);
      return;
    }

    setStatus(`Generating ${quizSettings.count}-item ${quizSettings.type} quiz…`);

    try {
      const quizPrompts = {
        'identification': `Generate exactly ${quizSettings.count} identification questions (statement completion). Format each as: Q#: [question]. No answer keys needed.`,
        'multiple-choice': `Generate exactly ${quizSettings.count} multiple choice questions with 4 choices each. Format: Q#: [question] A) [choice] B) [choice] C) [choice] D) [choice]. Mark the correct answer with **A)** or similar.`,
        'both': `Generate exactly ${Math.ceil(quizSettings.count/2)} identification questions and ${Math.floor(quizSettings.count/2)} multiple choice questions (4 choices each).`
      };

      const prompt = quizPrompts[quizSettings.type] || quizPrompts['multiple-choice'];

      const quizRes = await fetch('/api/summarize-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractedText, type: 'quiz', customPrompt: prompt }),
      });

      const quizData = await quizRes.json();
      if (!quizRes.ok) throw new Error(quizData.error || 'Quiz generation failed.');

      // Format quiz display
      const quizHtml = formatQuizDisplay(quizData.summary, quizSettings.type);
      if (summaryEl) summaryEl.value = quizHtml;
      if (summarySection) summarySection.style.display = 'block';

      setStatus('Quiz ready!');
    } catch (err) {
      setError(err.message || 'Quiz generation failed. Please try again.');
    }

    actionBtns.forEach(b => b.disabled = false);
  }

  // Format quiz for display
  function formatQuizDisplay(quizText, quizType) {
    // Return the quiz text as-is; styling will be handled by CSS
    return quizText;
  }

  // Event listeners
  btns.short.addEventListener('click', () => requestSummary('short'));
  btns.detailed.addEventListener('click', () => requestSummary('detailed'));
  btns.key.addEventListener('click', () => requestSummary('key'));
  btns.terms.addEventListener('click', () => requestSummary('terms'));

  // Close dropdown when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#fs-quiz-menu-wrap')) {
      quizDropdown.style.display = 'none';
    }
  });

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
