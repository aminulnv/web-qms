/**
 * Supabase Configuration and Client Setup
 * This file initializes the Supabase client for the QMS application
 * Reads configuration from environment variables via window.env
 * Make sure env-config.js is loaded before this file
 */

// Supabase Configuration from environment variables
if (typeof window.env === 'undefined') {
  console.error('Error: window.env is not defined. Make sure env-config.js is loaded before supabase-config.js');
}

const SUPABASE_URL = window.env?.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = window.env?.SUPABASE_ANON_KEY || ''

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables');
}

// Initialize Supabase client
let supabaseClient = null

// Initialize Supabase when the library is loaded
function initializeSupabase() {
if (typeof window.supabase !== 'undefined') {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  // Make it globally available
  window.supabaseClient = supabaseClient
  
  console.log('Supabase client initialized successfully')
  return true
}
return false
}

// Wait for Supabase library to load
function waitForSupabase() {
if (initializeSupabase()) {
  return
}

// Retry after a short delay
setTimeout(waitForSupabase, 100)
}

// Start initialization
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', waitForSupabase)
} else {
waitForSupabase()
}

// Export configuration for use in other files
window.SupabaseConfig = {
url: SUPABASE_URL,
anonKey: SUPABASE_ANON_KEY,
getClient: () => supabaseClient
}

// Authentication helper functions
window.SupabaseAuth = {
/**
 * Sign in with Google OAuth
 */
async signInWithGoogle() {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized')
  }
  
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  })
  
  if (error) {
    console.error('Google sign-in error:', error)
    throw error
  }
  
  return data
},

/**
 * Sign out the current user
 */
async signOut() {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized')
  }
  
  const { error } = await supabaseClient.auth.signOut()
  
  if (error) {
    console.error('Sign-out error:', error)
    throw error
  }
  
  // Clear local storage
  localStorage.removeItem('userInfo')
  
  return true
},

/**
 * Get current user session
 */
async getCurrentUser() {
  if (!supabaseClient) {
    return null
  }
  
  const { data: { user }, error } = await supabaseClient.auth.getUser()
  
  if (error) {
    // Only log non-session-missing errors to reduce console noise
    if (!error.message.includes('Auth session missing')) {
      console.error('Get user error:', error)
    }
    return null
  }
  
  return user
},

/**
 * Listen to auth state changes
 */
onAuthStateChange(callback) {
  if (!supabaseClient) {
    return null
  }
  
  return supabaseClient.auth.onAuthStateChange(callback)
}
}

// Database helper functions
window.SupabaseDB = {
/**
 * Generic function to fetch data from any table
 */
async fetch(tableName, options = {}) {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized')
  }
  
  let query = supabaseClient.from(tableName).select(options.select || '*')
  
  if (options.filter) {
    query = query.eq(options.filter.column, options.filter.value)
  }
  
  if (options.orderBy) {
    query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending !== false })
  }
  
  if (options.limit) {
    query = query.limit(options.limit)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error(`Error fetching from ${tableName}:`, error)
    throw error
  }
  
  return data
},

/**
 * Generic function to insert data into any table
 */
async insert(tableName, data) {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized')
  }
  
  const { data: result, error } = await supabaseClient
    .from(tableName)
    .insert(data)
    .select()
  
  if (error) {
    console.error(`Error inserting into ${tableName}:`, error)
    throw error
  }
  
  return result
},

/**
 * Generic function to update data in any table
 * IMPORTANT: For 'users' table, password_hash should NEVER be updated unless explicitly intended
 */
async update(tableName, data, filter) {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized')
  }
  
  // Safety check: If password_hash is being updated in users table, log heavily
  if (tableName === 'users' && data.password_hash !== undefined) {
    const stackTrace = new Error().stack;
    console.error(`[CRITICAL WARNING] password_hash is being updated in users table!`, {
      filter: filter,
      userEmail: filter?.value || 'unknown',
      hashPreview: typeof data.password_hash === 'string' 
        ? data.password_hash.substring(0, 8) + '...' 
        : data.password_hash,
      hashLength: typeof data.password_hash === 'string' ? data.password_hash.length : 'N/A',
      caller: stackTrace.split('\n')[2]?.trim() || 'unknown',
      fullStack: stackTrace
    });
    
    // Log the full stack trace to identify the source
    console.error('Full stack trace:', stackTrace);
  }
  
  let query = supabaseClient.from(tableName).update(data)
  
  if (filter) {
    query = query.eq(filter.column, filter.value)
  }
  
  const { data: result, error } = await query.select()
  
  if (error) {
    console.error(`Error updating ${tableName}:`, error)
    throw error
  }
  
  return result
},

/**
 * Generic function to delete data from any table
 */
async delete(tableName, filter) {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized')
  }
  
  if (!filter) {
    throw new Error('Filter is required for delete operations')
  }
  
  const { error } = await supabaseClient
    .from(tableName)
    .delete()
    .eq(filter.column, filter.value)
  
  if (error) {
    console.error(`Error deleting from ${tableName}:`, error)
    throw error
  }
  
  return true
}
}

// User Management functions
window.SupabaseUsers = {
  /**
   * Get user by email from the users table
   * Email comparison is case-insensitive
   */
  async getUserByEmail(email) {
    try {
      // Normalize email to lowercase for case-insensitive matching
      const normalizedEmail = email ? email.toLowerCase().trim() : email;
      
      const users = await window.SupabaseDB.fetch('users', {
        filter: { column: 'email', value: normalizedEmail },
        limit: 1
      })
      
      // If no user found with exact match, try case-insensitive search
      if (users.length === 0 && normalizedEmail) {
        // Try to find user with case-insensitive comparison
        // This handles cases where email might be stored in different case
        const allUsers = await window.SupabaseDB.fetch('users', { limit: 1000 })
        const foundUser = allUsers.find(u => u.email && u.email.toLowerCase() === normalizedEmail)
        return foundUser || null
      }
      
      return users.length > 0 ? users[0] : null
    } catch (error) {
      console.error('Error fetching user by email:', error)
      return null
    }
  },

/**
 * Get user by ID from the users table (now uses email as primary key)
 */
async getUserById(id) {
  try {
    const users = await window.SupabaseDB.fetch('users', {
      filter: { column: 'email', value: id },
      limit: 1
    })
    return users.length > 0 ? users[0] : null
  } catch (error) {
    console.error('Error fetching user by ID:', error)
    return null
  }
},

/**
 * Get all users with optional filtering
 */
async getAllUsers(options = {}) {
  try {
    return await window.SupabaseDB.fetch('users', options)
  } catch (error) {
    console.error('Error fetching all users:', error)
    return []
  }
},

/**
 * Update user information
 * IMPORTANT: password_hash should only be updated explicitly via profile page or admin action
 */
async updateUser(userEmail, userData) {
  try {
    // Safety check: If password_hash is being updated, log it with full stack trace
    if (userData.password_hash !== undefined) {
      const stackTrace = new Error().stack;
      console.warn(`[CRITICAL] password_hash update attempted for user: ${userEmail}`, {
        caller: stackTrace.split('\n')[2]?.trim() || 'unknown',
        fullStack: stackTrace,
        hashPreview: typeof userData.password_hash === 'string' 
          ? userData.password_hash.substring(0, 8) + '...' 
          : userData.password_hash
      });
      
      // Only allow password_hash updates - don't block, but log heavily
      // This helps identify if something is accidentally updating passwords
    }
    
    return await window.SupabaseDB.update('users', userData, { column: 'email', value: userEmail })
  } catch (error) {
    console.error('Error updating user:', error)
    throw error
  }
},

/**
 * Create a new user
 */
async createUser(userData) {
  try {
    return await window.SupabaseDB.insert('users', userData)
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
},

/**
 * Get users by role
 */
async getUsersByRole(role) {
  try {
    return await window.SupabaseDB.fetch('users', {
      filter: { column: 'role', value: role },
      orderBy: { column: 'name', ascending: true }
    })
  } catch (error) {
    console.error('Error fetching users by role:', error)
    return []
  }
},

/**
 * Get users by department
 */
async getUsersByDepartment(department) {
  try {
    return await window.SupabaseDB.fetch('users', {
      filter: { column: 'department', value: department },
      orderBy: { column: 'name', ascending: true }
    })
  } catch (error) {
    console.error('Error fetching users by department:', error)
    return []
  }
},

/**
 * Update user's last login
 */
async updateLastLogin(userId) {
  try {
    const currentCount = await this.incrementLoginCount(userId)
    return await window.SupabaseDB.update('users', {
      last_login: new Date().toISOString(),
      login_count: currentCount.toString()
    }, { column: 'email', value: userId })
  } catch (error) {
    console.error('Error updating last login:', error)
    throw error
  }
},

/**
 * Increment user's login count
 */
async incrementLoginCount(userId) {
  try {
    const user = await this.getUserByEmail(userId)
    const currentCount = parseInt(user?.login_count || '0')
    return (currentCount + 1).toString()
  } catch (error) {
    console.error('Error incrementing login count:', error)
    return '1'
  }
}
}
