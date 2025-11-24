# Google OAuth Setup Guide

This guide explains how to configure Google OAuth for your QMS application.

## 1. Configure Site URL in env-config.js

**IMPORTANT:** Update the `SITE_URL` in `env-config.js` to match your domain:

```javascript
window.env = {
  // ... other config ...
  
  // For local development:
  SITE_URL: 'http://localhost:3000'
  
  // For production (REQUIRED - update with your actual domain):
  SITE_URL: 'https://your-domain.com'
  
  // ⚠️ DO NOT leave empty in production - this is used for:
  //   - OAuth redirect URLs
  //   - Secure postMessage communication between popup and parent window
};
```

**Why is this important?**
- Ensures OAuth redirects to the correct domain (not localhost)
- Enables secure cross-origin communication for popup-based authentication
- Prevents authentication failures when using non-localhost domains

## 2. Configure Supabase Dashboard

### Add Redirect URLs

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `QMS - Quality Management System`
3. Navigate to **Authentication** → **URL Configuration**
4. Add the following URLs to **Redirect URLs**:

**For Local Development:**
```
http://localhost:3000/auth-callback.html
```

**For Production:**
```
https://your-domain.com/auth-callback.html
```

### Configure Site URL

In the same **URL Configuration** section:

**Site URL:**
```
http://localhost:3000    (for development)
https://your-domain.com  (for production)
```

## 3. Configure Google Cloud Console

### Update Authorized Redirect URIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client ID
3. Add these **Authorized redirect URIs**:

**Supabase OAuth Callback:**
```
https://xijmkmvsumeoqarpmpvi.supabase.co/auth/v1/callback
```

**Your Application URLs:**
```
http://localhost:3000/auth-callback.html    (for development)
https://your-domain.com/auth-callback.html  (for production)
```

### Authorized JavaScript Origins

Add these origins:
```
http://localhost:3000    (for development)
https://your-domain.com  (for production)
https://xijmkmvsumeoqarpmpvi.supabase.co
```

## 4. Test the OAuth Flow

1. Start your application: `http://localhost:3000`
2. Click "Sign in with Google"
3. Popup should open (not redirect main page)
4. Complete Google authentication
5. Popup closes and you're logged in

## Troubleshooting

### Issue: "Redirect URI mismatch" error

**Solution:** 
- Check that the redirect URL in Google Cloud Console matches exactly
- Include the port number for localhost (e.g., `:3000`)
- Supabase callback URL must be added: `https://xijmkmvsumeoqarpmpvi.supabase.co/auth/v1/callback`

### Issue: OAuth redirects to localhost in production

**Solution:**
- Update `SITE_URL` in `env-config.js` to your production domain
- Update Supabase Dashboard Site URL
- Add production redirect URL to Google Cloud Console

### Issue: "Rejected message from unauthorized origin" in console

**Symptoms:**
- OAuth popup completes successfully
- Popup closes but login doesn't complete
- Console shows: "Rejected message from unauthorized origin"

**Solution:**
- Set `SITE_URL` in `env-config.js` to match your production domain
- Ensure the `SITE_URL` matches exactly (including http/https and port)
- Example: If accessing site at `https://example.com`, set `SITE_URL: 'https://example.com'`
- Clear browser cache and try again

### Issue: Popup blocked

**Solution:**
- Allow popups for your domain in browser settings
- The OAuth flow requires popup to work properly

## Environment-Specific Configuration

### Development
```javascript
SITE_URL: 'http://localhost:3000'
```

### Staging
```javascript
SITE_URL: 'https://staging.your-domain.com'
```

### Production
```javascript
SITE_URL: 'https://your-domain.com'
```

## Auto-Detection (Default)

If `SITE_URL` is empty or not set, the application will auto-detect the URL from `window.location.origin`. This works well for development but is recommended to set explicitly for production.

---

## Quick Checklist

- [ ] `SITE_URL` configured in `env-config.js`
- [ ] Supabase Dashboard: Redirect URLs added
- [ ] Supabase Dashboard: Site URL configured
- [ ] Google Cloud Console: OAuth Client has redirect URIs
- [ ] Google Cloud Console: JavaScript origins added
- [ ] Test OAuth login flow

---

**Note:** After making changes to OAuth configuration, wait a few minutes for changes to propagate, then test the login flow.

