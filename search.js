/**
 * Search Functionality
 * Provides search capabilities across the QMS
 */

class SearchManager {
  constructor() {
    this.init()
  }

  init() {
    this.setupEventListeners()
    this.listenForSidebarLoaded()
  }

  /**
   * Listen for the custom sidebar loaded event
   */
  listenForSidebarLoaded() {
    document.addEventListener('sidebarLoaded', () => {
      console.log("Sidebar loaded event received, setting up search button")
      this.setupSearchButton()
    })
  }

  /**
   * Setup search button click handler
   */
  setupSearchButton() {
    const searchBtn = document.getElementById("search-menu-btn")
    
    if (searchBtn && !searchBtn.hasAttribute('data-search-handler-attached')) {
      console.log("Setting up search button click handler")
      searchBtn.setAttribute('data-search-handler-attached', 'true')
      
      searchBtn.addEventListener("click", (e) => {
        e.preventDefault()
        console.log("Search button clicked, navigating to search.html")
        
        // Try multiple approaches to ensure navigation works
        const searchUrl = './search.html'
        
        // Method 1: Direct navigation
        try {
          window.location.href = searchUrl
        } catch (error) {
          console.error("Navigation failed:", error)
          
          // Method 2: Alternative navigation
          try {
            window.location.assign(searchUrl)
          } catch (error2) {
            console.error("Alternative navigation failed:", error2)
            
            // Method 3: Create and click a link
            const link = document.createElement('a')
            link.href = searchUrl
            link.click()
          }
        }
      })
    }
  }


  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Wait for sidebar to be loaded
    this.waitForSidebar()
  }

  /**
   * Wait for sidebar to be loaded and then setup search button (fallback method)
   */
  waitForSidebar() {
    let buttonFound = false
    
    const checkForButton = () => {
      if (buttonFound) return true // Already found and processed
      
      const searchBtn = document.getElementById("search-menu-btn")
      
      if (searchBtn) {
        console.log("Search button found via fallback method")
        this.setupSearchButton()
        buttonFound = true
        return true // Button found and handler attached
      }
      return false // Button not found yet
    }
    
    // Try immediately
    if (checkForButton()) {
      return
    }
    
    // If not found, wait for DOM mutations (sidebar loading)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          if (checkForButton()) {
            observer.disconnect() // Stop observing once button is found
          }
        }
      })
    })
    
    // Start observing the document body for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
    
    // Fallback: stop observing after 5 seconds
    setTimeout(() => {
      observer.disconnect()
    }, 5000)
  }

}

document.addEventListener("DOMContentLoaded", () => {
  window.SearchManager = new SearchManager()
})
