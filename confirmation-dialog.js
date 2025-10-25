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
        <div class="confirmation-logo" style="width: 2.5rem; height: 2.5rem; border-radius: 50%; background-color: rgba(255, 0, 0, 0.2); display: flex; align-items: center; justify-content: center; margin-right: 0.75rem;">
          <svg xmlns="http://www.w3.org/2000/svg" height="1.5rem" viewBox="0 -960 960 960" width="1.5rem" fill="#ff0000">
            <path d="M120-120v-80h80v-560q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v560h80v80H120Zm160-80h400v-560H280v560Zm120-240q17 0 28.5-11.5T440-480q0-17-11.5-28.5T400-520q-17 0-28.5 11.5T360-480q0 17 11.5 28.5T400-440ZM280-760v560-560Z"/>
          </svg>
        </div>
        <h3 class="confirmation-title" id="confirmation-title">Confirm Action</h3>
      </div>
      <div class="confirmation-body">
        <p class="confirmation-message">Are you sure you want to proceed?</p>
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
        ...options,
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
  }

  /**
   * Hide the confirmation dialog
   * @param {boolean} confirmed - Whether the action was confirmed
   */
  hide(confirmed) {
    if (!this.isVisible) return

    this.isVisible = false
    this.overlay.classList.remove("show")
    this.overlay.setAttribute("aria-hidden", "true")
    document.body.style.overflow = ""

    // Resolve the promise
    if (this.resolveCallback) {
      this.resolveCallback(confirmed)
      this.resolveCallback = null
    }
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
