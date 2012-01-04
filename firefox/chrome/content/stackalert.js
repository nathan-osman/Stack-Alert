// ...

var StackAlert = {
    
    //==========================================================
    //                       Constants
    //==========================================================
    
    APIKey:      ')VDFrEIR*wIQ32QVY19EGQ((',
    ClientID:    '49',
    
    //==========================================================
    //       Methods for getting / setting preferences
    //==========================================================
    
    FirefoxPreferences: Components.classes['@mozilla.org/preferences-service;1']
                          .getService(Components.interfaces.nsIPrefService)
                          .getBranch('extensions.stackalert.'),
    
    // Sets the preference with the given name to the given value
    SetPreference: function(name, value) {
        
        StackAlert.FirefoxPreferences.setCharPref(name, value);
        
    },
    
    // Retrieves the preference with the given name, setting and
    // returning the provided default value if the preference does not exist
    GetPreference: function(name, default_value) {
        
        if(StackAlert.FirefoxPreferences.prefHasUserValue(name))
            return StackAlert.FirefoxPreferences.getCharPref(name);
        else {
            
            StackAlert.SetPreference(name, default_value);
            return default_value;
            
        }
    },
    
    //==========================================================
    //    Utility methods for working with colors / icons
    //==========================================================
    
    // Generates an RGB or RGBA string for the specified parameters
    GenerateRGB: function(r, g, b, a) {
        
        // Check for the value of the 'a' parameter
        if(typeof a == 'undefined') {
            
            // If either of the other two parameters were not specified,
            // set their values to 'r'.
            if(typeof g == 'undefined')
                g = r;
            if(typeof b == 'undefined')
                b = r;
            
            return 'rgb(' + parseInt(r) + ',' + parseInt(g) + ',' + parseInt(b) + ')';
            
        }
        else
            return 'rgba(' + parseInt(r) + ',' + parseInt(g) + ',' + parseInt(b) + ',' + parseInt(a) + ')';
        
    },
    
    // Generates a data:// URL for the button
    GenerateImageURL: function(text, bg_color) {
        
        // Create a canvas element that will be used to overlay the icon
        // and the colored text.
        var canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
        canvas.setAttribute('width', 24);
        canvas.setAttribute('height', 24);
        
        console.log(canvas);
        
        // Get the context for the canvas
        var context = canvas.getContext('2d');
        
        // Load the base image and draw it onto the canvas
        var base_image = document.createElementNS('http://www.w3.org/1999/xhtml', 'img');
        base_image.src = 'chrome://stackalert/skin/button.png';
        context.drawImage(base_image, 0, 0);
        
        // Calculate the dimensions of the text
        var text_width = context.measureText(text).width;
        
        // Draw the rectangle onto the icon
        context.fillStyle = bg_color;
        context.fillRect(20 - text_width, 12, text_width + 4, 12);
        
        // Draw the text onto the rectangle
        context.fillStyle = StackAlert.GenerateRGB(255);
        context.fillText(text, 22 - text_width, 22);
        
        return canvas.toDataURL("image/png");;
        
    },
    
    // Updates the information in the icon
    UpdateIcon: function(text, tooltip, color) {
        
        // Generate the data URL for the new icon
        document.getElementById('stackalert').style.listStyleImage =
          'url(' + StackAlert.GenerateImageURL(text, color) + ')';
        
        // TODO: set the tooltip text
        
    },
    
    //==========================================================
    //              Stack Exchange API methods
    //==========================================================
    
    // Displays the authorization window on the screen
    ShowAuthWindow: function() {
        
        window.open('auth.xul', 'stackalert_auth', 'chrome');
        
    },
    
    // Begins the authorization process by opening a window for approving the extension
    // using the specified parameters
    BeginAuthorization: function(return_uri) {
        
        var browser = document.getElementById('stackalert-browser');
        
        // Listen for the load event in the browser control so that we know when the
        // browser control navigates to another page.
        browser.addEventListener('load', function() {
            
            var browser_location = browser.contentWindow.location;
            if(browser_location.href.match(/^https:\/\/stackexchange\.com\/oauth\/login_success/) !== null) {
                
                var error_message = StackAlert.CompleteAuthorization(browser_location);
                if(error_message != '')
                    alert("An error has occurred:\n\n" + error_message + "\n\nPlease click OK and try again.");
                
                // Close the window (by a very confusing means)
                browser.contentWindow.parent.close();
                
            }
            
        }, true);
        
        browser.setAttribute('src',
          'https://stackexchange.com/oauth/dialog?client_id=' + StackAlert.ClientID +
          '&scope=no_expiry,read_inbox&redirect_uri=' + encodeURIComponent(return_uri));
        
    },
    
    // Completes the authorization process by storing the access token and fetching the data
    CompleteAuthorization: function(browser_location) {
        
        // Trim the '#' from the current hash and split against '&'
        var hash = browser_location.hash;
        
        if(hash.indexOf('#') === 0)
            hash = hash.substr(1);
        
        hash = hash.split('&');
        
        // Convert to an array
        var hash_map = {};
        for(var i=0;i<hash.length;++i)
            if(hash[i] != '' && hash[i].indexOf('=') !== -1)
                hash_map[hash[i].split('=')[0]] = decodeURIComponent(hash[i].split('=')[1]).replace(/\+/g, ' ');
        
        // Determine if the access token was 
        if(typeof hash_map['access_token'] == 'undefined') {
            
            if(typeof hash_map['error_description'] != 'undefined')
                return hash_map['error_description'];
            else
                return 'No access token was specified in the hash.';
            
        } else {
            
            // Store the access token
            StackAlert.SetPreference('access_token', hash_map['access_token']);
            
            return '';
            
        }
    },
    
    //==========================================================
    //                     HTML methods
    //==========================================================
    
    // Generates the HTML for the popup
    GeneratePopupHTML: function() {
        
        // First check to see if we have an access token.
        if(StackAlert.GetPreference('access_token', '') == '') {
            
            // No access token has been specified yet, so generate the HTML
            // that asks the user to authorize the application.
            document.write('<div class="auth"><p>You need to authorize this extension to access the contents of your Stack Exchange account.</p><button onclick="StackAlert.ShowAuthWindow();">Authorize Extension</button></div>');
            
        }
        
    }
    
};