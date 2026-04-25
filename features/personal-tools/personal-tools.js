// ═══════════════════════════════════════════════════════════
// PERSONAL TOOLS - Main Module
// ═══════════════════════════════════════════════════════════

window.personalToolsModule = {
  tools: [
    {
      id: 'alarm',
      icon: '⏰',
      title: 'Alarm Clock',
      description: 'Set reminders and alarms',
      bgImage: 'https://images.unsplash.com/photo-1519915212116-7cfef71f1d3e?w=600&h=400&fit=crop',
      fallbackBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      module: window.alarmModule
    },
    {
      id: 'notepad',
      icon: '📝',
      title: 'Notepad',
      description: 'Store your notes and reminders',
      bgImage: 'https://images.unsplash.com/photo-1507842217343-583f20270319?w=600&h=400&fit=crop',
      fallbackBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      module: window.notepadModule
    },
    {
      id: 'calculator',
      icon: '🧮',
      title: 'Scientific Calculator',
      description: 'Advanced math and calculations',
      bgImage: 'https://images.unsplash.com/photo-1516321318423-f06b0073ecde?w=600&h=400&fit=crop',
      fallbackBg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      module: window.calculatorModule
    },
    {
      id: 'personalization',
      icon: '🎨',
      title: 'Personalization',
      description: 'Customize your app appearance',
      bgImage: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=400&fit=crop',
      fallbackBg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      module: window.personalizationModule
    }
  ],

  init: function() {
    this.render();
  },

  render: function() {
    const page = document.getElementById('page-personal-tools');
    if (!page) return;

    const cardsHTML = this.tools.map(tool => `
      <div class="tool-card" onclick="personalToolsModule.openTool('${tool.id}')">
        <div class="tool-card-bg" style="background-image: url('${tool.bgImage}'); background-color: ${tool.fallbackBg};"></div>
        <div class="tool-card-overlay"></div>
        <div class="tool-card-content">
          <div class="tool-card-icon">${tool.icon}</div>
          <h3 class="tool-card-title">${tool.title}</h3>
          <p class="tool-card-description">${tool.description}</p>
          <div class="tool-card-action">Open</div>
        </div>
      </div>
    `).join('');

    page.innerHTML = `
      <div class="personal-tools-container">
        <div class="personal-tools-header">
          <h1 class="personal-tools-title">Personal Tools</h1>
          <p class="personal-tools-subtitle">Access your essential utilities in one place</p>
        </div>
        <div class="personal-tools-grid">
          ${cardsHTML}
        </div>
      </div>
    `;
  },

  openTool: function(toolId) {
    const tool = this.tools.find(t => t.id === toolId);
    if (!tool) return;

    // Navigate to the tool's page
    switch(toolId) {
      case 'alarm':
        window.goToPage('alarm');
        break;
      case 'notepad':
        window.goToPage('notepad');
        break;
      case 'calculator':
        window.goToPage('calculator');
        break;
      case 'personalization':
        window.goToPage('personalization');
        break;
    }
  }
};