// ═══════════════════════════════════════════════════════════
// SCIENTIFIC CALCULATOR - Module
// ═══════════════════════════════════════════════════════════

window.calculatorModule = {
  display: '0',
  previousValue: null,
  operation: null,
  shouldResetDisplay: false,
  mode: 'basic', // 'basic' or 'scientific'

  init: function() {
    this.render();
  },

  render: function() {
    const page = document.getElementById('page-calculator');
    if (!page) return;

    const basicButtons = [
      ['7', '8', '9', '/'],
      ['4', '5', '6', '*'],
      ['1', '2', '3', '-'],
      ['0', '.', '=', '+'],
    ];

    const scientificExtras = [
      ['sin', 'cos', 'tan', 'deg'],
      ['log', 'ln', '^', '√'],
      ['(', ')', 'π', 'e'],
      ['%', 'del', 'AC', '=']
    ];

    const basicButtonsHTML = basicButtons.map(row =>
      row.map(btn => {
        let btnClass = 'calc-btn';
        if (btn === '=') btnClass += ' equals';
        else if (['+', '-', '*', '/'].includes(btn)) btnClass += ' operator';
        else if (btn === 'AC') btnClass += ' clear';
        else btnClass += ' number';
        
        return `<button class="${btnClass}" onclick="calculatorModule.buttonPress('${btn}')">${btn}</button>`;
      }).join('')
    ).join('');

    const scientificButtonsHTML = `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
        <button class="calc-btn function" onclick="calculatorModule.buttonPress('sin')">sin</button>
        <button class="calc-btn function" onclick="calculatorModule.buttonPress('cos')">cos</button>
        <button class="calc-btn function" onclick="calculatorModule.buttonPress('tan')">tan</button>
        <button class="calc-btn constant" onclick="calculatorModule.buttonPress('π')">π</button>
        <button class="calc-btn function" onclick="calculatorModule.buttonPress('log')">log</button>
        <button class="calc-btn function" onclick="calculatorModule.buttonPress('ln')">ln</button>
        <button class="calc-btn operator" onclick="calculatorModule.buttonPress('^')">x^y</button>
        <button class="calc-btn function" onclick="calculatorModule.buttonPress('√')">√</button>
        <button class="calc-btn number" onclick="calculatorModule.buttonPress('(')">(</button>
        <button class="calc-btn number" onclick="calculatorModule.buttonPress(')')">)</button>
        <button class="calc-btn operator" onclick="calculatorModule.buttonPress('%')">%</button>
        <button class="calc-btn constant" onclick="calculatorModule.buttonPress('e')">e</button>
      </div>
    `;

    const basicModeButtons = `
      <div class="calculator-buttons basic-mode">
        ${basicButtonsHTML}
      </div>
    `;

    const scientificModeButtons = `
      ${scientificButtonsHTML}
      <div class="calculator-buttons" style="margin-top: 10px;">
        <button class="calc-btn clear" style="grid-column: span 2;" onclick="calculatorModule.buttonPress('AC')">AC</button>
        <button class="calc-btn number" onclick="calculatorModule.buttonPress('del')">DEL</button>
        <button class="calc-btn equals" style="grid-column: span 1;" onclick="calculatorModule.buttonPress('=')">=</button>
      </div>
    `;

    page.innerHTML = `
      <div class="tool-page-header">
        <button class="tool-back-btn" onclick="window.goToPage('personal-tools')">← Back</button>
        <h1 class="tool-page-title">Scientific Calculator</h1>
      </div>
      <div class="calculator-wrapper">
        <div class="calculator-container">
          <div class="calculator-display" id="calc-display">0</div>
          
          <div class="calculator-mode-toggle">
            <button class="calc-mode-btn active" id="basic-mode-btn" onclick="calculatorModule.switchMode('basic')">Basic</button>
            <button class="calc-mode-btn" id="scientific-mode-btn" onclick="calculatorModule.switchMode('scientific')">Scientific</button>
          </div>

          <div id="basic-buttons">${basicModeButtons}</div>
          <div id="scientific-buttons" style="display: none;">${scientificModeButtons}</div>
        </div>
      </div>
    `;

    this.updateDisplay();
  },

  switchMode: function(newMode) {
    this.mode = newMode;
    const basicBtn = document.getElementById('basic-mode-btn');
    const scientificBtn = document.getElementById('scientific-mode-btn');
    const basicBtns = document.getElementById('basic-buttons');
    const scientificBtns = document.getElementById('scientific-buttons');

    if (newMode === 'basic') {
      basicBtn.classList.add('active');
      scientificBtn.classList.remove('active');
      basicBtns.style.display = 'block';
      scientificBtns.style.display = 'none';
    } else {
      basicBtn.classList.remove('active');
      scientificBtn.classList.add('active');
      basicBtns.style.display = 'none';
      scientificBtns.style.display = 'block';
    }
  },

  buttonPress: function(value) {
    const display = document.getElementById('calc-display');
    if (!display) return;

    // Handle equals
    if (value === '=') {
      this.calculate();
      return;
    }

    // Handle clear
    if (value === 'AC') {
      this.display = '0';
      this.previousValue = null;
      this.operation = null;
      this.shouldResetDisplay = false;
      this.updateDisplay();
      return;
    }

    // Handle delete
    if (value === 'del') {
      if (this.display !== '0' && this.display.length > 1) {
        this.display = this.display.slice(0, -1);
      } else {
        this.display = '0';
      }
      this.updateDisplay();
      return;
    }

    // Handle operators
    if (['+', '-', '*', '/', '%', '^'].includes(value)) {
      if (this.previousValue === null) {
        this.previousValue = this.parseExpression(this.display);
      } else if (!this.shouldResetDisplay) {
        this.previousValue = this.parseExpression(this.display);
      }
      this.operation = value;
      this.shouldResetDisplay = true;
      return;
    }

    // Handle functions
    if (['sin', 'cos', 'tan', 'log', 'ln', '√'].includes(value)) {
      const result = this.applyFunction(value, this.parseExpression(this.display));
      this.display = this.formatResult(result);
      this.shouldResetDisplay = true;
      this.updateDisplay();
      return;
    }

    // Handle constants
    if (value === 'π') {
      this.display = this.formatResult(Math.PI);
      this.shouldResetDisplay = true;
      this.updateDisplay();
      return;
    }

    if (value === 'e') {
      this.display = this.formatResult(Math.E);
      this.shouldResetDisplay = true;
      this.updateDisplay();
      return;
    }

    // Handle parentheses
    if (value === '(' || value === ')') {
      if (this.shouldResetDisplay) {
        this.display = value;
        this.shouldResetDisplay = false;
      } else {
        this.display += value;
      }
      this.updateDisplay();
      return;
    }

    // Handle decimal point
    if (value === '.') {
      if (this.shouldResetDisplay) {
        this.display = '0.';
        this.shouldResetDisplay = false;
      } else if (!this.display.includes('.')) {
        this.display += '.';
      }
      this.updateDisplay();
      return;
    }

    // Handle numbers
    if (this.shouldResetDisplay) {
      this.display = value;
      this.shouldResetDisplay = false;
    } else {
      if (this.display === '0') {
        this.display = value;
      } else {
        this.display += value;
      }
    }

    this.updateDisplay();
  },

  calculate: function() {
    if (this.operation === null || this.previousValue === null) return;

    const currentValue = this.parseExpression(this.display);
    let result;

    try {
      switch (this.operation) {
        case '+':
          result = this.previousValue + currentValue;
          break;
        case '-':
          result = this.previousValue - currentValue;
          break;
        case '*':
          result = this.previousValue * currentValue;
          break;
        case '/':
          result = currentValue !== 0 ? this.previousValue / currentValue : null;
          if (result === null) {
            this.display = 'Error: Div by 0';
            this.previousValue = null;
            this.operation = null;
            this.updateDisplay();
            return;
          }
          break;
        case '%':
          result = this.previousValue % currentValue;
          break;
        case '^':
          result = Math.pow(this.previousValue, currentValue);
          break;
        default:
          result = currentValue;
      }

      this.display = this.formatResult(result);
      this.previousValue = null;
      this.operation = null;
      this.shouldResetDisplay = true;
    } catch (e) {
      this.display = 'Error';
      this.previousValue = null;
      this.operation = null;
    }

    this.updateDisplay();
  },

  applyFunction: function(func, value) {
    // Convert degrees to radians if needed
    const toRad = (val) => (val * Math.PI) / 180;
    const toDeg = (val) => (val * 180) / Math.PI;

    switch (func) {
      case 'sin':
        return Math.sin(toRad(value));
      case 'cos':
        return Math.cos(toRad(value));
      case 'tan':
        return Math.tan(toRad(value));
      case 'log':
        return value > 0 ? Math.log10(value) : null;
      case 'ln':
        return value > 0 ? Math.log(value) : null;
      case '√':
        return value >= 0 ? Math.sqrt(value) : null;
      default:
        return value;
    }
  },

  parseExpression: function(expr) {
    try {
      // Safe expression parsing - only allow numbers and specific operators
      const sanitized = expr.replace(/[^\d.+\-*/()√π%^]/g, '');
      
      // Replace constants
      let result = sanitized
        .replace(/π/g, Math.PI.toString())
        .replace(/e/g, Math.E.toString());

      // Replace exponentiation with Math.pow
      result = result.replace(/\^/g, '**');

      // Use Function constructor for safe evaluation (more controlled than eval)
      const func = new Function('return ' + result);
      const value = func();

      return isFinite(value) ? value : 0;
    } catch (e) {
      return 0;
    }
  },

  formatResult: function(num) {
    if (!isFinite(num)) return '0';
    
    // Round to reasonable precision
    const rounded = Math.round(num * 100000000) / 100000000;
    
    // Use exponential notation for very large/small numbers
    if (Math.abs(rounded) > 1e10 || (Math.abs(rounded) < 1e-6 && rounded !== 0)) {
      return rounded.toExponential(6);
    }
    
    return rounded.toString();
  },

  updateDisplay: function() {
    const display = document.getElementById('calc-display');
    if (display) {
      display.textContent = this.display;
      display.classList.toggle('error', this.display.includes('Error'));
    }
  }
};