/**
 * Sidebar Loader
 * Dynamically loads the sidebar from sidebar.html into all pages
 * This ensures sidebar changes only need to be made in one file
 */

class SidebarLoader {
  constructor() {
    this.sidebarContainer = null
    this.isLoaded = false
  }

  /**
   * Initialize the sidebar loader
   */
  init() {
    // Only load sidebar on pages that should have it (not login or index)
    const currentPage = window.location.pathname.split("/").pop()
    const pagesWithoutSidebar = ["login.html", "index.html"]

    if (pagesWithoutSidebar.includes(currentPage)) {
      return
    }

    this.loadSidebar()
  }

  /**
   * Load the sidebar from sidebar.html
   */
  async loadSidebar() {
    try {
      // Check if sidebar is already loaded
      if (this.isLoaded) {
        return
      }

       let sidebarHTML = ""
       let usingFallback = false

       // Check if we're running from file:// protocol (local files)
       const isFileProtocol = window.location.protocol === 'file:'
       
       if (isFileProtocol) {
         // Skip fetch for file:// protocol and use embedded fallback directly
         sidebarHTML = this.getEmbeddedSidebarHTML()
         usingFallback = true
       } else {
         try {
           // Try to fetch the sidebar HTML
           const response = await fetch("sidebar.html")
           
           if (!response.ok) {
             throw new Error(`Failed to load sidebar: ${response.status} ${response.statusText}`)
           }
           sidebarHTML = await response.text()
         } catch (fetchError) {
           // Failed to fetch sidebar.html, using embedded fallback
           sidebarHTML = this.getEmbeddedSidebarHTML()
           usingFallback = true
         }
       }

      // Create a temporary container to parse the HTML
      const tempDiv = document.createElement("div")
      tempDiv.innerHTML = sidebarHTML

      // Extract the sidebar nav element
      const sidebarNav = tempDiv.querySelector("nav.sidebar")
      if (!sidebarNav) {
        throw new Error("Sidebar nav element not found")
      }

      // Restore saved sidebar state BEFORE inserting into DOM
      const savedState = this.getSidebarState()
      const isExpanded = savedState === "expanded"

      if (isExpanded) {
        sidebarNav.classList.remove("collapsed")
      } else {
        sidebarNav.classList.add("collapsed")
      }

      // Insert the sidebar at the beginning of body
      document.body.insertBefore(sidebarNav, document.body.firstChild)

      // Add a visual indicator if using fallback
      if (usingFallback) {
        // Sidebar loaded using embedded fallback - sidebar.html may not be accessible
        // You could add a small indicator here if needed
      }

      this.isLoaded = true
      
      // Dispatch custom event when sidebar is loaded
      const sidebarLoadedEvent = new CustomEvent('sidebarLoaded', {
        detail: { usingFallback }
      })
      document.dispatchEvent(sidebarLoadedEvent)

      // Enable transitions after a brief moment to prevent flash
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          sidebarNav.classList.add("sidebar-ready")
        })
      })

      // Initialize sidebar functionality after loading
      this.initializeSidebarFunctionality()
    } catch (error) {
      // Error loading sidebar
      // Fallback: show a message or use existing sidebar
      this.showSidebarError()
    }
  }

  /**
   * Get embedded sidebar HTML as fallback
   */
  getEmbeddedSidebarHTML() {
    return `<!-- Sidebar Component -->
<nav class="sidebar collapsed" role="navigation" aria-label="Main navigation">
    <!-- Main Navigation Menu -->
    <ul class="menu-items" role="menubar">
        <li role="none">
            <button class="menu-item" role="menuitem" tabindex="0" aria-label="Search" id="search-menu-btn">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                <span>Search</span>
            </button>
        </li>

        <li role="none">
            <button class="menu-item" role="menuitem" tabindex="0" aria-label="Home">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
                <span>Home</span>
            </button>
        </li>

        <li role="none">
            <button class="menu-item" role="menuitem" tabindex="0" aria-label="Auditor's Dashboard">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                </svg>
                <span>Dashboard</span>
            </button>
        </li>

        <li role="none">
            <button class="menu-item" role="menuitem" tabindex="0" aria-label="Audit Distribution">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                <span>Audit Distribution</span>
            </button>
        </li>

        <li role="none">
            <button class="menu-item" role="menuitem" tabindex="0" aria-label="Create New Audit">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M0 0h24v24H0z" fill="none"/>
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                <span>Create Audit</span>
            </button>
        </li>

        <li role="none">
            <button class="menu-item" role="menuitem" tabindex="0" aria-label="Audit Reports">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
                <span>Reports</span>
            </button>
        </li>

        <li role="none">
            <button class="menu-item" role="menuitem" tabindex="0" aria-label="Scorecards">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                <span>Scorecards</span>
            </button>
        </li>

        <li role="none">
            <button class="menu-item" role="menuitem" tabindex="0" aria-label="Performance">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>Performance</span>
            </button>
        </li>

        <li role="none">
            <button class="menu-item" role="menuitem" tabindex="0" aria-label="Reversal">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                </svg>
                <span>Reversal</span>
            </button>
        </li>

        <li role="none">
            <button class="menu-item" role="menuitem" tabindex="0" aria-label="Improvements">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                </svg>
                <span>Improvements</span>
            </button>
        </li>

        <li role="none">
            <button class="menu-item" role="menuitem" tabindex="0" aria-label="User Management">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H17c-.8 0-1.54.37-2.01.99L14 10.5V22h2v-6h2v6h2zM12.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S11 9.17 11 10s.67 1.5 1.5 1.5zM5.5 6c1.11 0 2-.89 2-2s-.89-2-2-2-2 .89-2 2 .89 2 2 2zm2 16v-7H9V9.5c0-.83-.67-1.5-1.5-1.5S6 8.67 6 9.5V15H4.5v7h3z"/>
                </svg>
                <span>User Management</span>
            </button>
        </li>

        <li role="none">
            <button class="menu-item" role="menuitem" tabindex="0" aria-label="Settings">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                </svg>
                <span>Settings</span>
            </button>
        </li>
    </ul>

    <!-- User Profile Section at Bottom -->
    <div class="user-profile-section">
        <div class="user-profile" role="button" tabindex="0" aria-label="User Profile">
            <div class="user-avatar">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z"/>
                </svg>
            </div>
            <div class="user-info">
                <div class="user-name">Loading...</div>
                <div class="user-email">Loading...</div>
            </div>
        </div>
        
        <!-- Logout Link -->
        <div class="profile-links">
            <a href="#" class="profile-link logout-link">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
                    <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z"/>
                </svg>
                <span>Logout</span>
            </a>
        </div>
    </div>
</nav>`
  }

  /**
   * Initialize sidebar functionality (toggle, user info, etc.)
   */
  initializeSidebarFunctionality() {
    // Initialize sidebar toggle functionality
    this.initSidebarToggle()

    // Initialize user profile functionality
    this.initUserProfile()

    // Initialize menu item navigation
    this.initMenuNavigation()

    // Set active menu item based on current page
    this.setActiveMenuItem()
  }

  /**
   * Get sidebar state from localStorage
   */
  getSidebarState() {
    try {
      return localStorage.getItem("sidebarState") || "collapsed"
    } catch (error) {
      // Error reading sidebar state
      return "collapsed"
    }
  }

  /**
   * Save sidebar state to localStorage
   */
  saveSidebarState(state) {
    try {
      localStorage.setItem("sidebarState", state)
    } catch (error) {
      // Error saving sidebar state
    }
  }

  /**
   * Initialize sidebar toggle functionality
   * Note: Sidebar now uses hover functionality, no manual toggle needed
   */
  initSidebarToggle() {
    // Sidebar expansion/collapse is now handled purely by CSS hover
    // No event listeners needed
  }

  /**
   * Initialize user profile functionality
   */
  initUserProfile() {
    // Load user info from localStorage if available
    const userInfo = this.getUserInfo()
    if (userInfo) {
      this.updateUserProfile(userInfo)
    }

    // Initialize user profile click handler
    this.initUserProfileClick()

    // Initialize logout functionality
    this.initLogout()
  }

  /**
   * Get user info from localStorage
   */
  getUserInfo() {
    try {
      const userInfo = localStorage.getItem("userInfo")
      if (!userInfo) return null
      
      const parsedUserInfo = JSON.parse(userInfo)
      
      // Migration: If user has 'picture' field but no 'avatar', copy it over
      if (parsedUserInfo && parsedUserInfo.picture && !parsedUserInfo.avatar) {
        parsedUserInfo.avatar = parsedUserInfo.picture
        localStorage.setItem("userInfo", JSON.stringify(parsedUserInfo))
      }
      
      return parsedUserInfo
    } catch (error) {
      // Error loading user info
      return null
    }
  }


  /**
   * Update user profile display
   */
  updateUserProfile(userInfo) {
    if (!userInfo) return

    // Update user name
    const userNameElement = document.querySelector(".user-name")
    if (userNameElement && userInfo.name) {
      userNameElement.textContent = userInfo.name
    }

    // Update user email
    const userEmailElement = document.querySelector(".user-email")
    if (userEmailElement && userInfo.email) {
      userEmailElement.textContent = userInfo.email
    }

    // Update user avatar/profile picture
    const userAvatarElement = document.querySelector(".user-avatar")
    if (userAvatarElement && (userInfo.avatar || userInfo.picture)) {
      // Use either avatar or picture field (for backward compatibility)
      const profilePicture = userInfo.avatar || userInfo.picture
      // Replace the SVG icon with the user's profile picture
      userAvatarElement.innerHTML = `<img src="${profilePicture}" alt="Profile Picture" class="profile-picture" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
    } else if (userAvatarElement && userInfo.name) {
      // If no picture, create initials from name
      const initials = userInfo.name.split(' ').map(name => name.charAt(0)).join('').toUpperCase()
      userAvatarElement.innerHTML = `<div class="profile-initials" style="width: 100%; height: 100%; border-radius: 50%; background-color: var(--primary-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.875rem;">${initials}</div>`
    }

    // Add role and department info if available
    if (userInfo.role || userInfo.department) {
      const userEmailElement = document.querySelector(".user-email")
      if (userEmailElement) {
        let additionalInfo = []
        if (userInfo.role) additionalInfo.push(userInfo.role)
        if (userInfo.department) additionalInfo.push(userInfo.department)
        
        // Create a small info element below email
        let infoElement = document.querySelector(".user-info-extra")
        if (!infoElement) {
          infoElement = document.createElement("div")
          infoElement.className = "user-info-extra"
          infoElement.style.cssText = "font-size: 0.6875rem; color: rgba(255, 255, 255, 0.7); margin-top: 0.125rem;"
          userEmailElement.parentNode.insertBefore(infoElement, userEmailElement.nextSibling)
        }
        infoElement.textContent = additionalInfo.join(" • ")
      }
    }
  }

  /**
   * Initialize user profile click handler
   */
  initUserProfileClick() {
    const userProfile = document.querySelector(".user-profile")
    if (!userProfile) return

    userProfile.addEventListener("click", () => {
      window.location.href = "profile.html"
    })

    // Also handle keyboard navigation
    userProfile.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        window.location.href = "profile.html"
      }
    })
  }

  /**
   * Initialize logout functionality
   */
  initLogout() {
    // Wait for confirmation dialog to be available
    const initLogoutWithDelay = () => {
      const logoutBtn = document.querySelector(".logout-link")
      if (!logoutBtn) {
        // Logout button not found
        return
      }


      logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault()
        
        // Show modern confirmation dialog
        if (window.confirmationDialog) {
          const confirmed = await window.confirmationDialog.show({
            title: "Logout Confirmation",
            message: "Are you sure you want to logout? You will need to sign in again to access your account.",
            confirmText: "Logout",
            cancelText: "Cancel",
            type: "error",
          })

          if (confirmed) {
            // Use AuthChecker for proper logout
            if (window.AuthChecker) {
              const authChecker = new window.AuthChecker()
              authChecker.logout()
            } else {
              // Fallback to manual logout
              localStorage.removeItem("userInfo")
              window.location.href = "login.html"
            }
          }
        } else {
          // Fallback to basic confirm if dialog is not available
          if (confirm("Are you sure you want to logout?")) {
            // Use AuthChecker for proper logout
            if (window.AuthChecker) {
              const authChecker = new window.AuthChecker()
              authChecker.logout()
            } else {
              // Fallback to manual logout
              localStorage.removeItem("userInfo")
              window.location.href = "login.html"
            }
          }
        }
      })
    }

    // Try immediately, then with a delay if not available
    if (document.querySelector(".logout-link")) {
      initLogoutWithDelay()
    } else {
      // Wait a bit for the DOM to be ready
      setTimeout(initLogoutWithDelay, 100)
    }
  }

  /**
   * Initialize menu navigation
   */
  initMenuNavigation() {
    const menuItems = document.querySelectorAll(".menu-item")

    menuItems.forEach((item) => {
      item.addEventListener("click", () => {
        const label = item.getAttribute("aria-label")
        this.navigateToPage(label)
      })
    })
  }

  /**
   * Navigate to appropriate page based on menu item
   */
  navigateToPage(label) {
    const pageMap = {
      Home: "home.html",
      "Create New Audit": "create-audit.html",
      "Auditor's Dashboard": "auditor-dashboard.html",
      "Audit Distribution": "audit-distribution.html",
      "Audit Reports": "audit-reports.html",
      Scorecards: "scorecards.html",
      Performance: "employee-performance.html",
      Reversal: "reversal.html",
      Improvements: "improvement-corner.html",
      "User Management": "user-management.html",
      Settings: "settings.html",
    }

    const targetPage = pageMap[label]
    if (targetPage && window.location.pathname.split("/").pop() !== targetPage) {
      window.location.href = targetPage
    }
  }

  /**
   * Set active menu item based on current page
   */
  setActiveMenuItem() {
    const currentPage = window.location.pathname.split("/").pop()
    const pageMap = {
      "home.html": "Home",
      "create-audit.html": "Create New Audit",
      "auditor-dashboard.html": "Auditor's Dashboard",
      "audit-distribution.html": "Audit Distribution",
      "audit-reports.html": "Audit Reports",
      "scorecards.html": "Scorecards",
      "employee-performance.html": "Performance",
      "reversal.html": "Reversal",
      "improvement-corner.html": "Improvements",
      "settings.html": "Settings",
    }

    const currentPageLabel = pageMap[currentPage]
    if (!currentPageLabel) return

    // Remove active class from all menu items
    const menuItems = document.querySelectorAll(".menu-item")
    menuItems.forEach((item) => {
      item.classList.remove("active")
    })

    // Add active class to current page menu item
    const activeMenuItem = document.querySelector(`[aria-label="${currentPageLabel}"]`)
    if (activeMenuItem) {
      activeMenuItem.classList.add("active")
    }
  }

  /**
   * Show error message if sidebar fails to load
   */
  showSidebarError() {
    // Sidebar failed to load, using fallback
  }
}

// Initialize the sidebar loader
function initSidebar() {
  const sidebarLoader = new SidebarLoader()
  sidebarLoader.init()
}

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSidebar)
  } else {
    // DOM is already loaded
    initSidebar()
  }
