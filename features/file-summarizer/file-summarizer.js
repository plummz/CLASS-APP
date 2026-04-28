// File Summarizer — v1.5.34
(function () {
  // ── DOM refs ───────────────────────────────────────────────
  const fileInput   = document.getElementById('fs-file-input');
  const uploadLabel = document.getElementById('fs-upload-label');
  const status      = document.getElementById('fs-upload-status');
  const errorBox    = document.getElementById('fs-error');
  const summaryEl   = document.getElementById('fs-summary-output');
  const summarySection = document.getElementById('fs-summary-section');
  const copyBtn     = document.getElementById('fs-copy-btn');
  const clearBtn    = document.getElementById('fs-clear-btn');

  const btnShort    = document.getElementById('fs-btn-short');
  const btnDetailed = document.getElementById('fs-btn-detailed');
  const btnKey      = document.getElementById('fs-btn-key');
  const btnTerms    = document.getElementById('fs-btn-terms');
  const btnQuiz     = document.getElementById('fs-btn-quiz');
  const summaryBtns = [btnShort, btnDetailed, btnKey, btnTerms];

  const quizTypeChips  = Array.from(document.querySelectorAll('.fs-chip[data-quiz-type]'));
  const quizCountChips = Array.from(document.querySelectorAll('.fs-chip[data-quiz-count]'));
  const quizSelection  = document.getElementById('fs-quiz-selection');

  // Quiz modal refs
  const quizModal      = document.getElementById('fs-quiz-modal');
  const quizProgress   = document.getElementById('fs-quiz-progress');
  const quizTimer      = document.getElementById('fs-quiz-timer');
  const quizQText      = document.getElementById('fs-quiz-question-text');
  const quizChoices    = document.getElementById('fs-quiz-choices');
  const quizFeedback   = document.getElementById('fs-quiz-feedback');
  const quizNextBtn    = document.getElementById('fs-quiz-next-btn');

  // Score screen refs
  const quizScore      = document.getElementById('fs-quiz-score');
  const scoreEmoji     = document.getElementById('fs-quiz-score-emoji');
  const scoreText      = document.getElementById('fs-quiz-score-text');
  const scoreDetail    = document.getElementById('fs-quiz-score-detail');
  const quizRestartBtn = document.getElementById('fs-quiz-restart-btn');
  const quizCloseBtn   = document.getElementById('fs-quiz-close-btn');

  if (!fileInput) return;

  // ── State ──────────────────────────────────────────────────
  let selectedFile    = null;
  let extractedText   = '';
  let quizSettings    = { type: null, count: null };
  let activeQuestions = [];
  let quizCurrent     = 0;
  let quizScore_val   = 0;
  let quizTimerID     = null;
  let quizTimeLeft    = 10;
  let quizAnswered    = false;

  // ── Helpers ────────────────────────────────────────────────
  function setError(msg) {
    if (errorBox) { errorBox.textContent = msg; }
    if (status)   { status.textContent = ''; }
  }
  function setStatus(msg) {
    if (status)   { status.textContent = msg; }
    if (errorBox) { errorBox.textContent = ''; }
  }
  function setSummaryBtnsDisabled(disabled) {
    summaryBtns.forEach(b => b && (b.disabled = disabled));
    if (btnQuiz) btnQuiz.disabled = disabled || !quizSettings.type || !quizSettings.count;
  }

  function clearAll() {
    selectedFile  = null;
    extractedText = '';
    fileInput.value = '';
    setStatus('');
    setError('');
    if (summaryEl) summaryEl.value = '';
    if (summarySection) summarySection.style.display = 'none';
    setSummaryBtnsDisabled(true);
    if (uploadLabel) {
      uploadLabel.querySelector('.fs-upload-main').textContent = 'Tap to upload a file';
      uploadLabel.querySelector('.fs-upload-sub').textContent  = 'PDF · DOCX · PPTX — max 8 MB';
    }
  }

  function updateQuizSelection() {
    if (!quizSettings.type && !quizSettings.count) {
      quizSelection.textContent = 'Select type and count above';
    } else if (quizSettings.type && !quizSettings.count) {
      const label = quizSettings.type === 'multiple-choice' ? 'Multiple Choice'
        : quizSettings.type === 'identification' ? 'Identification' : 'Both';
      quizSelection.textContent = `Selected: ${label} • choose count`;
    } else if (!quizSettings.type && quizSettings.count) {
      quizSelection.textContent = `Selected: ${quizSettings.count} items • choose type`;
    } else {
      const label = quizSettings.type === 'multiple-choice' ? 'Multiple Choice'
        : quizSettings.type === 'identification' ? 'Identification' : 'Both';
      quizSelection.textContent = `✓ ${label} • ${quizSettings.count} items`;
    }
    if (btnQuiz) btnQuiz.disabled = !selectedFile || !quizSettings.type || !quizSettings.count;
  }

  // ── File selection ─────────────────────────────────────────
  fileInput.addEventListener('change', function (e) {
    const file = e.target.files && e.target.files[0];
    if (!file) { clearAll(); return; }

    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = ['pdf', 'doc', 'docx', 'ppt', 'pptx'];
    if (!allowed.includes(ext)) {
      setError('Unsupported file. Only PDF, DOC, DOCX, PPT, PPTX allowed.');
      fileInput.value = '';
      selectedFile = null;
      setSummaryBtnsDisabled(true);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError(`File too large (${(file.size/1024/1024).toFixed(1)} MB). Max 8 MB.`);
      fileInput.value = '';
      selectedFile = null;
      setSummaryBtnsDisabled(true);
      return;
    }

    selectedFile  = file;
    extractedText = '';
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    if (uploadLabel) {
      uploadLabel.querySelector('.fs-upload-main').textContent = `✅ ${file.name}`;
      uploadLabel.querySelector('.fs-upload-sub').textContent  = `${sizeMB} MB · .${ext.toUpperCase()}`;
    }
    setStatus('');
    setError('');
    if (summaryEl) summaryEl.value = '';
    if (summarySection) summarySection.style.display = 'none';
    setSummaryBtnsDisabled(false);
    updateQuizSelection();
  });

  // ── Extract text (shared step) ────────────────────────────
  async function extractText() {
    if (extractedText) return extractedText; // cached

    if (!selectedFile) throw new Error('No file selected.');

    setStatus(`Extracting text from "${selectedFile.name}"…`);
    setSummaryBtnsDisabled(true);

    const fd = new FormData();
    fd.append('file', selectedFile);

    const res  = await fetch('/api/summarize-file', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Extraction failed.');
    if (!data.text || !data.text.trim()) throw new Error('No readable text found in this file.');

    extractedText = data.text;
    return extractedText;
  }

  // ── Summary request ────────────────────────────────────────
  async function requestSummary(type) {
    if (!selectedFile) { setError('No file selected.'); return; }

    setError('');
    setSummaryBtnsDisabled(true);
    if (summaryEl) summaryEl.value = '';
    if (summarySection) summarySection.style.display = 'none';

    try {
      const text = await extractText();
      setStatus('Generating summary…');

      const res  = await fetch('/api/summarize-file', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Summarization failed.');

      if (summaryEl) summaryEl.value = data.summary || '';
      if (summarySection) summarySection.style.display = 'block';

      // Save to Notepad
      saveToNotepad(selectedFile.name, type, data.summary);

    } catch (err) {
      setError(err.message || 'Failed. Please try again.');
    } finally {
      setSummaryBtnsDisabled(false);
    }
  }

  // ── Notepad save ───────────────────────────────────────────
  function saveToNotepad(fileName, type, summary) {
    try {
      const user = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
      const userId = user?.username || 'guest';
      const typeLabel = { short:'Short Summary', detailed:'Detailed Notes', key:'Key Points', terms:'Terms' }[type] || type;

      const note = {
        title:   `${fileName} — ${typeLabel}`,
        content: summary,
        date:    new Date().toISOString(),
        type:    'file-summary',
        userId,
      };

      const notes = JSON.parse(localStorage.getItem('notepad-notes') || '[]');
      notes.unshift(note);
      localStorage.setItem('notepad-notes', JSON.stringify(notes));
      if (window.notepadModule) window.notepadModule.notes = notes;

      const ok = JSON.parse(localStorage.getItem('notepad-notes') || '[]').some(n => n.date === note.date);
      setStatus(ok ? 'Summary ready — saved to your Notepad!' : 'Summary ready.');
      console.log('[FileSummarizer] Saved to notepad:', note.title);
    } catch (e) {
      setStatus('Summary ready. (Could not save to Notepad.)');
      console.error('[FileSummarizer] Notepad save error:', e);
    }
  }

  // ── Quiz chip selection ────────────────────────────────────
  quizTypeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      quizTypeChips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      quizSettings.type = chip.dataset.quizType;
      updateQuizSelection();
    });
  });

  quizCountChips.forEach(chip => {
    chip.addEventListener('click', () => {
      quizCountChips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      quizSettings.count = parseInt(chip.dataset.quizCount);
      updateQuizSelection();
    });
  });

  // ── Start Quiz ─────────────────────────────────────────────
  if (btnQuiz) {
    btnQuiz.addEventListener('click', async () => {
      if (!selectedFile) { setError('No file selected.'); return; }
      if (!quizSettings.type || !quizSettings.count) {
        setError('Select quiz type and number of items first.');
        return;
      }

      setError('');
      setSummaryBtnsDisabled(true);
      btnQuiz.textContent = 'Generating Quiz…';

      try {
        const text = await extractText();
        setStatus('Building quiz…');

        const res  = await fetch('/api/quiz', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ text, quizType: quizSettings.type, count: quizSettings.count }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Quiz generation failed.');
        if (!data.questions?.length) throw new Error('No questions returned.');

        setStatus('');
        activeQuestions = data.questions;
        startQuiz();

      } catch (err) {
        setError(err.message || 'Quiz failed. Please try again.');
      } finally {
        setSummaryBtnsDisabled(false);
        btnQuiz.textContent = 'Start Quiz';
      }
    });
  }

  // ── Quiz Engine ────────────────────────────────────────────
  function startQuiz() {
    quizCurrent   = 0;
    quizScore_val = 0;
    quizAnswered  = false;
    quizModal.classList.add('active');
    showQuestion();
  }

  function stopTimer() {
    clearInterval(quizTimerID);
    quizTimerID = null;
  }

  function startTimer() {
    stopTimer();
    quizTimeLeft = 10;
    quizTimer.textContent = quizTimeLeft;
    quizTimer.classList.remove('urgent');

    quizTimerID = setInterval(() => {
      quizTimeLeft--;
      quizTimer.textContent = quizTimeLeft;
      if (quizTimeLeft <= 3) quizTimer.classList.add('urgent');
      if (quizTimeLeft <= 0) {
        stopTimer();
        if (!quizAnswered) timeUp();
      }
    }, 1000);
  }

  function showQuestion() {
    const q = activeQuestions[quizCurrent];
    if (!q) { endQuiz(); return; }

    quizAnswered = false;
    quizFeedback.className = 'fs-quiz-feedback';
    quizFeedback.textContent = '';
    quizNextBtn.style.display = 'none';
    quizChoices.innerHTML = '';
    quizTimer.classList.remove('urgent');

    quizProgress.textContent = `Q ${quizCurrent + 1} / ${activeQuestions.length}`;
    quizQText.textContent = q.text;

    if (q.type === 'multiple-choice' && q.choices?.length) {
      q.choices.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.className = 'fs-quiz-choice-btn';
        btn.textContent = choice;
        btn.addEventListener('click', () => submitMCAnswer(i, q));
        quizChoices.appendChild(btn);
      });
    } else {
      // Identification
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'fs-quiz-id-input';
      input.placeholder = 'Type your answer…';
      input.autocomplete = 'off';

      const submit = document.createElement('button');
      submit.className = 'fs-quiz-id-submit';
      submit.textContent = 'Submit';
      submit.addEventListener('click', () => submitIdAnswer(input.value, q, input, submit));
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') submit.click();
      });

      quizChoices.appendChild(input);
      quizChoices.appendChild(submit);
      setTimeout(() => input.focus(), 80);
    }

    startTimer();
  }

  function submitMCAnswer(choiceIndex, q) {
    if (quizAnswered) return;
    quizAnswered = true;
    stopTimer();

    const choiceBtns = quizChoices.querySelectorAll('.fs-quiz-choice-btn');
    choiceBtns.forEach(b => b.disabled = true);

    const correctLetter = (q.answer || '').trim().toUpperCase();
    const letters = ['A','B','C','D'];
    const correctIdx = letters.indexOf(correctLetter);

    const isCorrect = choiceIndex === correctIdx;
    if (isCorrect) quizScore_val++;

    choiceBtns[choiceIndex].classList.add(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect && correctIdx >= 0) choiceBtns[correctIdx].classList.add('correct');

    showFeedback(isCorrect, q);
  }

  function submitIdAnswer(value, q, inputEl, submitBtn) {
    if (quizAnswered) return;
    quizAnswered = true;
    stopTimer();

    if (inputEl) inputEl.disabled = true;
    if (submitBtn) submitBtn.disabled = true;

    const userAnswer = value.trim().toLowerCase();
    const correct    = (q.answer || '').trim().toLowerCase();
    const isCorrect  = userAnswer === correct || userAnswer.includes(correct) || correct.includes(userAnswer);

    if (isCorrect) quizScore_val++;
    showFeedback(isCorrect, q);
  }

  function timeUp() {
    quizAnswered = true;

    // Disable all inputs
    quizChoices.querySelectorAll('button, input').forEach(el => el.disabled = true);

    // Reveal correct answer for MC
    const q = activeQuestions[quizCurrent];
    if (q.type === 'multiple-choice') {
      const choiceBtns = quizChoices.querySelectorAll('.fs-quiz-choice-btn');
      const letters = ['A','B','C','D'];
      const correctIdx = letters.indexOf((q.answer || '').trim().toUpperCase());
      if (correctIdx >= 0) choiceBtns[correctIdx]?.classList.add('correct');
    }

    showFeedback(false, q, true);
  }

  function showFeedback(isCorrect, q, timedOut = false) {
    const msg = timedOut
      ? `⏰ Time's up! The answer is: ${q.answer}${q.explanation ? '. ' + q.explanation : ''}`
      : isCorrect
        ? `✓ Correct!${q.explanation ? ' ' + q.explanation : ''}`
        : `✗ Incorrect. The answer is: ${q.answer}${q.explanation ? '. ' + q.explanation : ''}`;

    quizFeedback.className = 'fs-quiz-feedback ' + (isCorrect ? 'correct' : 'wrong');
    quizFeedback.textContent = msg;
    quizNextBtn.style.display = 'block';
  }

  function endQuiz() {
    quizModal.classList.remove('active');
    stopTimer();

    const total   = activeQuestions.length;
    const pct     = total ? Math.round((quizScore_val / total) * 100) : 0;
    const emoji   = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '📖';
    const comment = pct >= 80 ? 'Excellent work!' : pct >= 50 ? 'Good effort!' : 'Keep studying!';

    scoreEmoji.textContent = emoji;
    scoreText.textContent  = `${quizScore_val} / ${total} correct (${pct}%)`;
    scoreDetail.textContent = comment;
    quizScore.classList.add('active');
  }

  // ── Quiz navigation ────────────────────────────────────────
  if (quizNextBtn) {
    quizNextBtn.addEventListener('click', () => {
      quizCurrent++;
      if (quizCurrent < activeQuestions.length) {
        showQuestion();
      } else {
        endQuiz();
      }
    });
  }

  if (quizRestartBtn) {
    quizRestartBtn.addEventListener('click', () => {
      quizScore.classList.remove('active');
      startQuiz();
    });
  }

  if (quizCloseBtn) {
    quizCloseBtn.addEventListener('click', () => {
      quizScore.classList.remove('active');
    });
  }

  // ── Summary buttons ────────────────────────────────────────
  if (btnShort)    btnShort.addEventListener('click',    () => requestSummary('short'));
  if (btnDetailed) btnDetailed.addEventListener('click', () => requestSummary('detailed'));
  if (btnKey)      btnKey.addEventListener('click',      () => requestSummary('key'));
  if (btnTerms)    btnTerms.addEventListener('click',    () => requestSummary('terms'));

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (summaryEl?.value) {
        navigator.clipboard.writeText(summaryEl.value)
          .then(() => setStatus('Copied!'))
          .catch(() => setStatus('Copy failed.'));
      }
    });
  }

  if (clearBtn) clearBtn.addEventListener('click', clearAll);
})();
