/**
 * Access Control Module
 * Centralized system for managing user roles, permissions, and access control
 * 
 * This module provides:
 * - Role hierarchy and permission definitions
 * - Page-level access control
 * - Feature-level access control
 * - Resource-level access control (e.g., audit assignments)
 */

class AccessControl {
  constructor() {
    this.STORAGE_KEY = "userInfo"
    
    // Define role hierarchy (higher number = higher access level)
    this.ROLE_HIERARCHY = {
      'Super Admin': 5,
      'Admin': 4,
      'Quality Supervisor': 3,
      'Quality Analyst': 2,
      'Employee': 1,
      'General User': 0
    }

    // Define page access rules
    // Each page can specify:
    // - allowedRoles: Array of roles that can access
    // - minRoleLevel: Minimum role level required (uses hierarchy)
    // - customCheck: Function for custom access logic
    this.PAGE_ACCESS_RULES = {
      'home.html': {
        allowedRoles: ['*'] // All authenticated users
      },
      'auditor-dashboard.html': {
        minRoleLevel: 2 // Quality Analyst and above
      },
      'audit-distribution.html': {
        minRoleLevel: 2 // Quality Analyst and above
      },
      'create-audit.html': {
        minRoleLevel: 2 // Quality Analyst and above
      },
      'edit-audit.html': {
        minRoleLevel: 2, // Quality Analyst and above
        customCheck: (user, context) => {
          // Additional check: user must be the auditor or the audited employee
          if (context && context.assignment) {
            const userEmail = (user.email || '').toLowerCase().trim()
            const assignmentEmployeeEmail = (context.assignment.employee_email || '').toLowerCase().trim()
            const assignmentAuditorEmail = (context.assignment.auditor_email || '').toLowerCase().trim()
            
            // Employees can only access their own audits
            if (user.role === 'Employee') {
              return assignmentEmployeeEmail === userEmail
            }
            // Auditors can access audits they're assigned to
            return assignmentAuditorEmail === userEmail
          }
          return true // If no context, allow if role check passes
        }
      },
      'audit-form.html': {
        minRoleLevel: 2, // Quality Analyst and above
        customCheck: (user, context) => {
          // Additional check: user must be the auditor or the audited employee
          if (context && context.assignment) {
            const userEmail = (user.email || '').toLowerCase().trim()
            const assignmentEmployeeEmail = (context.assignment.employee_email || '').toLowerCase().trim()
            const assignmentAuditorEmail = (context.assignment.auditor_email || '').toLowerCase().trim()
            
            // Employees can only access their own audits
            if (user.role === 'Employee') {
              return assignmentEmployeeEmail === userEmail
            }
            // Auditors can access audits they're assigned to
            return assignmentAuditorEmail === userEmail
          }
          return true
        }
      },
      'audit-view.html': {
        allowedRoles: ['*'] // All authenticated users can view (with resource-level checks)
      },
      'expert-audits.html': {
        allowedRoles: ['*'] // All authenticated users
      },
      'employee-performance.html': {
        allowedRoles: ['*'] // All authenticated users
      },
      'reversal.html': {
        allowedRoles: ['*'] // All authenticated users
      },
      'calibration.html': {
        minRoleLevel: 2 // Quality Analyst and above
      },
      'ata.html': {
        minRoleLevel: 2 // Quality Analyst and above
      },
      'grading-guide.html': {
        allowedRoles: ['*'] // All authenticated users
      },
      'scorecards.html': {
        minRoleLevel: 2 // Quality Analyst and above
      },
      'user-management.html': {
        minRoleLevel: 4 // Admin and above
      },
      'profile.html': {
        allowedRoles: ['*'] // All authenticated users
      },
      'settings.html': {
        allowedRoles: ['*'] // All authenticated users
      },
      'intercom-admins.html': {
        minRoleLevel: 2 // Quality Analyst and above
      },
      'admin-conversations.html': {
        minRoleLevel: 2 // Quality Analyst and above
      },
      'ai-audits.html': {
        minRoleLevel: 2 // Quality Analyst and above
      },
      'search.html': {
        allowedRoles: ['*'] // All authenticated users
      },
      'help.html': {
        allowedRoles: ['*'] // All authenticated users
      },
      'improvement-corner.html': {
        minRoleLevel: 2 // Quality Analyst and above
      }
    }

    // Define feature permissions
    // Features that can be checked independently
    this.FEATURE_PERMISSIONS = {
      'create_audit': {
        minRoleLevel: 2
      },
      'edit_audit': {
        minRoleLevel: 2
      },
      'delete_audit': {
        minRoleLevel: 3 // Quality Supervisor and above
      },
      'distribute_audits': {
        minRoleLevel: 2
      },
      'view_all_audits': {
        minRoleLevel: 2
      },
      'manage_users': {
        minRoleLevel: 4 // Admin and above
      },
      'manage_scorecards': {
        minRoleLevel: 2
      },
      'approve_reversals': {
        minRoleLevel: 2
      },
      'view_reports': {
        allowedRoles: ['*']
      },
      'view_own_audits': {
        allowedRoles: ['*'] // All users can view their own audits
      }
    }
  }

  /**
   * Get current user info from localStorage
   * @returns {Object|null} User info or null
   */
  getCurrentUser() {
    try {
      const userInfo = localStorage.getItem(this.STORAGE_KEY)
      if (!userInfo) return null
      
      return JSON.parse(userInfo)
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  /**
   * Get role level for a given role
   * @param {string} role - Role name
   * @returns {number} Role level (0 if role not found)
   */
  getRoleLevel(role) {
    return this.ROLE_HIERARCHY[role] || 0
  }

  /**
   * Check if user has minimum role level
   * @param {Object} user - User object with role property
   * @param {number} minLevel - Minimum role level required
   * @returns {boolean} True if user meets minimum level
   */
  hasMinimumRoleLevel(user, minLevel) {
    if (!user || !user.role) return false
    const userLevel = this.getRoleLevel(user.role)
    return userLevel >= minLevel
  }

  /**
   * Check if user role is in allowed roles list
   * @param {Object} user - User object with role property
   * @param {Array<string>|string} allowedRoles - Allowed roles (or '*' for all)
   * @returns {boolean} True if user role is allowed
   */
  hasAllowedRole(user, allowedRoles) {
    if (!user || !user.role) return false
    
    // '*' means all authenticated users
    if (allowedRoles === '*' || (Array.isArray(allowedRoles) && allowedRoles.includes('*'))) {
      return true
    }
    
    if (!Array.isArray(allowedRoles)) {
      allowedRoles = [allowedRoles]
    }
    
    return allowedRoles.includes(user.role)
  }

  /**
   * Check if user can access a page
   * @param {string} pageName - Name of the page (e.g., 'audit-distribution.html')
   * @param {Object} context - Optional context object for custom checks (e.g., { assignment: {...} })
   * @returns {Object} { allowed: boolean, reason?: string }
   */
  canAccessPage(pageName, context = null) {
    const user = this.getCurrentUser()
    
    if (!user) {
      return {
        allowed: false,
        reason: 'User not authenticated'
      }
    }

    // Check if user is active
    if (user.is_active === false) {
      return {
        allowed: false,
        reason: 'User account is inactive'
      }
    }

    // Get access rule for this page
    const rule = this.PAGE_ACCESS_RULES[pageName]
    
    if (!rule) {
      // No rule defined - default to allowing access (fail open for backward compatibility)
      console.warn(`No access rule defined for page: ${pageName}`)
      return {
        allowed: true,
        reason: 'No access rule defined'
      }
    }

    // Check allowedRoles first
    if (rule.allowedRoles) {
      if (!this.hasAllowedRole(user, rule.allowedRoles)) {
        return {
          allowed: false,
          reason: `Role '${user.role}' is not allowed. Required: ${Array.isArray(rule.allowedRoles) ? rule.allowedRoles.join(', ') : rule.allowedRoles}`
        }
      }
    }

    // Check minRoleLevel
    if (rule.minRoleLevel !== undefined) {
      if (!this.hasMinimumRoleLevel(user, rule.minRoleLevel)) {
        const requiredRole = Object.keys(this.ROLE_HIERARCHY).find(
          role => this.ROLE_HIERARCHY[role] === rule.minRoleLevel
        )
        return {
          allowed: false,
          reason: `Insufficient role level. Required: ${requiredRole || `Level ${rule.minRoleLevel}`} or above`
        }
      }
    }

    // Run custom check if provided
    if (rule.customCheck && typeof rule.customCheck === 'function') {
      try {
        const customResult = rule.customCheck(user, context)
        if (!customResult) {
          return {
            allowed: false,
            reason: 'Custom access check failed'
          }
        }
      } catch (error) {
        console.error('Error in custom access check:', error)
        return {
          allowed: false,
          reason: 'Error in access check'
        }
      }
    }

    return {
      allowed: true
    }
  }

  /**
   * Check if user can access a feature
   * @param {string} featureName - Name of the feature
   * @returns {Object} { allowed: boolean, reason?: string }
   */
  canAccessFeature(featureName) {
    const user = this.getCurrentUser()
    
    if (!user) {
      return {
        allowed: false,
        reason: 'User not authenticated'
      }
    }

    if (user.is_active === false) {
      return {
        allowed: false,
        reason: 'User account is inactive'
      }
    }

    const permission = this.FEATURE_PERMISSIONS[featureName]
    
    if (!permission) {
      // No permission defined - default to denying access (fail closed for security)
      return {
        allowed: false,
        reason: `No permission defined for feature: ${featureName}`
      }
    }

    // Check allowedRoles
    if (permission.allowedRoles) {
      if (!this.hasAllowedRole(user, permission.allowedRoles)) {
        return {
          allowed: false,
          reason: `Role '${user.role}' is not allowed for this feature`
        }
      }
    }

    // Check minRoleLevel
    if (permission.minRoleLevel !== undefined) {
      if (!this.hasMinimumRoleLevel(user, permission.minRoleLevel)) {
        const requiredRole = Object.keys(this.ROLE_HIERARCHY).find(
          role => this.ROLE_HIERARCHY[role] === permission.minRoleLevel
        )
        return {
          allowed: false,
          reason: `Insufficient role level. Required: ${requiredRole || `Level ${permission.minRoleLevel}`} or above`
        }
      }
    }

    return {
      allowed: true
    }
  }

  /**
   * Check if user can access a specific resource (e.g., audit assignment)
   * @param {string} resourceType - Type of resource ('audit_assignment', etc.)
   * @param {Object} resource - Resource object
   * @returns {Object} { allowed: boolean, reason?: string }
   */
  canAccessResource(resourceType, resource) {
    const user = this.getCurrentUser()
    
    if (!user) {
      return {
        allowed: false,
        reason: 'User not authenticated'
      }
    }

    if (user.is_active === false) {
      return {
        allowed: false,
        reason: 'User account is inactive'
      }
    }

    const userEmail = (user.email || '').toLowerCase().trim()

    switch (resourceType) {
      case 'audit_assignment':
        if (!resource) {
          return {
            allowed: false,
            reason: 'Resource not provided'
          }
        }

        const assignmentEmployeeEmail = (resource.employee_email || '').toLowerCase().trim()
        const assignmentAuditorEmail = (resource.auditor_email || '').toLowerCase().trim()

        // Employees can only access their own audits
        if (user.role === 'Employee') {
          if (assignmentEmployeeEmail === userEmail) {
            return { allowed: true }
          }
          return {
            allowed: false,
            reason: 'You can only access your own audit assignments'
          }
        }

        // Auditors can access audits they're assigned to
        if (assignmentAuditorEmail === userEmail) {
          return { allowed: true }
        }

        // Quality Analysts and above can access all audits
        if (this.hasMinimumRoleLevel(user, 2)) {
          return { allowed: true }
        }

        return {
          allowed: false,
          reason: 'You do not have permission to access this audit assignment'
        }

      default:
        return {
          allowed: false,
          reason: `Unknown resource type: ${resourceType}`
        }
    }
  }

  /**
   * Enforce page access - redirects if access denied
   * Call this at the start of page initialization
   * @param {string} pageName - Name of the current page
   * @param {Object} context - Optional context for custom checks
   * @param {string} redirectTo - Page to redirect to if access denied (default: 'home.html')
   * @returns {boolean} True if access allowed, false if denied (and redirected)
   */
  enforcePageAccess(pageName, context = null, redirectTo = 'home.html') {
    const accessCheck = this.canAccessPage(pageName, context)
    
    if (!accessCheck.allowed) {
      // Show user-friendly message
      const message = accessCheck.reason || 'You do not have permission to access this page.'
      alert(`Access Denied: ${message}`)
      
      // Redirect to home or specified page
      if (window.location.pathname.split('/').pop() !== redirectTo) {
        window.location.href = redirectTo
      }
      
      return false
    }
    
    return true
  }

  /**
   * Get user's role
   * @returns {string|null} User's role or null
   */
  getUserRole() {
    const user = this.getCurrentUser()
    return user ? user.role : null
  }

  /**
   * Check if user has a specific role
   * @param {string} role - Role to check
   * @returns {boolean} True if user has the role
   */
  hasRole(role) {
    const user = this.getCurrentUser()
    return user && user.role === role
  }

  /**
   * Check if user is an employee
   * @returns {boolean} True if user is an employee
   */
  isEmployee() {
    return this.hasRole('Employee')
  }

  /**
   * Check if user is a quality analyst or above
   * @returns {boolean} True if user is QA or above
   */
  isQualityAnalystOrAbove() {
    const user = this.getCurrentUser()
    return this.hasMinimumRoleLevel(user, 2)
  }

  /**
   * Check if user is an admin or above
   * @returns {boolean} True if user is admin or above
   */
  isAdminOrAbove() {
    const user = this.getCurrentUser()
    return this.hasMinimumRoleLevel(user, 4)
  }

  /**
   * Get all roles in hierarchy order (highest to lowest)
   * @returns {Array<string>} Array of role names
   */
  getAllRoles() {
    return Object.keys(this.ROLE_HIERARCHY).sort(
      (a, b) => this.ROLE_HIERARCHY[b] - this.ROLE_HIERARCHY[a]
    )
  }

  /**
   * Get roles at or above a certain level
   * @param {number} minLevel - Minimum role level
   * @returns {Array<string>} Array of role names
   */
  getRolesAtOrAbove(minLevel) {
    return Object.keys(this.ROLE_HIERARCHY).filter(
      role => this.ROLE_HIERARCHY[role] >= minLevel
    )
  }
}

// Create singleton instance
const accessControl = new AccessControl()

// Make it globally available
window.AccessControl = AccessControl
window.accessControl = accessControl

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AccessControl
}

