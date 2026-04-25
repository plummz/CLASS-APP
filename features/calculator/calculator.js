// Calculator Module
window.calculatorModule = {
  display: '',
  init: function() {
    this.render();
  },
  render: function() {
    const page = document.getElementById('page-calculator');
    if (!page) return;

    page.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">🧮 Calculator</h1>
      </div>
      <div class="calculator-container">
        <div class="calculator-display" id="calc-display">0</div>
        <div class="calculator-buttons">
          <button class="calculator-btn clear" onclick="calculatorModule.clear()">C</button>
          <button class="calculator-btn" onclick="calculatorModule.append('(')">(</button>
          <button class="calculator-btn" onclick="calculatorModule.append(')')">)</button>
          <button class="calculator-btn operator" onclick="calculatorModule.append('/')">÷</button>

          <button class="calculator-btn" onclick="calculatorModule.append('7')">7</button>
          <button class="calculator-btn" onclick="calculatorModule.append('8')">8</button>
          <button class="calculator-btn" onclick="calculatorModule.append('9')">9</button>
          <button class="calculator-btn operator" onclick="calculatorModule.append('*')">×</button>

          <button class="calculator-btn" onclick="calculatorModule.append('4')">4</button>
          <button class="calculator-btn" onclick="calculatorModule.append('5')">5</button>
          <button class="calculator-btn" onclick="calculatorModule.append('6')">6</button>
          <button class="calculator-btn operator" onclick="calculatorModule.append('-')">-</button>

          <button class="calculator-btn" onclick="calculatorModule.append('1')">1</button>
          <button class="calculator-btn" onclick="calculatorModule.append('2')">2</button>
          <button class="calculator-btn" onclick="calculatorModule.append('3')">3</button>
          <button class="calculator-btn operator" onclick="calculatorModule.append('+')">+</button>

          <button class="calculator-btn" onclick="calculatorModule.append('0')">0</button>
          <button class="calculator-btn" onclick="calculatorModule.append('.')">.</button>
          <button class="calculator-btn equals" onclick="calculatorModule.calculate()">=</button>
        </div>
      </div>
    `;
    this.updateDisplay();
  },
  append: function(value) {
    this.display += value;
    this.updateDisplay();
  },
  clear: function() {
    this.display = '';
    this.updateDisplay();
  },
  calculate: function() {
    try {
      // Replace × and ÷ with * and /
      let expr = this.display.replace(/×/g, '*').replace(/÷/g, '/');
      this.display = eval(expr).toString();
    } catch (e) {
      this.display = 'Error';
    }
    this.updateDisplay();
  },
  updateDisplay: function() {
    const displayEl = document.getElementById('calc-display');
    if (displayEl) {
      displayEl.textContent = this.display || '0';
    }
  }
};