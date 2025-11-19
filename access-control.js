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
    this.rulesLoaded = false
    this.rulesLoadPromise = null
    
    // Define role hierarchy (higher number = higher access level)
    this.ROLE_HIERARCHY = {
      'Super Admin': 5,
      'Admin': 4,
      'Quality Supervisor': 3,
      'Quality Analyst': 2,
      'Employee': 1,
      'General User': 0
    }

    // Define default page access rules (fallback if database not available)
    // Each page can specify:
    // - allowedRoles: Array of roles that can access
    // - minRoleLevel: Minimum role level required (uses hierarchy)
    // - customCheck: Function for custom access logic
    this.DEFAULT_PAGE_ACCESS_RULES = {
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
      },
      'access-control.html': {
        allowedRoles: ['Super Admin'] // Only Super Admins
      }
    }

    // Define default feature permissions (fallback if database not available)
    // Features that can be checked independently
    this.DEFAULT_FEATURE_PERMISSIONS = {
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

    // Initialize with default rules (will be overridden by database rules if available)
    this.PAGE_ACCESS_RULES = { ...this.DEFAULT_PAGE_ACCESS_RULES }
    this.FEATURE_PERMISSIONS = { ...this.DEFAULT_FEATURE_PERMISSIONS }
    
    // Load rules from database (async, non-blocking)
    this.loadRulesFromDatabase()
  }

  /**
   * Load access control rules from database
   * Falls back to default rules if database is unavailable
   */
  async loadRulesFromDatabase() {
    // Prevent multiple simultaneous loads
    if (this.rulesLoadPromise) {
      return this.rulesLoadPromise
    }

    this.rulesLoadPromise = (async () => {
      try {
        // Wait for Supabase to be available
        if (!window.supabaseClient) {
          // Supabase not ready yet, use defaults
          this.rulesLoaded = true
          return
        }

        // Load page rules
        const { data: pageRules, error: pageError } = await window.supabaseClient
          .from('access_control_rules')
          .select('*')
          .eq('rule_type', 'page')
          .eq('is_active', true)

        if (!pageError && pageRules) {
          console.log('[AccessControl] Loaded page rules from database:', pageRules)
          // Convert database rules to internal format
          const dbPageRules = {}
          pageRules.forEach(rule => {
            dbPageRules[rule.resource_name] = {}
            if (rule.allowed_roles) {
              dbPageRules[rule.resource_name].allowedRoles = rule.allowed_roles
            }
            if (rule.min_role_level !== null && rule.min_role_level !== undefined) {
              dbPageRules[rule.resource_name].minRoleLevel = rule.min_role_level
            }
            // Note: customCheck functions cannot be stored in database, use defaults for those
            console.log(`[AccessControl] Processed rule for ${rule.resource_name}:`, {
              allowedRoles: rule.allowed_roles,
              minRoleLevel: rule.min_role_level,
              is_active: rule.is_active
            })
          })

          // Merge database rules with defaults (database takes precedence, but keep customCheck from defaults)
          Object.keys(this.DEFAULT_PAGE_ACCESS_RULES).forEach(pageName => {
            const defaultRule = this.DEFAULT_PAGE_ACCESS_RULES[pageName]
            const dbRule = dbPageRules[pageName]
            
            if (dbRule) {
              // Use database rule but preserve customCheck from default if it exists
              // If allowedRoles is present, clear minRoleLevel to avoid conflicts
              const mergedRule = {
                ...dbRule,
                customCheck: defaultRule.customCheck // Preserve custom check functions
              }
              
              // If allowedRoles is set, explicitly clear minRoleLevel
              if (mergedRule.allowedRoles) {
                mergedRule.minRoleLevel = undefined
              }
              
              this.PAGE_ACCESS_RULES[pageName] = mergedRule
            } else {
              // Use default rule
              this.PAGE_ACCESS_RULES[pageName] = { ...defaultRule }
            }
          })

          // Add any new rules from database that aren't in defaults
          Object.keys(dbPageRules).forEach(pageName => {
            if (!this.PAGE_ACCESS_RULES[pageName]) {
              const newRule = { ...dbPageRules[pageName] }
              // If allowedRoles is set, explicitly clear minRoleLevel
              if (newRule.allowedRoles) {
                newRule.minRoleLevel = undefined
              }
              this.PAGE_ACCESS_RULES[pageName] = newRule
            }
          })
          
          // Debug: Log loaded rules
          console.log('[AccessControl] Final merged access control rules:', this.PAGE_ACCESS_RULES)
          if (this.PAGE_ACCESS_RULES['user-management.html']) {
            console.log('[AccessControl] user-management.html rule:', this.PAGE_ACCESS_RULES['user-management.html'])
          }
        }

        // Load feature rules
        const { data: featureRules, error: featureError } = await window.supabaseClient
          .from('access_control_rules')
          .select('*')
          .eq('rule_type', 'feature')
          .eq('is_active', true)

        if (!featureError && featureRules) {
          // Convert database rules to internal format
          const dbFeatureRules = {}
          featureRules.forEach(rule => {
            dbFeatureRules[rule.resource_name] = {}
            if (rule.allowed_roles) {
              dbFeatureRules[rule.resource_name].allowedRoles = rule.allowed_roles
            }
            if (rule.min_role_level !== null && rule.min_role_level !== undefined) {
              dbFeatureRules[rule.resource_name].minRoleLevel = rule.min_role_level
            }
          })

          // Merge database rules with defaults
          Object.keys(this.DEFAULT_FEATURE_PERMISSIONS).forEach(featureName => {
            const defaultRule = this.DEFAULT_FEATURE_PERMISSIONS[featureName]
            const dbRule = dbFeatureRules[featureName]
            
            if (dbRule) {
              this.FEATURE_PERMISSIONS[featureName] = dbRule
            } else {
              this.FEATURE_PERMISSIONS[featureName] = { ...defaultRule }
            }
          })

          // Add any new rules from database
          Object.keys(dbFeatureRules).forEach(featureName => {
            if (!this.FEATURE_PERMISSIONS[featureName]) {
              this.FEATURE_PERMISSIONS[featureName] = dbFeatureRules[featureName]
            }
          })
        }

        this.rulesLoaded = true
      } catch (error) {
        console.warn('Error loading access control rules from database, using defaults:', error)
        // Use default rules on error
        this.PAGE_ACCESS_RULES = { ...this.DEFAULT_PAGE_ACCESS_RULES }
        this.FEATURE_PERMISSIONS = { ...this.DEFAULT_FEATURE_PERMISSIONS }
        this.rulesLoaded = true
      } finally {
        this.rulesLoadPromise = null
      }
    })()

    return this.rulesLoadPromise
  }

  /**
   * Refresh rules from database (useful after admin updates)
   */
  async refreshRules() {
    this.rulesLoaded = false
    this.rulesLoadPromise = null
    return this.loadRulesFromDatabase()
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
   * Check user-specific access rules from database
   * @param {string} userEmail - User email
   * @param {string} resourceName - Resource name (page or feature)
   * @param {string} resourceType - 'page' or 'feature'
   * @returns {Object|null} { access_type: 'allow'|'deny', is_active: boolean } or null if no rule
   */
  async checkUserSpecificRule(userEmail, resourceName, resourceType) {
    try {
      if (!window.supabaseClient) {
        return null
      }

      const { data, error } = await window.supabaseClient
        .from('user_access_rules')
        .select('access_type, is_active')
        .eq('user_email', userEmail)
        .eq('rule_type', resourceType)
        .eq('resource_name', resourceName)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.warn('Error checking user-specific rule:', error)
        return null
      }

      return data || null
    } catch (error) {
      console.warn('Exception checking user-specific rule:', error)
      return null
    }
  }

  /**
   * Check if user can access a page
   * @param {string} pageName - Name of the page (e.g., 'audit-distribution.html')
   * @param {Object} context - Optional context object for custom checks (e.g., { assignment: {...} })
   * @returns {Object} { allowed: boolean, reason?: string }
   */
  async canAccessPage(pageName, context = null) {
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

    // First check user-specific rules (highest priority)
    const userRule = await this.checkUserSpecificRule(user.email, pageName, 'page')
    if (userRule) {
      console.log(`[AccessControl] User-specific rule found for ${user.email} on ${pageName}:`, userRule)
      return {
        allowed: userRule.access_type === 'allow',
        reason: userRule.access_type === 'allow' 
          ? 'Access granted via user-specific rule' 
          : 'Access denied via user-specific rule'
      }
    }

    // No user-specific rule, check role-based rules
    // Get access rule for this page
    const rule = this.PAGE_ACCESS_RULES[pageName]
    
    console.log(`[AccessControl] Checking access for ${user.email} (${user.role}) to ${pageName}:`, rule)
    
    if (!rule) {
      // No rule defined - default to allowing access (fail open for backward compatibility)
      console.warn(`No access rule defined for page: ${pageName}`)
      return {
        allowed: true,
        reason: 'No access rule defined'
      }
    }

    // Check allowedRoles first - if present and user matches, allow access (unless customCheck overrides)
    if (rule.allowedRoles) {
      if (this.hasAllowedRole(user, rule.allowedRoles)) {
        // User matches allowedRoles - allow access (but still run customCheck if present)
        // Skip minRoleLevel check since allowedRoles takes precedence
      } else {
        return {
          allowed: false,
          reason: `Role '${user.role}' is not allowed. Required: ${Array.isArray(rule.allowedRoles) ? rule.allowedRoles.join(', ') : rule.allowedRoles}`
        }
      }
    } else {
      // Only check minRoleLevel if allowedRoles is not specified
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
  async canAccessFeature(featureName) {
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

    // First check user-specific rules (highest priority)
    const userRule = await this.checkUserSpecificRule(user.email, featureName, 'feature')
    if (userRule) {
      return {
        allowed: userRule.access_type === 'allow',
        reason: userRule.access_type === 'allow' 
          ? 'Access granted via user-specific rule' 
          : 'Access denied via user-specific rule'
      }
    }

    // No user-specific rule, check role-based rules
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
  async enforcePageAccess(pageName, context = null, redirectTo = 'home.html') {
    const accessCheck = await this.canAccessPage(pageName, context)
    
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

