/**
 * Form Validation System
 * Provides comprehensive form validation for the QMS
 */

class FormValidator {
  constructor() {
    this.rules = new Map()
    this.errors = new Map()
    this.init()
  }

  init() {
    this.setupDefaultRules()
    this.setupEventListeners()
  }

  /**
   * Setup default validation rules
   */
  setupDefaultRules() {
    // Email validation
    this.addRule("email", {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Please enter a valid email address",
    })

    // Required field validation
    this.addRule("required", {
      validator: (value) => value && value.trim().length > 0,
      message: "This field is required",
    })

    // Minimum length validation
    this.addRule("minLength", {
      validator: (value, min) => value && value.length >= min,
      message: (min) => `Must be at least ${min} characters long`,
    })

    // Maximum length validation
    this.addRule("maxLength", {
      validator: (value, max) => !value || value.length <= max,
      message: (max) => `Must be no more than ${max} characters long`,
    })

    // Numeric validation
    this.addRule("numeric", {
      pattern: /^\d+$/,
      message: "Please enter a valid number",
    })

    // Phone number validation
    this.addRule("phone", {
      pattern: /^[+]?[1-9][\d]{0,15}$/,
      message: "Please enter a valid phone number",
    })

    // URL validation
    this.addRule("url", {
      pattern: /^https?:\/\/.+/,
      message: "Please enter a valid URL",
    })
  }

  /**
   * Add custom validation rule
   * @param {string} name - Rule name
   * @param {Object} rule - Rule configuration
   */
  addRule(name, rule) {
    this.rules.set(name, rule)
  }

  /**
   * Setup event listeners for form validation
   */
  setupEventListeners() {
    // Validate on input
    document.addEventListener("input", (e) => {
      if (e.target.hasAttribute("data-validate")) {
        this.validateField(e.target)
      }
    })

    // Validate on blur
    document.addEventListener(
      "blur",
      (e) => {
        if (e.target.hasAttribute("data-validate")) {
          this.validateField(e.target)
        }
      },
      true,
    )

    // Validate form on submit
    document.addEventListener("submit", (e) => {
      if (e.target.hasAttribute("data-validate-form")) {
        e.preventDefault()
        this.validateForm(e.target)
      }
    })
  }

  /**
   * Validate a single field
   * @param {HTMLElement} field - Field to validate
   * @returns {boolean} - Whether field is valid
   */
  validateField(field) {
    const rules = this.getFieldRules(field)
    const value = field.value
    const fieldName = field.name || field.id || "field"

    let isValid = true
    const errors = []

    for (const rule of rules) {
      const ruleConfig = this.rules.get(rule.name)
      if (!ruleConfig) continue

      let ruleValid = false
      let errorMessage = ruleConfig.message

      if (ruleConfig.pattern) {
        ruleValid = ruleConfig.pattern.test(value)
      } else if (ruleConfig.validator) {
        ruleValid = ruleConfig.validator(value, rule.param)
        if (typeof errorMessage === "function") {
          errorMessage = errorMessage(rule.param)
        }
      }

      if (!ruleValid) {
        isValid = false
        errors.push(errorMessage)
      }
    }

    // Update field state
    this.updateFieldState(field, isValid, errors)

    // Store errors
    if (isValid) {
      this.errors.delete(fieldName)
    } else {
      this.errors.set(fieldName, errors)
    }

    return isValid
  }

  /**
   * Validate entire form
   * @param {HTMLFormElement} form - Form to validate
   * @returns {boolean} - Whether form is valid
   */
  validateForm(form) {
    const fields = form.querySelectorAll("[data-validate]")
    let isFormValid = true

    fields.forEach((field) => {
      const fieldValid = this.validateField(field)
      if (!fieldValid) {
        isFormValid = false
      }
    })

    // Update form state
    this.updateFormState(form, isFormValid)

    if (isFormValid) {
      this.handleValidForm(form)
    } else {
      this.handleInvalidForm(form)
    }

    return isFormValid
  }

  /**
   * Get validation rules for a field
   * @param {HTMLElement} field - Field element
   * @returns {Array} - Array of rule objects
   */
  getFieldRules(field) {
    const rulesString = field.getAttribute("data-validate")
    if (!rulesString) return []

    const rules = []
    const ruleStrings = rulesString.split("|")

    ruleStrings.forEach((ruleString) => {
      const [name, param] = ruleString.split(":")
      rules.push({
        name: name.trim(),
        param: param ? param.trim() : null,
      })
    })

    return rules
  }

  /**
   * Update field visual state
   * @param {HTMLElement} field - Field element
   * @param {boolean} isValid - Whether field is valid
   * @param {Array} errors - Error messages
   */
  updateFieldState(field, isValid, errors) {
    // Remove existing validation classes
    field.classList.remove("valid", "invalid")

    // Add appropriate class
    field.classList.add(isValid ? "valid" : "invalid")

    // Update error display
    this.updateErrorDisplay(field, errors)
  }

  /**
   * Update error display for field
   * @param {HTMLElement} field - Field element
   * @param {Array} errors - Error messages
   */
  updateErrorDisplay(field, errors) {
    // Remove existing error message
    const existingError = field.parentNode.querySelector(".field-error")
    if (existingError) {
      existingError.remove()
    }

    // Add new error message if there are errors
    if (errors.length > 0) {
      const errorElement = document.createElement("div")
      errorElement.className = "field-error"
      errorElement.textContent = errors[0] // Show first error
      field.parentNode.appendChild(errorElement)
    }
  }

  /**
   * Update form state
   * @param {HTMLFormElement} form - Form element
   * @param {boolean} isValid - Whether form is valid
   */
  updateFormState(form, isValid) {
    const submitBtn = form.querySelector('[type="submit"]')
    if (submitBtn) {
      submitBtn.disabled = !isValid
    }
  }

  /**
   * Handle valid form submission
   * @param {HTMLFormElement} form - Form element
   */
  handleValidForm(form) {
    // Show success message
    this.showMessage("Form submitted successfully!", "success")

    // Process form data
    const formData = new FormData(form)
    const data = Object.fromEntries(formData)

    // Here you would typically send data to server
    // For now, we'll just log it
  }

  /**
   * Handle invalid form submission
   * @param {HTMLFormElement} form - Form element
   */
  handleInvalidForm(form) {
    // Show error message
    this.showMessage("Please correct the errors below", "error")

    // Focus first invalid field
    const firstInvalidField = form.querySelector(".invalid")
    if (firstInvalidField) {
      firstInvalidField.focus()
    }
  }

  /**
   * Show validation message
   * @param {string} message - Message to show
   * @param {string} type - Message type (success, error, info)
   */
  showMessage(message, type = "info") {
    // Remove existing messages
    const existingMessages = document.querySelectorAll(".validation-message")
    existingMessages.forEach((msg) => msg.remove())

    // Create new message
    const messageElement = document.createElement("div")
    messageElement.className = `validation-message validation-message--${type}`
    messageElement.textContent = message

    // Insert at top of form or body
    const form = document.querySelector("form[data-validate-form]")
    if (form) {
      form.insertBefore(messageElement, form.firstChild)
    } else {
      document.body.insertBefore(messageElement, document.body.firstChild)
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.remove()
      }
    }, 5000)
  }

  /**
   * Get all validation errors
   * @returns {Map} - Map of field names to error arrays
   */
  getErrors() {
    return new Map(this.errors)
  }

  /**
   * Clear all validation errors
   */
  clearErrors() {
    this.errors.clear()

    // Remove visual indicators
    document.querySelectorAll(".valid, .invalid").forEach((el) => {
      el.classList.remove("valid", "invalid")
    })

    // Remove error messages
    document.querySelectorAll(".field-error").forEach((el) => {
      el.remove()
    })
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.FormValidator = new FormValidator()
})
