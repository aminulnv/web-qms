/**
 * Authentication Check Module
 * Protects all pages from unauthorized access
 * Ensures users must be logged in to access the system
 * Enhanced with Supabase integration
 */

class AuthChecker {
  constructor() {
    this.STORAGE_KEY = "userInfo"
    this.LOGIN_PAGE = "login.html"
    this.INDEX_PAGE = "index.html"
    this.isRedirecting = false
    this.supabaseClient = null
  }

  /**
   * Initialize Supabase client
   */
  initSupabase() {
    if (window.supabaseClient) {
      this.supabaseClient = window.supabaseClient
      return true
    }
    return false
  }

  /**
   * Check if user is authenticated
   * @returns {Object|null} User data if authenticated, null otherwise
   */
  async checkAuthentication() {
    try {
      // First check localStorage for user info
      const userInfoStr = localStorage.getItem(this.STORAGE_KEY)
      
      if (userInfoStr) {
        try {
          const user = JSON.parse(userInfoStr)
          
          // Validate user data structure
          if (user && typeof user === "object" && user.email && user.name) {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(user.email)) {
              console.warn('Invalid email format in localStorage')
              this.clearInvalidCache()
              return null
            }
            
            // Check authentication type
            const provider = user.provider || 'password'
            
            // For password-based login, verify user exists and is active in database
            if (provider === 'password') {
              // Initialize Supabase for database access
              if (!this.initSupabase()) {
                // Supabase not ready yet, but allow access with cached data
                return user
              }
              
              // Wait for SupabaseUsers to be available
              if (!window.SupabaseUsers) {
                // Not ready yet, allow access with cached data
                return user
              }
              
              try {
                // Verify user still exists and is active
                const userData = await window.SupabaseUsers.getUserByEmail(user.email.toLowerCase().trim())
                
                if (!userData) {
                  console.warn('User no longer exists in database:', user.email)
                  this.clearInvalidCache()
                  return null
                }
                
                if (!userData.is_active) {
                  console.warn('User account is deactivated:', user.email)
                  this.clearInvalidCache()
                  return null
                }
                
                // Update cached user info with latest data from database
                const updatedUserInfo = {
                  id: userData.email,
                  email: userData.email,
                  name: userData.name || user.name,
                  avatar: userData.avatar_url || user.avatar,
                  picture: userData.avatar_url || user.picture,
                  role: userData.role || user.role,
                  department: userData.department || user.department,
                  designation: userData.designation || user.designation,
                  employee_id: userData.employee_id || user.employee_id,
                  permissions: userData.permissions || user.permissions,
                  provider: 'password',
                  is_active: userData.is_active
                }
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedUserInfo))
                return updatedUserInfo
              } catch (error) {
                console.warn('Error verifying password user:', error)
                // Allow access with cached data if verification fails
                return user
              }
            }
            
            // For Google/Supabase OAuth login, verify session
            if (provider === 'google' || provider === 'supabase') {
              if (!this.initSupabase()) {
                // Supabase not ready, allow cached access
                return user
              }
              
              if (!window.SupabaseAuth) {
                // Auth helpers not ready, allow cached access
                return user
              }
              
              try {
                // Verify session is valid
                const isValid = await window.SupabaseAuth.isSessionValid()
                
                if (!isValid) {
                  console.log('OAuth session invalid, attempting refresh...')
                  const refreshedSession = await window.SupabaseAuth.refreshSession()
                  
                  if (!refreshedSession) {
                    console.warn('Failed to refresh OAuth session, user needs to re-authenticate')
                    this.clearInvalidCache()
                    return null
                  }
                }
                
                // Get current auth user
                const authUser = await window.SupabaseAuth.getCurrentUser()
                if (!authUser) {
                  console.warn('No OAuth session found')
                  this.clearInvalidCache()
                  return null
                }
                
                // Verify user in database
                if (window.SupabaseUsers) {
                  const userData = await window.SupabaseUsers.getUserByEmail(authUser.email)
                  
                  if (!userData) {
                    console.warn('OAuth user not found in database:', authUser.email)
                    this.clearInvalidCache()
                    return null
                  }
                  
                  if (!userData.is_active) {
                    console.warn('OAuth user account is deactivated:', authUser.email)
                    this.clearInvalidCache()
                    return null
                  }
                  
                  // Update last login (but not too frequently)
                  const lastCheck = localStorage.getItem('lastLoginUpdate')
                  const now = Date.now()
                  if (!lastCheck || (now - parseInt(lastCheck)) > 3600000) {
                    await window.SupabaseUsers.updateLastLogin(userData.email)
                    localStorage.setItem('lastLoginUpdate', now.toString())
                  }
                  
                  // Update avatar URL from Google if available
                  if (authUser.user_metadata?.avatar_url && !userData.avatar_url) {
                    try {
                      await window.SupabaseUsers.updateUser(userData.email, {
                        avatar_url: authUser.user_metadata.avatar_url
                      })
                      userData.avatar_url = authUser.user_metadata.avatar_url
                    } catch (error) {
                      console.warn('Failed to update avatar URL:', error)
                    }
                  }
                  
                  // Update stored user info
                  const updatedUserInfo = {
                    id: userData.email,
                    email: userData.email,
                    name: userData.name,
                    avatar: userData.avatar_url,
                    picture: userData.avatar_url,
                    role: userData.role,
                    department: userData.department,
                    designation: userData.designation,
                    employee_id: userData.employee_id,
                    permissions: userData.permissions,
                    provider: provider,
                    is_active: userData.is_active
                  }
                  localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedUserInfo))
                  return updatedUserInfo
                }
                
                // Database check not available, return cached user
                return user
              } catch (error) {
                console.warn('Error verifying OAuth user:', error)
                // Allow cached access if verification fails
                return user
              }
            }
            
            // Unknown provider, but valid user data
            return user
          }
        } catch (error) {
          console.error('Error parsing user info from localStorage:', error)
          this.clearInvalidCache()
        }
      }
      
      // No cached user info, return null
      return null
      
    } catch (error) {
      console.error('Error checking authentication:', error)
      return null
    }
  }

  /**
   * Clear invalid user data from cache
   */
  clearInvalidCache() {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }

  /**
   * Redirect to login page
   */
  redirectToLogin() {
    if (this.isRedirecting) return

    this.isRedirecting = true

    try {
      window.location.href = this.LOGIN_PAGE
    } catch (error) {
      console.error('Error redirecting to login:', error)
      window.location.replace(this.LOGIN_PAGE)
    }
  }

  /**
   * Check if current page should be protected
   * @returns {boolean} True if page should be protected
   */
  shouldProtectPage() {
    const currentPage = window.location.pathname.split("/").pop()
    const unprotectedPages = [this.LOGIN_PAGE, this.INDEX_PAGE]

    return !unprotectedPages.includes(currentPage)
  }

  /**
   * Initialize authentication check
   */
  async init() {
    // Only protect pages that need authentication
    if (!this.shouldProtectPage()) {
      return
    }

    const user = await this.checkAuthentication()

    if (!user) {
      // Clear any invalid cached data
      this.clearInvalidCache()
      // Redirect to login
      this.redirectToLogin()
    }
  }

  /**
   * Logout user and redirect to login
   */
  async logout() {
    try {
      // Get user info to check authentication provider
      const userInfoStr = localStorage.getItem(this.STORAGE_KEY)
      let provider = 'password' // Default to password
      
      if (userInfoStr) {
        try {
          const userInfo = JSON.parse(userInfoStr)
          provider = userInfo.provider || 'password'
        } catch (error) {
          console.warn('Error parsing user info during logout:', error)
        }
      }
      
      console.log('Logging out user with provider:', provider)
      
      // Only sign out from Supabase Auth if user logged in via OAuth
      if (provider === 'google' || provider === 'supabase') {
        if (this.initSupabase() && window.SupabaseAuth) {
          try {
            console.log('Signing out from Supabase Auth...')
            await window.SupabaseAuth.signOut()
            console.log('Supabase Auth sign-out successful')
          } catch (error) {
            console.warn('Error signing out from Supabase Auth:', error)
            // Continue with cleanup even if sign-out fails
          }
        } else {
          console.warn('Supabase Auth not available for sign-out')
        }
      } else {
        console.log('Email/password user - skipping Supabase Auth sign-out')
      }
      
      // Clear all authentication-related localStorage items
      console.log('Clearing localStorage...')
      localStorage.removeItem(this.STORAGE_KEY)
      localStorage.removeItem('sessionToken')
      localStorage.removeItem('lastLoginUpdate')
      
      console.log('Logout complete, redirecting to login page...')
      this.redirectToLogin()
      
    } catch (error) {
      console.error('Error during logout:', error)
      
      // Force cleanup on error - clear everything
      try {
        localStorage.removeItem(this.STORAGE_KEY)
        localStorage.removeItem('sessionToken')
        localStorage.removeItem('lastLoginUpdate')
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError)
      }
      
      // Force redirect even if there are errors
      this.redirectToLogin()
    }
  }

  /**
   * Sign in with Google using Supabase
   */
  async signInWithGoogle() {
    try {
      if (!this.initSupabase()) {
        throw new Error('Supabase client not initialized')
      }
      
      const result = await window.SupabaseAuth.signInWithGoogle()
      return result
    } catch (error) {
      console.error('Google sign-in error:', error)
      throw error
    }
  }

  /**
   * Listen to authentication state changes
   */
  setupAuthListener() {
    if (!this.initSupabase()) {
      return
    }

    window.SupabaseAuth.onAuthStateChange(async (event, session) => {
      // Only log significant auth state changes
      if (event !== 'INITIAL_SESSION') {
        console.log('Auth state changed:', event, session ? 'Session active' : 'No session')
      }
      
      if (event === 'SIGNED_IN' && session) {
        // User signed in - get data from users table
        try {
          const userData = await window.SupabaseUsers.getUserByEmail(session.user.email)
          
          if (userData) {
            // Update last login
            await window.SupabaseUsers.updateLastLogin(userData.email)
            
            // Update avatar URL from Google if available and not already set
            if (session.user.user_metadata?.avatar_url && !userData.avatar_url) {
              try {
                await window.SupabaseUsers.updateUser(userData.email, {
                  avatar_url: session.user.user_metadata.avatar_url
                })
                userData.avatar_url = session.user.user_metadata.avatar_url
              } catch (error) {
                console.warn('Failed to update avatar URL:', error)
              }
            }
            
            // Store user info in localStorage
            const userInfo = {
              id: userData.email, // Use email as ID since it's the primary key
              email: userData.email,
              name: userData.name,
              avatar: userData.avatar_url,
              role: userData.role,
              department: userData.department,
              designation: userData.designation,
              employee_id: userData.employee_id,
              permissions: userData.permissions,
              provider: 'supabase',
              is_active: userData.is_active
            }
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(userInfo))
          } else {
            console.warn('User authenticated but not found in users table:', session.user.email)
            localStorage.removeItem(this.STORAGE_KEY)
          }
        } catch (error) {
          console.error('Error processing sign-in:', error)
          localStorage.removeItem(this.STORAGE_KEY)
        }
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Token was automatically refreshed - update stored session info
        console.log('✅ Auth token refreshed successfully')
        
        try {
          // Verify user still exists and is active
          const userData = await window.SupabaseUsers.getUserByEmail(session.user.email)
          
          if (userData && userData.is_active) {
            // Update stored user info with latest data
            const userInfo = {
              id: userData.email,
              email: userData.email,
              name: userData.name,
              avatar: userData.avatar_url,
              role: userData.role,
              department: userData.department,
              designation: userData.designation,
              employee_id: userData.employee_id,
              permissions: userData.permissions,
              provider: 'supabase',
              is_active: userData.is_active
            }
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(userInfo))
          } else {
            // User no longer exists or is deactivated
            console.warn('User no longer active after token refresh')
            await window.SupabaseAuth.signOut()
          }
        } catch (error) {
          console.error('Error processing token refresh:', error)
        }
      } else if (event === 'SIGNED_OUT') {
        // User signed out
        console.log('User signed out, clearing session data')
        localStorage.removeItem(this.STORAGE_KEY)
        localStorage.removeItem('lastLoginUpdate')
        if (this.shouldProtectPage()) {
          this.redirectToLogin()
        }
      } else if (event === 'USER_UPDATED' && session) {
        // User metadata was updated
        console.log('User profile updated')
        
        try {
          const userData = await window.SupabaseUsers.getUserByEmail(session.user.email)
          
          if (userData) {
            const userInfo = {
              id: userData.email,
              email: userData.email,
              name: userData.name,
              avatar: userData.avatar_url,
              role: userData.role,
              department: userData.department,
              designation: userData.designation,
              employee_id: userData.employee_id,
              permissions: userData.permissions,
              provider: 'supabase',
              is_active: userData.is_active
            }
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(userInfo))
          }
        } catch (error) {
          console.error('Error processing user update:', error)
        }
      }
    })
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", async () => {
    const authChecker = new AuthChecker()
    await authChecker.init()
    authChecker.setupAuthListener()
  })
} else {
  const authChecker = new AuthChecker()
  authChecker.init().then(() => {
    authChecker.setupAuthListener()
  })
}

// Make AuthChecker globally available for logout functionality
window.AuthChecker = AuthChecker
