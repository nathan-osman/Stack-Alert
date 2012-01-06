var EXPORTED_SYMBOLS = ['StackAlert'];

// TODO:
// - we can actually use cross-domain requests in both cases, so we should switch to that

var StackAlert = {
    
    //==========================================================
    //                       Constants
    //==========================================================
    
    APIKey:      ')VDFrEIR*wIQ32QVY19EGQ((',
    ClientID:    '49',
    
    ColorLoading:  [255, 255, 0, 255],
    ColorEmpty:    [0, 196, 196, 196],
    ColorNewItems: [0, 128, 255, 255],
    ColorError:    [255, 0, 0, 255],
    
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
    
    // Generates an RGB or RGBA string from the specified array
    GenerateRGB: function(color_array) {
        
        // Check for the value of the 'a' parameter
        if(color_array.length < 4)
            return 'rgb(' + color_array[0] + ',' + color_array[1] + ',' + color_array[2] + ')';
        else
            return 'rgba(' + color_array[0] + ',' + color_array[1] + ',' + color_array[2] + ',' + color_array[3] + ')';
        
    },
    
    // Generates a data:// URL for the button
    GenerateImageURL: function(document, text, bg_color, complete_callback) {
        
        // Create a canvas element that will be used to overlay the icon
        // and the colored text.
        var canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
        canvas.setAttribute('width', 24);
        canvas.setAttribute('height', 24);
        
        // Get the context for the canvas
        var context = canvas.getContext('2d');
        
        // Load the base image and draw it onto the canvas
        var base_image = document.createElementNS('http://www.w3.org/1999/xhtml', 'img');
        base_image.src = 'chrome://stackalert/skin/button.png';
        
        // Once the image has loaded, draw it
        base_image.addEventListener('load', function() {
            
            context.drawImage(base_image, 0, 0);
            
            // Calculate the dimensions of the text
            var text_width = context.measureText(text).width;
            
            // Draw the rectangle onto the icon
            context.fillStyle = StackAlert.GenerateRGB(bg_color);
            context.fillRect(20 - text_width, 12, text_width + 4, 12);
            
            // Draw the text onto the rectangle
            context.fillStyle = StackAlert.GenerateRGB([255, 255, 255]);
            context.fillText(text, 22 - text_width, 22);
            
            complete_callback(canvas.toDataURL("image/png"));
            
        }, true);
        
    },
    
    // List of buttons that receive notifications when the icon changes
    ButtonList: [],
    
    // The current details for all of the buttons
    ButtonText:    null,
    ButtonTooltip: null,
    ButtonColor:   [],
    
    // Updates the information on a particular icon
    UpdateButton: function(button) {
        
        StackAlert.GenerateImageURL(button.getUserData('document'),
                                    StackAlert.ButtonText,
                                    StackAlert.ButtonColor,
                                    function(image_url) {
        
            button.style.listStyleImage = 'url(' + image_url + ')';
            button.setAttribute('tooltiptext', StackAlert.ButtonTooltip);
            
        });
    },
    
    // Updates the information on all currently registered buttons
    // and stores the information for updating future buttons.
    UpdateAllButtons: function(text, tooltip, color) {
        
        StackAlert.ButtonText    = text;
        StackAlert.ButtonTooltip = tooltip;
        StackAlert.ButtonColor   = color;
        
        for(var i=0;i<StackAlert.ButtonList.length;++i)
            StackAlert.UpdateButton(StackAlert.ButtonList[i]);
        
    },
    
    // Adds a button to the list of buttons to receive notifications when
    // the icon needs to be modified.
    RegisterButton: function(document, button) {
        
        // Set the document property of the button
        button.setUserData('document', document, null);
        
        StackAlert.ButtonList.push(button);
        
        if(StackAlert.ButtonText !== null)
            StackAlert.UpdateButton(button);
        
    },
    
    // Removes a button from the list of registered buttons
    UnregisterButton: function(button) {
        
        var index = StackAlert.ButtonList.indexOf(button);
        
        if(index != -1)
            StackAlert.ButtonList.splice(index, 1);
        
    },
    
    //==========================================================
    //              Stack Exchange API methods
    //==========================================================
    
    MakeAPIRequest: function(method, parameters, success_callback, failure_callback) {
        
        // Create the request
        var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
        
        // URL-encode the parameters
        var param_str = '';
        for(var key in parameters)
            param_str += '&' + key + '=' + encodeURIComponent(parameters[key]);
        
        // Open the request
        request.open('GET', 'https://api.stackexchange.com/2.0' + method + '?key=' + StackAlert.APIKey + param_str);
        
        // Set the callback
        request.onreadystatechange = function() {
            
            if(request.readyState == 4) {
                
                if(request.status == 200)
                    success_callback(JSON.parse(request.responseText));
                else
                    failure_callback(JSON.parse(request.responseText));
                
            }
        };
        
        // Send the request
        request.send();
        
    },
    
    // Displays the authorization window on the screen
    ShowAuthWindow: function() {
        
        window.open('auth.xul', 'stackalert_auth', 'chrome');
        
    },
    
    // Begins the authorization process by opening a window for approving the extension
    // using the specified parameters
    BeginAuthorization: function(browser, return_uri) {
        
        // Listen for the load event in the browser control so that we know when the
        // browser control navigates to another page.
        browser.addEventListener('load', function() {
            
            var browser_location = browser.contentWindow.location;
            if(browser_location.href.match(/^https:\/\/stackexchange\.com\/oauth\/login_success/) !== null) {
                
                var error_message = StackAlert.CompleteAuthorization(browser_location);
                if(error_message != '')
                    alert("An error has occurred:\n\n" + error_message + "\n\nPlease click OK and try again.");
                
                // Force a refresh
                //...
                
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
            
            // Refresh the buttons
            StackAlert.PerformUpdate();
            
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
            
        } else {
            
            var html = '<div class="inbox"><h3>Inbox Contents</h3><ul class="contents">';
            
            //...
            
            html += '</ul>';
            document.write(html);
            
        }
    },
    
    //==========================================================
    //                  Processing methods
    //==========================================================
    
    // In order to schedule updates to the icon, it is necessary to
    // use a timer. Different browsers do this in different ways -
    // on Chrome we can use window.setTimeout. On Firefox, we use
    // an nsITimer instance. Either way, the timer is stored in a
    // variable Timer.
    
    Timer: null,
    
    // This method is invoked when the timer fires
    notify: function() {
        
        StackAlert.PerformUpdate();
        
    },
    
    PerformUpdate: function() {
        
        // Cancel the timer if it is running
        if(StackAlert.Timer !== null) {
            
            StackAlert.Timer.cancel();
            StackAlert.Timer = null;
            
        }
        
        StackAlert.UpdateAllButtons('...', 'Loading data...', StackAlert.ColorLoading);
        
        // Check to make sure the user is authenticated
        var access_token = StackAlert.GetPreference('access_token', '');
        
        if(access_token != '') {
            
            StackAlert.MakeAPIRequest('/inbox', { access_token: access_token, filter: '!-pvd4dkY' },
                                      function(data) {
                                          
                                          // Store the data
                                          StackAlert.SetPreference('inbox_contents', JSON.stringify(data['items']));
                                          
                                          var unread = 0;
                                          for(var i=0;i<data['items'].length;++i) {
                                              if(data['items'][i]['is_unread'])
                                                  ++unread;
                                          }
                                          
                                          StackAlert.UpdateAllButtons(unread.toString(),
                                                                      'You have ' + unread + ' unread items in your inbox.',
                                                                      (unread)?StackAlert.ColorNewItems:StackAlert.ColorEmpty);
                                          
                                      },
                                      function(data) {
                                          
                                          StackAlert.UpdateAllButtons('!', data['error_message'], StackAlert.ColorError);
                                          
                                      });
            
            // Schedule the next update
            StackAlert.Timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
            StackAlert.Timer.initWithCallback(StackAlert, 120000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
            
        } else
            StackAlert.UpdateAllButtons('!', 'Stack Alert has not been authorized to access your account.', StackAlert.ColorError);
        
    },
    
    // Whether or not we have already begun the background timer
    BackgroundTimer: false,
    
    // Begins the background timer that checks periodically for new items
    StartBackgroundTimer: function() {
        
        if(!StackAlert.BackgroundTimer) {
            
            StackAlert.BackgroundTimer = true;
            StackAlert.PerformUpdate();
            
        }
    }
};