// ═══════════════════════════════════════════════════════════
// SCIENTIFIC CALCULATOR - Module (Casio-style upgrade)
// ═══════════════════════════════════════════════════════════

window.calculatorModule = {
  expr: '',        // current expression string
  ans: 0,          // previous answer
  memory: 0,       // M register
  degMode: true,   // true = degrees, false = radians
  justCalc: false, // true after = pressed — next digit starts fresh

  init: function() { this.render(); },

  render: function() {
    const page = document.getElementById('page-calculator');
    if (!page) return;

    page.innerHTML = `
      <div class="tool-page-header">
        <button class="tool-back-btn" onclick="window.goToPage('personal-tools')">← Back</button>
        <h1 class="tool-page-title">Scientific Calculator</h1>
      </div>
      <div class="casio-wrapper">
        <div class="casio-body">

          <!-- Display -->
          <div class="casio-display">
            <div class="casio-expr" id="casio-expr">0</div>
            <div class="casio-result" id="casio-result"></div>
            <div class="casio-indicators">
              <span id="casio-deg-ind" class="casio-ind active">DEG</span>
              <span id="casio-rad-ind" class="casio-ind">RAD</span>
              <span id="casio-mem-ind" class="casio-ind" id="casio-mem-ind">M</span>
            </div>
          </div>

          <!-- Mode bar -->
          <div class="casio-mode-bar">
            <button class="casio-mode-btn active" id="btn-deg" onclick="calculatorModule.setDeg()">DEG</button>
            <button class="casio-mode-btn" id="btn-rad" onclick="calculatorModule.setRad()">RAD</button>
          </div>

          <!-- Keypad -->
          <div class="casio-keys">

            <!-- Row 1: shift functions -->
            <button class="ckey fn2" onclick="calculatorModule.p('asin(')">sin⁻¹</button>
            <button class="ckey fn2" onclick="calculatorModule.p('acos(')">cos⁻¹</button>
            <button class="ckey fn2" onclick="calculatorModule.p('atan(')">tan⁻¹</button>
            <button class="ckey fn2" onclick="calculatorModule.p('nthrt(')">ⁿ√x</button>
            <button class="ckey fn2" onclick="calculatorModule.p('log2(')">log₂</button>

            <!-- Row 2: trig -->
            <button class="ckey fn" onclick="calculatorModule.p('sin(')">sin</button>
            <button class="ckey fn" onclick="calculatorModule.p('cos(')">cos</button>
            <button class="ckey fn" onclick="calculatorModule.p('tan(')">tan</button>
            <button class="ckey fn" onclick="calculatorModule.p('sqrt(')">√x</button>
            <button class="ckey fn" onclick="calculatorModule.p('cbrt(')">∛x</button>

            <!-- Row 3: log / exp -->
            <button class="ckey fn" onclick="calculatorModule.p('log(')">log</button>
            <button class="ckey fn" onclick="calculatorModule.p('ln(')">ln</button>
            <button class="ckey fn" onclick="calculatorModule.p('^2')">x²</button>
            <button class="ckey fn" onclick="calculatorModule.p('^')">xʸ</button>
            <button class="ckey fn" onclick="calculatorModule.p('fact(')">n!</button>

            <!-- Row 4: constants / memory -->
            <button class="ckey const" onclick="calculatorModule.p('π')">π</button>
            <button class="ckey const" onclick="calculatorModule.p('e')">e</button>
            <button class="ckey const" onclick="calculatorModule.p('Ans')">Ans</button>
            <button class="ckey mem" onclick="calculatorModule.mplus()">M+</button>
            <button class="ckey mem" onclick="calculatorModule.mr()">MR</button>

            <!-- Row 5: parens / percent / EXP / MC -->
            <button class="ckey num" onclick="calculatorModule.p('(')">(</button>
            <button class="ckey num" onclick="calculatorModule.p(')')">)</button>
            <button class="ckey fn" onclick="calculatorModule.p('%')">%</button>
            <button class="ckey fn" onclick="calculatorModule.p('E')">EXP</button>
            <button class="ckey mem" onclick="calculatorModule.mc()">MC</button>

            <!-- Row 6: 7 8 9 DEL AC -->
            <button class="ckey num" onclick="calculatorModule.p('7')">7</button>
            <button class="ckey num" onclick="calculatorModule.p('8')">8</button>
            <button class="ckey num" onclick="calculatorModule.p('9')">9</button>
            <button class="ckey del" onclick="calculatorModule.del()">DEL</button>
            <button class="ckey ac"  onclick="calculatorModule.ac()">AC</button>

            <!-- Row 7: 4 5 6 × ÷ -->
            <button class="ckey num" onclick="calculatorModule.p('4')">4</button>
            <button class="ckey num" onclick="calculatorModule.p('5')">5</button>
            <button class="ckey num" onclick="calculatorModule.p('6')">6</button>
            <button class="ckey op"  onclick="calculatorModule.p('×')">×</button>
            <button class="ckey op"  onclick="calculatorModule.p('÷')">÷</button>

            <!-- Row 8: 1 2 3 + - -->
            <button class="ckey num" onclick="calculatorModule.p('1')">1</button>
            <button class="ckey num" onclick="calculatorModule.p('2')">2</button>
            <button class="ckey num" onclick="calculatorModule.p('3')">3</button>
            <button class="ckey op"  onclick="calculatorModule.p('+')">+</button>
            <button class="ckey op"  onclick="calculatorModule.p('−')">−</button>

            <!-- Row 9: 0 . frac = -->
            <button class="ckey num" onclick="calculatorModule.p('0')">0</button>
            <button class="ckey num" onclick="calculatorModule.p('.')">.</button>
            <button class="ckey fn"  onclick="calculatorModule.frac()">a/b</button>
            <button class="ckey eq span2" onclick="calculatorModule.calc()">=</button>

          </div>
        </div>
      </div>
    `;

    this.updateDisplay();
  },

  // ── Input ────────────────────────────────────────────────

  p: function(ch) {
    // After = pressed, a digit/const starts a new expression;
    // an operator continues with Ans prepended
    if (this.justCalc) {
      const isDigit = /^[0-9.]$/.test(ch);
      const isConst = ch === 'π' || ch === 'e' || ch === 'Ans';
      const isFn    = /^[a-z]/.test(ch);
      if (isDigit || isConst || isFn) {
        this.expr = '';
      } else {
        // operator — chain on previous result via Ans
        if (this.expr === '' || this.expr === String(this.ans)) {
          this.expr = 'Ans';
        }
      }
      this.justCalc = false;
    }

    // Auto-close: inserting digit after ) needs implied ×
    const last = this.expr.slice(-1);
    if (/[0-9π)]/.test(last) && /^[a-z(]/.test(ch)) {
      this.expr += '×';
    }

    this.expr += ch;
    this.updateDisplay();
    this.livePreview();
  },

  del: function() {
    this.justCalc = false;
    this.expr = this.expr.slice(0, -1);
    this.updateDisplay();
    this.livePreview();
  },

  ac: function() {
    this.expr = '';
    this.justCalc = false;
    this.updateDisplay();
    document.getElementById('casio-result').textContent = '';
  },

  // fraction helper: inserts (a)/(b) shell
  frac: function() {
    this.p('(');
  },

  // memory
  mplus: function() {
    const v = this.evaluate(this.expr);
    if (v !== null) {
      this.memory += v;
      this.flashMem();
    }
  },

  mr: function() {
    this.p(String(this.memory));
  },

  mc: function() {
    this.memory = 0;
    this.flashMem();
  },

  flashMem: function() {
    const ind = document.getElementById('casio-mem-ind');
    if (!ind) return;
    ind.classList.toggle('active', this.memory !== 0);
  },

  setDeg: function() {
    this.degMode = true;
    document.getElementById('btn-deg').classList.add('active');
    document.getElementById('btn-rad').classList.remove('active');
    document.getElementById('casio-deg-ind').classList.add('active');
    document.getElementById('casio-rad-ind').classList.remove('active');
  },

  setRad: function() {
    this.degMode = false;
    document.getElementById('btn-rad').classList.add('active');
    document.getElementById('btn-deg').classList.remove('active');
    document.getElementById('casio-rad-ind').classList.add('active');
    document.getElementById('casio-deg-ind').classList.remove('active');
  },

  // ── Calculate ────────────────────────────────────────────

  calc: function() {
    if (!this.expr) return;
    const result = this.evaluate(this.expr);

    const resultEl = document.getElementById('casio-result');
    if (result === null) {
      if (resultEl) { resultEl.textContent = 'Error'; resultEl.className = 'casio-result error'; }
      return;
    }

    this.ans = result;
    const formatted = this.fmt(result);

    if (resultEl) {
      resultEl.textContent = '= ' + formatted;
      resultEl.className = 'casio-result';
    }

    // Move result to expr line for chaining
    this.expr = formatted;
    this.justCalc = true;
    this.updateDisplay();
  },

  // Live preview while typing
  livePreview: function() {
    const resultEl = document.getElementById('casio-result');
    if (!resultEl || !this.expr) { if (resultEl) resultEl.textContent = ''; return; }
    const v = this.evaluate(this.expr);
    if (v !== null && !this.justCalc) {
      resultEl.textContent = '= ' + this.fmt(v);
      resultEl.className = 'casio-result preview';
    } else if (v === null) {
      resultEl.textContent = '';
    }
  },

  // ── Safe Evaluator ────────────────────────────────────────

  evaluate: function(raw) {
    if (!raw || raw.trim() === '') return null;
    try {
      let expr = raw
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/π/g, '(' + Math.PI + ')')
        .replace(/\be\b/g, '(' + Math.E + ')')
        .replace(/Ans/g, '(' + this.ans + ')')
        .replace(/\^2\b/g, '**2')
        .replace(/\^/g, '**');

      const self = this;
      const toRad = (x) => self.degMode ? x * Math.PI / 180 : x;
      const toDeg = (x) => self.degMode ? x * 180 / Math.PI : x;

      // Replace function calls — order: longest names first to avoid partial matches
      expr = expr
        .replace(/asin\(([^)]*)\)/g, (_, a) => {
          const v = self.safeEval(a);
          return v !== null ? String(toDeg(Math.asin(v))) : 'NaN';
        })
        .replace(/acos\(([^)]*)\)/g, (_, a) => {
          const v = self.safeEval(a);
          return v !== null ? String(toDeg(Math.acos(v))) : 'NaN';
        })
        .replace(/atan\(([^)]*)\)/g, (_, a) => {
          const v = self.safeEval(a);
          return v !== null ? String(toDeg(Math.atan(v))) : 'NaN';
        })
        .replace(/nthrt\(([^)]*)\)/g, (_, a) => {
          const v = self.safeEval(a);
          return v !== null ? String(Math.pow(v, 1/3)) : 'NaN'; // simplified: cube as default
        })
        .replace(/log2\(([^)]*)\)/g, (_, a) => {
          const v = self.safeEval(a);
          return v !== null && v > 0 ? String(Math.log2(v)) : 'NaN';
        })
        .replace(/cbrt\(([^)]*)\)/g, (_, a) => {
          const v = self.safeEval(a);
          return v !== null ? String(Math.cbrt(v)) : 'NaN';
        })
        .replace(/sqrt\(([^)]*)\)/g, (_, a) => {
          const v = self.safeEval(a);
          return v !== null && v >= 0 ? String(Math.sqrt(v)) : 'NaN';
        })
        .replace(/fact\(([^)]*)\)/g, (_, a) => {
          const v = self.safeEval(a);
          return v !== null ? String(self.factorial(Math.round(v))) : 'NaN';
        })
        .replace(/sin\(([^)]*)\)/g, (_, a) => {
          const v = self.safeEval(a);
          return v !== null ? String(Math.sin(toRad(v))) : 'NaN';
        })
        .replace(/cos\(([^)]*)\)/g, (_, a) => {
          const v = self.safeEval(a);
          return v !== null ? String(Math.cos(toRad(v))) : 'NaN';
        })
        .replace(/tan\(([^)]*)\)/g, (_, a) => {
          const v = self.safeEval(a);
          return v !== null ? String(Math.tan(toRad(v))) : 'NaN';
        })
        .replace(/log\(([^)]*)\)/g, (_, a) => {
          const v = self.safeEval(a);
          return v !== null && v > 0 ? String(Math.log10(v)) : 'NaN';
        })
        .replace(/ln\(([^)]*)\)/g, (_, a) => {
          const v = self.safeEval(a);
          return v !== null && v > 0 ? String(Math.log(v)) : 'NaN';
        });

      // Handle E notation (scientific): 2E3 = 2×10³
      expr = expr.replace(/([0-9.]+)E([+-]?[0-9]+)/g, (_, m, e) => String(parseFloat(m) * Math.pow(10, parseFloat(e))));

      // Handle % as /100
      expr = expr.replace(/([0-9.]+)%/g, (_, n) => '(' + n + '/100)');

      // Validate: only allow safe characters
      if (/[^0-9+\-*/.() \t\nNaInfty]/.test(expr.replace(/\*\*/g, '').replace(/Infinity/g, '').replace(/NaN/g, ''))) {
        return null;
      }

      if (expr.includes('NaN')) return null;

      const result = Function('"use strict"; return (' + expr + ')')();
      if (!isFinite(result)) return null;
      return result;
    } catch(e) {
      return null;
    }
  },

  safeEval: function(expr) {
    return this.evaluate(expr);
  },

  factorial: function(n) {
    if (n < 0 || n > 170) return NaN;
    if (n === 0 || n === 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  },

  fmt: function(num) {
    if (!isFinite(num)) return 'Error';
    const abs = Math.abs(num);
    if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) {
      return num.toExponential(8).replace(/\.?0+e/, 'e');
    }
    // Round to 10 significant digits
    const str = parseFloat(num.toPrecision(10)).toString();
    return str;
  },

  // ── LaTeX Display ─────────────────────────────────────────

  toLatex: function(expr) {
    if (!expr) return '0';
    let s = expr;
    s = this._latexFrac(s);
    s = this._latexSqrt(s);
    s = this._latexFact(s);
    s = this._latexPow(s);
    // scientific notation from fmt() e.g. 1.23e+8
    s = s.replace(/(\d+\.?\d*)e([+-]?\d+)/g, (_, m, e) => m + '\\times10^{' + parseInt(e, 10) + '}');
    // trig & log (multi-char first to avoid partial matches)
    s = s.replace(/asin\(/g, '\\arcsin(');
    s = s.replace(/acos\(/g, '\\arccos(');
    s = s.replace(/atan\(/g, '\\arctan(');
    s = s.replace(/log2\(/g, '\\log_{2}(');
    s = s.replace(/sin\(/g,  '\\sin(');
    s = s.replace(/cos\(/g,  '\\cos(');
    s = s.replace(/tan\(/g,  '\\tan(');
    s = s.replace(/log\(/g,  '\\log(');
    s = s.replace(/ln\(/g,   '\\ln(');
    // operators & symbols
    s = s.replace(/×/g, '\\times ');
    s = s.replace(/÷/g, '\\div ');
    s = s.replace(/−/g, '-');
    s = s.replace(/π/g, '\\pi ');
    s = s.replace(/Ans/g, '\\text{Ans}');
    // user-typed EXP key e.g. 2E3
    s = s.replace(/E([+-]?\d*)/g, '\\times10^{$1}');
    s = s.replace(/%/g, '\\%');
    return s;
  },

  _latexFrac: function(s) {
    let iter = 0;
    while (iter++ < 20) {
      const divIdx = s.indexOf(')÷(');
      if (divIdx === -1) break;
      let depth = 0, numOpen = -1;
      for (let i = divIdx; i >= 0; i--) {
        if (s[i] === ')') depth++;
        else if (s[i] === '(') { if (--depth === 0) { numOpen = i; break; } }
      }
      let depth2 = 0, denClose = -1;
      for (let i = divIdx + 2; i < s.length; i++) {
        if (s[i] === '(') depth2++;
        else if (s[i] === ')') { if (--depth2 === 0) { denClose = i; break; } }
      }
      if (numOpen === -1 || denClose === -1) break;
      const num = this._latexFrac(s.substring(numOpen + 1, divIdx));
      const den = this._latexFrac(s.substring(divIdx + 3, denClose));
      s = s.substring(0, numOpen) + '\\frac{' + num + '}{' + den + '}' + s.substring(denClose + 1);
    }
    return s;
  },

  _latexSqrt: function(s) {
    const fns = [['nthrt(', '\\sqrt[n]{'], ['cbrt(', '\\sqrt[3]{'], ['sqrt(', '\\sqrt{']];
    for (const [fn, latex] of fns) {
      let iter = 0;
      while (iter++ < 20) {
        const idx = s.indexOf(fn);
        if (idx === -1) break;
        const openParen = idx + fn.length - 1;
        let depth = 0, close = -1;
        for (let i = openParen; i < s.length; i++) {
          if (s[i] === '(') depth++;
          else if (s[i] === ')') { if (--depth === 0) { close = i; break; } }
        }
        if (close === -1) {
          s = s.substring(0, idx) + latex + s.substring(openParen + 1);
          break;
        }
        const inner = this._latexSqrt(s.substring(openParen + 1, close));
        s = s.substring(0, idx) + latex + inner + '}' + s.substring(close + 1);
      }
    }
    return s;
  },

  _latexFact: function(s) {
    let iter = 0;
    while (iter++ < 20) {
      const idx = s.indexOf('fact(');
      if (idx === -1) break;
      const openParen = idx + 4;
      let depth = 0, close = -1;
      for (let i = openParen; i < s.length; i++) {
        if (s[i] === '(') depth++;
        else if (s[i] === ')') { if (--depth === 0) { close = i; break; } }
      }
      if (close === -1) { s = s.substring(0, idx) + '(' + s.substring(openParen + 1); break; }
      const inner = s.substring(openParen + 1, close);
      s = s.substring(0, idx) + '(' + inner + ')!' + s.substring(close + 1);
    }
    return s;
  },

  _latexPow: function(s) {
    // x^(expr) → x^{expr}
    let iter = 0;
    while (iter++ < 20) {
      const idx = s.indexOf('^(');
      if (idx === -1) break;
      let depth = 0, close = -1;
      for (let i = idx + 1; i < s.length; i++) {
        if (s[i] === '(') depth++;
        else if (s[i] === ')') { if (--depth === 0) { close = i; break; } }
      }
      if (close === -1) break;
      const inner = this._latexPow(s.substring(idx + 2, close));
      s = s.substring(0, idx + 1) + '{' + inner + '}' + s.substring(close + 1);
    }
    // x^digits → x^{digits}
    s = s.replace(/\^(-?[\d.]+)/g, '^{$1}');
    return s;
  },

  updateDisplay: function() {
    const exprEl = document.getElementById('casio-expr');
    if (!exprEl) return;
    const raw = this.expr || '0';
    exprEl.classList.toggle('long', raw.length > 16);
    if (typeof katex === 'undefined') { exprEl.textContent = raw; return; }
    try {
      katex.render(this.toLatex(raw), exprEl, { throwOnError: true, displayMode: false, output: 'html' });
    } catch (e) {
      exprEl.textContent = raw;
    }
  }
};
