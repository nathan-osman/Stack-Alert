// ==UserScript==
// @include https://stackexchange.com/oauth/login_success*
// ==/UserScript==

// Close this window.
window.addEventListener('load', function() {
    
    // Send the access token to the background script
    // which will store it for later usage.
    opera.extension.postMessage(window.location.hash);
    
    // Close the window
    window.close();
    
}, true);