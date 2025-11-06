/**
 * Keyboard Shortcuts Manager
 * Provides global and page-specific keyboard shortcuts for the QMS application
 */

class KeyboardShortcuts {
  constructor() {
    this.shortcuts = new Map()
    this.pageShortcuts = new Map()
    this.isEnabled = true
    this.helpDialog = null
    this.currentPage = this.getCurrentPage()
    this.pressedKeys = new Set()
    
    // Track if user is typing in input fields
    this.isTypingInInput = false
    
    this.init()
  }

  /**
   * Get current page name from URL
   */
  getCurrentPage() {
    const path = window.location.pathname
    const page = path.split('/').pop() || 'index.html'
    return page.replace('.html', '')
  }

  /**
   * Initialize keyboard shortcuts
   */
  init() {
    // Register global shortcuts
    this.registerGlobalShortcuts()
    
    // Register page-specific shortcuts
    this.registerPageShortcuts()
    
    // Setup event listeners
    this.setupEventListeners()
    
    // Create help dialog
    this.createHelpDialog()
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Track when user is typing in input fields
    document.addEventListener('focusin', (e) => {
      const tagName = e.target.tagName.toLowerCase()
      const isInput = ['input', 'textarea', 'select'].includes(tagName)
      const isContentEditable = e.target.contentEditable === 'true'
      this.isTypingInInput = isInput || isContentEditable
    })

    document.addEventListener('focusout', (e) => {
      // Small delay to allow other focus events to fire
      setTimeout(() => {
        const activeElement = document.activeElement
        const tagName = activeElement.tagName.toLowerCase()
        const isInput = ['input', 'textarea', 'select'].includes(tagName)
        const isContentEditable = activeElement.contentEditable === 'true'
        this.isTypingInInput = isInput || isContentEditable
      }, 10)
    })

    // Handle keydown events
    document.addEventListener('keydown', (e) => this.handleKeyDown(e))
    
    // Handle keyup events for modifier keys
    document.addEventListener('keyup', (e) => {
      if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) {
        this.pressedKeys.clear()
      }
    })
  }

  /**
   * Handle keydown events
   */
  handleKeyDown(e) {
    if (!this.isEnabled) return

    // Track modifier keys
    if (e.metaKey || e.ctrlKey) this.pressedKeys.add('mod')
    if (e.altKey) this.pressedKeys.add('alt')
    if (e.shiftKey) this.pressedKeys.add('shift')

    // Build shortcut key
    const shortcut = this.buildShortcutKey(e)
    
    // Check if we should ignore this shortcut (user is typing)
    if (this.shouldIgnoreShortcut(e, shortcut)) {
      return
    }

    // Check page-specific shortcuts first
    if (this.pageShortcuts.has(this.currentPage)) {
      const pageShortcuts = this.pageShortcuts.get(this.currentPage)
      if (pageShortcuts.has(shortcut)) {
        e.preventDefault()
        e.stopPropagation()
        const handler = pageShortcuts.get(shortcut)
        handler(e)
        this.showShortcutFeedback(shortcut)
        return
      }
    }

    // Check global shortcuts
    if (this.shortcuts.has(shortcut)) {
      e.preventDefault()
      e.stopPropagation()
      const handler = this.shortcuts.get(shortcut)
      handler(e)
      this.showShortcutFeedback(shortcut)
    }
  }

  /**
   * Build shortcut key string from event
   */
  buildShortcutKey(e) {
    const parts = []
    
    // Add modifiers
    if (e.metaKey || e.ctrlKey) parts.push('mod')
    if (e.altKey) parts.push('alt')
    if (e.shiftKey) parts.push('shift')
    
    // Add main key (handle special keys)
    // Check if key exists to avoid undefined errors
    if (!e.key) return null
    let key = e.key.toLowerCase()
    
    // Handle special keys
    if (key === ' ') key = 'space'
    if (key === '/') key = 'slash'
    if (key === '?') key = 'question'
    if (key === ',') key = 'comma'
    if (key === 'enter') key = 'enter'
    if (key === 'escape') key = 'escape'
    
    // Don't add modifier keys as main key
    if (!['meta', 'control', 'alt', 'shift'].includes(key)) {
      parts.push(key)
    }
    
    return parts.join('+')
  }

  /**
   * Check if we should ignore this shortcut
   */
  shouldIgnoreShortcut(e, shortcut) {
    // Always allow help dialog (?)
    if (shortcut === 'question') {
      return false
    }

    // Don't handle Escape - let existing handlers manage it
    if (e.key === 'Escape') {
      return true
    }

    // If user is typing in an input, ignore most shortcuts
    if (this.isTypingInInput) {
      // Allow Ctrl/Cmd combinations (like Ctrl+S, Ctrl+K)
      if (e.metaKey || e.ctrlKey) {
        return false
      }
      return true
    }

    // Don't ignore if we have modifiers (Ctrl/Cmd)
    if (e.metaKey || e.ctrlKey) {
      return false
    }

    return false
  }

  /**
   * Register global shortcuts
   */
  registerGlobalShortcuts() {
    // Search shortcuts
    this.shortcuts.set('mod+k', () => {
      window.location.href = 'search.html'
    })
    this.shortcuts.set('slash', () => {
      // Only trigger if not in input
      if (!this.isTypingInInput) {
        window.location.href = 'search.html'
      }
    })

    // Create new audit
    this.shortcuts.set('mod+n', () => {
      window.location.href = 'create-audit.html'
    })

    // Home
    this.shortcuts.set('mod+h', () => {
      window.location.href = 'home.html'
    })

    // Settings
    this.shortcuts.set('mod+comma', () => {
      window.location.href = 'settings.html'
    })

    // Help dialog
    this.shortcuts.set('question', () => {
      this.toggleHelpDialog()
    })

    // Sidebar toggle (if sidebar exists)
    this.shortcuts.set('mod+slash', () => {
      this.toggleSidebar()
    })
  }

  /**
   * Register page-specific shortcuts
   */
  registerPageShortcuts() {
    // Create/Edit Audit page shortcuts
    const createEditShortcuts = new Map()
    createEditShortcuts.set('mod+s', (e) => {
      // Find and click the submit button
      const submitBtn = document.querySelector('button[type="submit"]')
      if (submitBtn && !submitBtn.disabled) {
        submitBtn.click()
      }
    })
    createEditShortcuts.set('mod+enter', (e) => {
      // Find and click the submit button
      const submitBtn = document.querySelector('button[type="submit"]')
      if (submitBtn && !submitBtn.disabled) {
        submitBtn.click()
      }
    })
    this.pageShortcuts.set('create-audit', createEditShortcuts)
    this.pageShortcuts.set('edit-audit', createEditShortcuts)

    // Audit View page shortcuts
    const viewShortcuts = new Map()
    viewShortcuts.set('e', (e) => {
      // Find edit button
      const editBtn = document.querySelector('button[onclick*="edit"], button[onclick*="Edit"], a[href*="edit"]')
      if (editBtn && !editBtn.disabled) {
        editBtn.click()
      }
    })
    viewShortcuts.set('mod+p', (e) => {
      window.print()
    })
    viewShortcuts.set('r', (e) => {
      // Toggle reversal form - try global function first, then button
      if (typeof window.toggleReversalForm === 'function') {
        window.toggleReversalForm()
      } else {
        const reversalBtn = document.querySelector('button[onclick*="reversal"], button[onclick*="Reversal"], button#reversalBtn')
        if (reversalBtn && !reversalBtn.disabled) {
          reversalBtn.click()
        }
      }
    })
    this.pageShortcuts.set('audit-view', viewShortcuts)

    // Search page shortcuts
    const searchShortcuts = new Map()
    searchShortcuts.set('mod+k', (e) => {
      const searchInput = document.getElementById('search-input-large') || document.querySelector('input[type="search"]')
      if (searchInput) {
        searchInput.focus()
        searchInput.select()
      }
    })
    searchShortcuts.set('slash', (e) => {
      const searchInput = document.getElementById('search-input-large') || document.querySelector('input[type="search"]')
      if (searchInput) {
        searchInput.focus()
        searchInput.select()
      }
    })
    this.pageShortcuts.set('search', searchShortcuts)
  }

  /**
   * Toggle sidebar
   */
  toggleSidebar() {
    const sidebar = document.querySelector('.sidebar')
    if (sidebar) {
      sidebar.classList.toggle('collapsed')
      // Trigger resize event for any components that need it
      window.dispatchEvent(new Event('resize'))
    }
  }

  /**
   * Show visual feedback when shortcut is triggered
   */
  showShortcutFeedback(shortcut) {
    // Remove existing feedback if any
    const existing = document.getElementById('shortcut-feedback')
    if (existing) {
      existing.remove()
    }

    // Create feedback element
    const feedback = document.createElement('div')
    feedback.id = 'shortcut-feedback'
    feedback.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-family: 'Poppins', sans-serif;
      font-size: 0.875rem;
      font-weight: 600;
      z-index: 10000;
      pointer-events: none;
      animation: shortcutFeedback 0.3s ease-out;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `

    // Format shortcut for display
    const displayKey = this.formatShortcutForDisplay(shortcut)
    feedback.textContent = displayKey

    // Add animation styles if not already present
    if (!document.getElementById('shortcut-feedback-styles')) {
      const style = document.createElement('style')
      style.id = 'shortcut-feedback-styles'
      style.textContent = `
        @keyframes shortcutFeedback {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.05);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `
      document.head.appendChild(style)
    }

    document.body.appendChild(feedback)

    // Remove after animation
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.remove()
      }
    }, 300)
  }

  /**
   * Format shortcut key for display
   */
  formatShortcutForDisplay(shortcut) {
    const parts = shortcut.split('+')
    const formatted = parts.map(part => {
      if (part === 'mod') {
        return navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'
      }
      if (part === 'alt') return 'Alt'
      if (part === 'shift') return 'Shift'
      if (part === 'slash') return '/'
      if (part === 'question') return '?'
      if (part === 'comma') return ','
      if (part === 'space') return 'Space'
      if (part === 'enter') return 'Enter'
      if (part === 'escape') return 'Esc'
      // Capitalize first letter
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    return formatted.join(' + ')
  }

  /**
   * Create help dialog
   */
  createHelpDialog() {
    const dialog = document.createElement('div')
    dialog.id = 'keyboard-shortcuts-help'
    dialog.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      align-items: center;
      justify-content: center;
      font-family: 'Poppins', sans-serif;
    `

    const content = document.createElement('div')
    content.style.cssText = `
      background: white;
      border-radius: 0.5rem;
      padding: 2rem;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      position: relative;
    `

    const header = document.createElement('div')
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #e5e7eb;
    `

    const title = document.createElement('h2')
    title.textContent = 'Keyboard Shortcuts'
    title.style.cssText = `
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1A733E;
    `

    const closeBtn = document.createElement('button')
    closeBtn.innerHTML = '×'
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 2rem;
      color: #6b7280;
      cursor: pointer;
      padding: 0;
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.25rem;
      transition: all 0.2s;
    `
    closeBtn.onmouseover = () => {
      closeBtn.style.background = '#f3f4f6'
      closeBtn.style.color = '#374151'
    }
    closeBtn.onmouseout = () => {
      closeBtn.style.background = 'none'
      closeBtn.style.color = '#6b7280'
    }
    closeBtn.onclick = () => this.hideHelpDialog()

    header.appendChild(title)
    header.appendChild(closeBtn)

    const shortcutsList = document.createElement('div')
    shortcutsList.id = 'shortcuts-list'
    shortcutsList.style.cssText = `
      display: grid;
      gap: 1rem;
    `

    // Add global shortcuts
    const globalSection = this.createShortcutSection('Global Shortcuts', this.getGlobalShortcuts())
    shortcutsList.appendChild(globalSection)

    // Add page-specific shortcuts
    const pageSection = this.createShortcutSection(
      `${this.getPageDisplayName()} Shortcuts`,
      this.getPageShortcuts()
    )
    if (pageSection) {
      shortcutsList.appendChild(pageSection)
    }

    content.appendChild(header)
    content.appendChild(shortcutsList)
    dialog.appendChild(content)

    // Close on Escape
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        this.hideHelpDialog()
      }
    })

    document.body.appendChild(dialog)
    this.helpDialog = dialog
  }

  /**
   * Create a shortcut section
   */
  createShortcutSection(title, shortcuts) {
    if (!shortcuts || shortcuts.length === 0) return null

    const section = document.createElement('div')
    section.style.cssText = `
      margin-bottom: 1.5rem;
    `

    const sectionTitle = document.createElement('h3')
    sectionTitle.textContent = title
    sectionTitle.style.cssText = `
      margin: 0 0 0.75rem 0;
      font-size: 1rem;
      font-weight: 600;
      color: #374151;
    `

    const shortcutsGrid = document.createElement('div')
    shortcutsGrid.style.cssText = `
      display: grid;
      gap: 0.75rem;
    `

    shortcuts.forEach(({ key, description }) => {
      const row = document.createElement('div')
      row.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: #f9fafb;
        border-radius: 0.375rem;
      `

      const desc = document.createElement('span')
      desc.textContent = description
      desc.style.cssText = `
        font-size: 0.875rem;
        color: #374151;
      `

      const keyDisplay = document.createElement('kbd')
      keyDisplay.textContent = this.formatShortcutForDisplay(key)
      keyDisplay.style.cssText = `
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 0.25rem;
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: #1A733E;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      `

      row.appendChild(desc)
      row.appendChild(keyDisplay)
      shortcutsGrid.appendChild(row)
    })

    section.appendChild(sectionTitle)
    section.appendChild(shortcutsGrid)

    return section
  }

  /**
   * Get global shortcuts for display
   */
  getGlobalShortcuts() {
    return [
      { key: 'mod+k', description: 'Open Search' },
      { key: '/', description: 'Open Search' },
      { key: 'mod+n', description: 'Create New Audit' },
      { key: 'mod+h', description: 'Go to Home' },
      { key: 'mod+comma', description: 'Open Settings' },
      { key: 'mod+slash', description: 'Toggle Sidebar' },
      { key: '?', description: 'Show Keyboard Shortcuts' },
    ]
  }

  /**
   * Get page-specific shortcuts for display
   */
  getPageShortcuts() {
    const pageShortcuts = {
      'create-audit': [
        { key: 'mod+s', description: 'Save/Submit Audit' },
        { key: 'mod+enter', description: 'Submit Audit' },
      ],
      'edit-audit': [
        { key: 'mod+s', description: 'Save/Submit Audit' },
        { key: 'mod+enter', description: 'Submit Audit' },
      ],
      'audit-view': [
        { key: 'e', description: 'Edit Audit' },
        { key: 'mod+p', description: 'Print Audit' },
        { key: 'r', description: 'Request Reversal' },
      ],
      'search': [
        { key: 'mod+k', description: 'Focus Search Input' },
        { key: '/', description: 'Focus Search Input' },
      ],
    }

    return pageShortcuts[this.currentPage] || []
  }

  /**
   * Get display name for current page
   */
  getPageDisplayName() {
    const names = {
      'create-audit': 'Create Audit',
      'edit-audit': 'Edit Audit',
      'audit-view': 'Audit View',
      'search': 'Search',
      'home': 'Home',
      'settings': 'Settings',
    }
    return names[this.currentPage] || this.currentPage.charAt(0).toUpperCase() + this.currentPage.slice(1)
  }

  /**
   * Toggle help dialog
   */
  toggleHelpDialog() {
    if (this.helpDialog) {
      if (this.helpDialog.style.display === 'none' || !this.helpDialog.style.display) {
        this.showHelpDialog()
      } else {
        this.hideHelpDialog()
      }
    }
  }

  /**
   * Show help dialog
   */
  showHelpDialog() {
    if (this.helpDialog) {
      // Update page-specific shortcuts
      const shortcutsList = document.getElementById('shortcuts-list')
      if (shortcutsList) {
        shortcutsList.innerHTML = ''
        
        const globalSection = this.createShortcutSection('Global Shortcuts', this.getGlobalShortcuts())
        shortcutsList.appendChild(globalSection)

        const pageSection = this.createShortcutSection(
          `${this.getPageDisplayName()} Shortcuts`,
          this.getPageShortcuts()
        )
        if (pageSection) {
          shortcutsList.appendChild(pageSection)
        }
      }

      this.helpDialog.style.display = 'flex'
      document.body.style.overflow = 'hidden'
    }
  }

  /**
   * Hide help dialog
   */
  hideHelpDialog() {
    if (this.helpDialog) {
      this.helpDialog.style.display = 'none'
      document.body.style.overflow = ''
    }
  }

  /**
   * Enable shortcuts
   */
  enable() {
    this.isEnabled = true
  }

  /**
   * Disable shortcuts
   */
  disable() {
    this.isEnabled = false
  }

  /**
   * Register a custom shortcut
   */
  registerShortcut(key, handler, page = null) {
    if (page) {
      if (!this.pageShortcuts.has(page)) {
        this.pageShortcuts.set(page, new Map())
      }
      this.pageShortcuts.get(page).set(key, handler)
    } else {
      this.shortcuts.set(key, handler)
    }
  }
}

// Initialize keyboard shortcuts when DOM is ready
let keyboardShortcuts = null

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    keyboardShortcuts = new KeyboardShortcuts()
    window.keyboardShortcuts = keyboardShortcuts
  })
} else {
  keyboardShortcuts = new KeyboardShortcuts()
  window.keyboardShortcuts = keyboardShortcuts
}

