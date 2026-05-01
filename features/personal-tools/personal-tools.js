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
      bgImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop&q=80',
      fallbackBg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
    },
    {
      id: 'notepad',
      icon: '📝',
      title: 'Notepad',
      description: 'Store your notes and reminders',
      bgImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=400&fit=crop&q=80',
      fallbackBg: 'linear-gradient(135deg, #0d1b2a 0%, #1b2838 40%, #2a475e 100%)',
    },
    {
      id: 'calculator',
      icon: '🧮',
      title: 'Scientific Calculator',
      description: 'Advanced math and calculations',
      bgImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=400&fit=crop&q=80',
      fallbackBg: 'linear-gradient(135deg, #0a0e27 0%, #1a1a3e 40%, #2d1b69 100%)',
    },
    {
      id: 'personalization',
      icon: '🎨',
      title: 'Personalization',
      description: 'Customize your app appearance',
      bgImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=400&fit=crop&q=80',
      fallbackBg: 'linear-gradient(135deg, #1a0033 0%, #330066 40%, #4a0080 100%)',
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
        <div class="tool-card-bg" style="background-image: url('${tool.bgImage}'), ${tool.fallbackBg}; background-size: cover; background-position: center;"></div>
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