/**
 * Modern Confirmation Dialog Component
 * Provides a reusable confirmation dialog with modern styling and animations
 */

class ConfirmationDialog {
  constructor() {
    this.overlay = null
    this.dialog = null
    this.isVisible = false
    this.resolveCallback = null
    this.elements = {} // Cache DOM elements for better performance
    this.keydownHandler = this.handleKeydown.bind(this)
    this.init()
  }

  /**
   * Initialize the confirmation dialog
   */
  init() {
    this.createDialog()
    this.bindEvents()
  }

  /**
   * Create the confirmation dialog HTML structure
   */
  createDialog() {
    // Create overlay
    this.overlay = document.createElement("div")
    this.overlay.className = "confirmation-overlay"
    this.overlay.setAttribute("role", "dialog")
    this.overlay.setAttribute("aria-modal", "true")
    this.overlay.setAttribute("aria-labelledby", "confirmation-title")

    // Create dialog
    this.dialog = document.createElement("div")
    this.dialog.className = "confirmation-dialog"

    // Create dialog content using template
    this.dialog.innerHTML = this.getDialogTemplate()

    // Cache DOM elements for better performance
    this.elements = {
      title: this.dialog.querySelector(".confirmation-title"),
      message: this.dialog.querySelector(".confirmation-message"),
      cancelBtn: this.dialog.querySelector(".confirmation-btn-cancel"),
      confirmBtn: this.dialog.querySelector(".confirmation-btn-confirm"),
      doNotShowAgainContainer: this.dialog.querySelector(".confirmation-do-not-show-again"),
      doNotShowAgainCheckbox: this.dialog.querySelector(".confirmation-do-not-show-again-checkbox"),
    }

    // Assemble dialog
    this.overlay.appendChild(this.dialog)

    // Add to document - check if body exists
    if (document.body) {
      document.body.appendChild(this.overlay)
    } else {
      // Wait for body to be available
      document.addEventListener('DOMContentLoaded', () => {
        if (document.body) {
          document.body.appendChild(this.overlay)
        }
      })
    }
  }

  /**
   * Get dialog HTML template
   * @returns {string} HTML template string
   */
  getDialogTemplate() {
    return `
      <div class="confirmation-header">
        <div class="confirmation-logo">
          <svg xmlns="http://www.w3.org/2000/svg" height="1.5rem" viewBox="0 0 24 24" width="1.5rem" fill="#3b82f6">
            <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/>
          </svg>
        </div>
        <h3 class="confirmation-title" id="confirmation-title">Confirm Action</h3>
      </div>
      <div class="confirmation-body">
        <p class="confirmation-message">Are you sure you want to proceed?</p>
      </div>
      <div class="confirmation-do-not-show-again" style="display: none;">
        <label class="confirmation-do-not-show-again-label">
          <input type="checkbox" class="confirmation-do-not-show-again-checkbox">
          <span class="confirmation-do-not-show-again-text">Do not show this message again</span>
        </label>
      </div>
      <div class="confirmation-actions">
        <button class="confirmation-btn confirmation-btn-cancel" type="button" aria-label="Cancel action">Cancel</button>
        <button class="confirmation-btn confirmation-btn-confirm" type="button" aria-label="Confirm action">Confirm</button>
      </div>
    `
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Use cached elements for better performance
    this.elements.cancelBtn.addEventListener("click", () => this.hide(false))
    this.elements.confirmBtn.addEventListener("click", () => this.hide(true))

    // Overlay click (close on outside click)
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) {
        this.hide(false)
      }
    })

    // Keyboard events - use bound handler for better performance
    document.addEventListener("keydown", this.keydownHandler)
  }

  /**
   * Handle keyboard events
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeydown(e) {
    if (!this.isVisible) return

    switch (e.key) {
      case "Escape":
        e.preventDefault()
        this.hide(false)
        break
      case "Enter":
        e.preventDefault()
        this.hide(true)
        break
    }
  }

  /**
   * Show the confirmation dialog
   * @param {Object} options - Configuration options
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Dialog message
   * @param {string} options.confirmText - Confirm button text
   * @param {string} options.cancelText - Cancel button text
   * @param {string} options.type - Dialog type (warning, error, info, success)
   * @param {boolean} options.doNotShowAgain - Show "do not show again" checkbox
   * @param {string} options.doNotShowAgainKey - localStorage key for storing preference
   * @returns {Promise<boolean>} - Promise that resolves to true if confirmed, false if cancelled
   */
  show(options = {}) {
    return new Promise((resolve) => {
      this.resolveCallback = resolve

      // Set default options
      const config = {
        title: "Confirm Action",
        message: "Are you sure you want to proceed?",
        confirmText: "Confirm",
        cancelText: "Cancel",
        type: "warning",
        doNotShowAgain: false,
        doNotShowAgainKey: null,
        ...options,
      }

      // Check if user has chosen to not show this dialog again
      if (config.doNotShowAgain && config.doNotShowAgainKey) {
        const shouldNotShow = localStorage.getItem(config.doNotShowAgainKey) === 'true'
        if (shouldNotShow) {
          // User chose not to show this dialog, resolve immediately
          resolve(true)
          return
        }
      }

      // Update dialog content
      this.updateContent(config)

      // Show dialog
      this.isVisible = true
      this.overlay.classList.add("show")

      // Focus management
      this.overlay.setAttribute("aria-hidden", "false")
      document.body.style.overflow = "hidden"

      // Focus the cancel button by default for safety - use cached element
      this.elements.cancelBtn.focus()
    })
  }

  /**
   * Update dialog content based on configuration
   * @param {Object} config - Configuration object
   */
  updateContent(config) {
    // Use cached elements for better performance
    this.elements.title.textContent = config.title
    this.elements.message.textContent = config.message
    this.elements.cancelBtn.textContent = config.cancelText
    this.elements.confirmBtn.textContent = config.confirmText
    
    // Show/hide "do not show again" checkbox
    if (this.elements.doNotShowAgainContainer) {
      if (config.doNotShowAgain && config.doNotShowAgainKey) {
        this.elements.doNotShowAgainContainer.style.display = 'block'
        if (this.elements.doNotShowAgainCheckbox) {
          this.elements.doNotShowAgainCheckbox.checked = false
        }
      } else {
        this.elements.doNotShowAgainContainer.style.display = 'none'
      }
    }
    
    // Store config for use in hide method
    this.currentConfig = config
    
    // Update colors based on type
    this.updateTypeStyles(config.type)
  }
  
  /**
   * Update styles based on dialog type
   * @param {string} type - Dialog type (warning, error, info, success)
   */
  updateTypeStyles(type) {
    const confirmBtn = this.elements.confirmBtn
    
    // Remove existing type classes
    confirmBtn.classList.remove('type-success', 'type-error', 'type-warning', 'type-info')
    
    // Add type class
    confirmBtn.classList.add(`type-${type}`)
    
    // Update icon and colors
    const logo = this.dialog.querySelector('.confirmation-logo')
    const svg = logo?.querySelector('svg')
    
    if (type === 'success') {
      // Primary color for success
      logo.style.backgroundColor = 'rgba(26, 115, 62, 0.2)'
      if (svg) {
        svg.setAttribute('fill', '#1a733e')
        svg.setAttribute('viewBox', '0 0 24 24')
        // Success checkmark circle icon
        svg.innerHTML = '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>'
      }
    } else if (type === 'error') {
      // Red for error
      logo.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'
      if (svg) {
        svg.setAttribute('fill', '#ef4444')
        svg.setAttribute('viewBox', '0 0 24 24')
        // Error circle with X icon
        svg.innerHTML = '<path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>'
      }
    } else if (type === 'warning') {
      // Orange/amber for warning
      logo.style.backgroundColor = 'rgba(245, 158, 11, 0.2)'
      if (svg) {
        svg.setAttribute('fill', '#f59e0b')
        svg.setAttribute('viewBox', '0 0 24 24')
        // Warning triangle with exclamation icon
        svg.innerHTML = '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>'
      }
    } else if (type === 'info') {
      // Blue for info
      logo.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'
      if (svg) {
        svg.setAttribute('fill', '#3b82f6')
        svg.setAttribute('viewBox', '0 0 24 24')
        // Info circle icon
        svg.innerHTML = '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>'
      }
    }
  }

  /**
   * Hide the confirmation dialog
   * @param {boolean} confirmed - Whether the action was confirmed
   */
  hide(confirmed) {
    if (!this.isVisible) return

    // Check if "do not show again" was checked
    if (this.currentConfig?.doNotShowAgain && this.currentConfig?.doNotShowAgainKey) {
      if (this.elements.doNotShowAgainCheckbox?.checked) {
        localStorage.setItem(this.currentConfig.doNotShowAgainKey, 'true')
      }
    }

    this.isVisible = false
    this.overlay.classList.remove("show")
    this.overlay.setAttribute("aria-hidden", "true")
    document.body.style.overflow = ""

    // Resolve the promise
    if (this.resolveCallback) {
      this.resolveCallback(confirmed)
      this.resolveCallback = null
    }
    
    // Clear current config
    this.currentConfig = null
  }

  /**
   * Destroy the confirmation dialog
   */
  destroy() {
    // Remove event listeners
    document.removeEventListener("keydown", this.keydownHandler)

    // Remove from DOM
    if (this.overlay?.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay)
    }

    // Clean up references
    this.overlay = null
    this.dialog = null
    this.elements = {}
    this.isVisible = false
    this.resolveCallback = null
  }
}

// Create global instance
window.confirmationDialog = new ConfirmationDialog()

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = ConfirmationDialog
}
