/**
 * Dark Mode Toggle Functionality
 * Handles dark mode switching and persistence
 */

class DarkModeManager {
  constructor() {
    this.storageKey = 'darkMode';
    this.themeAttribute = 'data-theme';
    this.init();
  }

  /**
   * Initialize dark mode on page load
   */
  init() {
    // Apply saved theme or default to light mode
    const savedTheme = this.getSavedTheme();
    this.setTheme(savedTheme);

    // Listen for sidebar loaded event to add toggle button
    document.addEventListener('sidebarLoaded', () => {
      this.addToggleButton();
    });

    // Also try to add toggle button if sidebar is already loaded
    if (document.querySelector('.sidebar')) {
      this.addToggleButton();
    }
  }

  /**
   * Get saved theme from localStorage
   * @returns {string} 'dark' or 'light'
   */
  getSavedTheme() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
      // Default to light mode if no preference saved
      return 'light';
    } catch (error) {
      console.error('Error reading dark mode preference:', error);
      return 'light';
    }
  }

  /**
   * Save theme preference to localStorage
   * @param {string} theme - 'dark' or 'light'
   */
  saveTheme(theme) {
    try {
      localStorage.setItem(this.storageKey, theme);
    } catch (error) {
      console.error('Error saving dark mode preference:', error);
    }
  }

  /**
   * Set theme on document
   * @param {string} theme - 'dark' or 'light'
   */
  setTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute(this.themeAttribute, 'dark');
    } else {
      document.documentElement.removeAttribute(this.themeAttribute);
    }
    this.saveTheme(theme);
    
    // Dispatch custom event for theme change
    document.dispatchEvent(new CustomEvent('themeChange', { detail: { theme } }));
  }

  /**
   * Toggle between dark and light mode
   */
  toggle() {
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
    this.updateToggleButton(newTheme);
  }

  /**
   * Get current theme
   * @returns {string} 'dark' or 'light'
   */
  getCurrentTheme() {
    return document.documentElement.getAttribute(this.themeAttribute) === 'dark' ? 'dark' : 'light';
  }

  /**
   * Add toggle button to sidebar header (top right corner)
   */
  addToggleButton() {
    // Check if button already exists
    if (document.getElementById('dark-mode-toggle')) {
      return;
    }

    // Find sidebar header
    const sidebarHeader = document.querySelector('.sidebar-header');
    
    if (!sidebarHeader) {
      // Retry after a short delay if sidebar header not found yet
      setTimeout(() => this.addToggleButton(), 100);
      return;
    }

    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.id = 'dark-mode-toggle';
    toggleButton.className = 'dark-mode-toggle-btn';
    toggleButton.setAttribute('role', 'button');
    toggleButton.setAttribute('tabindex', '0');
    toggleButton.setAttribute('aria-label', 'Toggle Dark Mode');
    
    const currentTheme = this.getCurrentTheme();
    this.createToggleContent(toggleButton, currentTheme);
    
    toggleButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggle();
    });

    // Add button to sidebar header
    sidebarHeader.appendChild(toggleButton);

    // Update button state
    this.updateToggleButton(currentTheme);
  }

  /**
   * Create toggle button content (icon only)
   * @param {HTMLElement} button - Button element
   * @param {string} theme - Current theme
   */
  createToggleContent(button, theme) {
    const isDark = theme === 'dark';
    
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        ${isDark 
          ? '<path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>'
          : '<path d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"/>'
        }
      </svg>
    `;
  }

  /**
   * Update toggle button appearance
   * @param {string} theme - Current theme
   */
  updateToggleButton(theme) {
    const toggleButton = document.getElementById('dark-mode-toggle');
    if (toggleButton) {
      this.createToggleContent(toggleButton, theme);
    }
  }
}

// Initialize dark mode manager
const darkModeManager = new DarkModeManager();

// Export for use in other scripts if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DarkModeManager;
}

