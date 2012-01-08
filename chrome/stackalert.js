var EXPORTED_SYMBOLS = ['StackAlert'];

var StackAlert = {
    
    //==========================================================
    //                       Constants
    //==========================================================
    
    // Each add-on needs to set the next 3 values
    Browser:  '',
    APIKey:   '',
    ClientID: '',
    
    ColorLoading:  [255, 255, 0, 255],
    ColorEmpty:    [0, 196, 196, 196],
    ColorNewItems: [0, 128, 255, 255],
    ColorError:    [255, 0, 0, 255],
    
    //==========================================================
    //       Methods for getting / setting preferences
    //==========================================================
    
    // Sets the preference with the given name to the given value
    SetPreference: function(name, value) {
        
        if(StackAlert.Browser == 'firefox')
            Components.classes['@mozilla.org/preferences-service;1']
              .getService(Components.interfaces.nsIPrefService)
              .getBranch('extensions.stackalert.')
              .setCharPref(name, value);
        else
            localStorage.setItem(name, value);
        
    },
    
    // Retrieves the preference with the given name, setting and
    // returning the provided default value if the preference does not exist
    GetPreference: function(name, default_value) {
        
        if(StackAlert.Browser == 'firefox') {
            
            var prefs = Components.classes['@mozilla.org/preferences-service;1']
              .getService(Components.interfaces.nsIPrefService)
              .getBranch('extensions.stackalert.');
            
            if(prefs.prefHasUserValue(name))
                return prefs.getCharPref(name);
            else {
                
                StackAlert.SetPreference(name, default_value);
                return default_value;
                
            }
            
        } else {
            
            if(localStorage.getItem(name) !== null)
                return localStorage.getItem(name);
            else {
                
                StackAlert.SetPreference(name, default_value);
                return default_value;
                
            }
        }
    },
    
    //==========================================================
    //    Utility methods for working with colors / icons
    //==========================================================
    
    GenerateRGB: function(r, g, b) {
        
        // If either of the other two parameters were not specified,
        // set their values to 'r'.
        if(typeof g == 'undefined')
            g = r;
        if(typeof b == 'undefined')
            b = r;
        
        return 'rgb(' + parseInt(r) + ',' + parseInt(g) + ',' + parseInt(b) + ')';
        
    },
    
    // Generates an RGB or RGBA string from the specified array
    GenerateRGBArray: function(color_array) {
        
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
            context.fillStyle = StackAlert.GenerateRGBArray(bg_color);
            context.fillRect(20 - text_width, 12, text_width + 4, 12);
            
            // Draw the text onto the rectangle
            context.fillStyle = StackAlert.GenerateRGB(255);
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
        
        if(StackAlert.Browser == 'firefox') {
        
            for(var i=0;i<StackAlert.ButtonList.length;++i)
                StackAlert.UpdateButton(StackAlert.ButtonList[i]);
            
        } else if(StackAlert.Browser == 'chrome') {
            
            chrome.browserAction.setBadgeText({text: text});
            chrome.browserAction.setTitle({title: tooltip});
            chrome.browserAction.setBadgeBackgroundColor({color: color});
            
        }
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
    
    // Replaces anything in a URL that could cause injections
    EscapeURL: function(url_str) {
        
        // Whitelist instead of blacklist... much safer!
        return url_str.replace(/[^\w:/.#\-]/g, '');
        
    },
    
    // Part (okay, most) of this function is borrowed from here:
    // https://developer.mozilla.org/en/XUL_School/DOM_Building_and_HTML_Insertion#dom-building-html
    EscapeHTML: function(html_str) {
        
        return html_str.replace(/[&"<>]/g, function (m) { "&" + ({ "&": "amp", '"': "quot", "<": "lt", ">": "gt" })[m] + ";" });
        
    },
    
    // And this function comes from further down the same page as the
    // function above.
    SafelyAppendHTML: function(html, element) {
        
        if(StackAlert.Browser == 'firefox')
            Components.classes["@mozilla.org/feed-unescapehtml;1"]  
              .getService(Components.interfaces.nsIScriptableUnescapeHTML)  
              .parseFragment(html, false, null, element);
        else
            element.innerHTML += html;
        
    },
    
    MakeAPIRequest: function(method, parameters, success_callback, failure_callback) {
        
        // Create the request
        var request = (StackAlert.Browser == 'firefox')?Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance():new XMLHttpRequest();
        
        // URL-encode the parameters
        var param_str = '';
        for(var key in parameters)
            param_str += '&' + key + '=' + encodeURIComponent(parameters[key]);
        
        // Open the request
        request.open('GET', 'https://api.stackexchange.com/2.0' + method + '?key=' + StackAlert.APIKey + param_str);
        
        // Set the callback
        request.onreadystatechange = function() {
            
            if(request.readyState == 4) {
                
                // A status of 200 means either success or an API error ocurred
                // which means that error_id and error_message should be set
                if(request.status == 200) {
                    
                    var json_response = JSON.parse(request.responseText);
                    
                    if(typeof json_response['error_message'] != 'undefined')
                        failure_callback(json_response['error_message']);
                    else
                        success_callback(json_response);
                    
                }
                else
                    failure_callback(request.statusText);
                
            }
        };
        
        // Send the request
        request.send();
        
    },
    
    // Displays the authorization window on the screen
    ShowAuthWindow: function(window) {
        
        // For firefox, we have an XUL window we display
        // but for everything else, we just open a window
        if(StackAlert.Browser == 'firefox')
            window.open('auth.xul', 'stackalert_auth', 'chrome');
        else {
            
            var window_url = 'https://stackexchange.com/oauth/dialog?client_id=' + StackAlert.ClientID +
                             '&scope=no_expiry,read_inbox&redirect_uri=' + encodeURIComponent(chrome.extension.getURL('auth_complete.html'));
            
            window.open(window_url, 'auth_window', 'width=640,height=400,menubar=no,toolbar=no,location=no,status=no');
            
        }
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
            
            if(StackAlert.Browser == 'firefox')
                StackAlert.PerformUpdate();
            
            return '';
            
        }
    },
    
    //==========================================================
    //                    Misc. methods
    //==========================================================
    
    OpenTab: function(url) {
        
        if(StackAlert.Browser == 'firefox') {
            
            Components.utils.import("resource://gre/modules/Services.jsm");
            var browser = Services.wm.getMostRecentWindow("navigator:browser").getBrowser();
            
            // Select the newly opened tab
            browser.selectedTab = browser.addTab(url);
            
        } else
            chrome.tabs.create({'url': 'http://google.ca'});
        
    },
    
    ResetError: function() {
        
        StackAlert.SetPreference('error_details', '');
        
    },
    
    //==========================================================
    //                     HTML methods
    //==========================================================
    
    // Generates the HTML for the popup using the specified element
    GeneratePopupHTML: function(element) {
        
        // First check to see if an error needs to be displayed
        if(StackAlert.GetPreference('error_details', '') != '') {
            
            // Create the wrapping DIV
            element.setAttribute('class', 'error');
            
            // Add the header followed by the error message
            element.innerHTML = '<h3>Error</h3><p>An error has occurred. Details are below:</p>';
            StackAlert.SafelyAppendHTML(StackAlert.GetPreference('error_details',
                                                                 '<p>There was a problem retrieving error details.</p>'),
                                        element);
            
            // Add the dismissal button
            element.innerHTML += '<button onclick="StackAlert.ResetError();window.reload();">OK</button>';
            
        } else if(StackAlert.GetPreference('access_token', '') == '') {
            
            // No access token has been specified yet, so generate the HTML
            // that asks the user to authorize the application.
            element.setAttribute('class', 'auth');
            element.innerHTML = '<p>You need to authorize this extension to access the contents of your Stack Exchange account.</p><button onclick="StackAlert.ShowAuthWindow(window);">Authorize Extension</button>';
            
        } else {
            
            // Retrieve the inbox items
            var inbox_items = JSON.parse(StackAlert.GetPreference('inbox_contents', '[]'));
            
            element.setAttribute('class', 'inbox');
            element.innerHTML = '<h3>Inbox Contents</h3>';
            
            // Begin generating the HTML contents for the inbox
            var html_contents = '<ul class="contents">';
            
            // The color of the item is determined by this factor
            var color_factor = 0.4;
            
            for(var i=0;i<inbox_items.length;++i) {
                
                // Both the background and text colors begin at a constant value
                // and are modified later according to their position and status.
                var bg    = 32;
                var color = 255;
                
                // If it is unread, slowly scale back its color
                if(!inbox_items[i]['is_unread']) {
                
                    if(color_factor <= 0.1)
                        break;
                    
                    bg    *= color_factor;
                    color *= color_factor;
                    
                    color_factor -= 0.1;
                    
                }
                
                // Invert the colors
                bg    = 255 - bg;
                color = 255 - color;
                
                html_contents += '<li style="background-color: ' + StackAlert.GenerateRGB(bg) + '"><a href="javascript:void(0)" onclick="StackAlert.OpenTab(\'' + StackAlert.EscapeURL(inbox_items[i]['link']) + '\');return false;" style="color: ' + StackAlert.GenerateRGB(color) + ';"><span class="title">' + StackAlert.EscapeHTML(inbox_items[i]['title']) + '</span><span class="body">' + StackAlert.EscapeHTML(inbox_items[i]['body']) + '</span></a></li>';
                
            }
            
            html_contents += '</ul>';
            element.innerHTML += html_contents;
            
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
    
    // This method performs the actual update
    PerformUpdate: function() {
        
        // Cancel the timer if it is running
        if(StackAlert.Timer !== null) {
            
            // Cancel the timer and set it to null
            if(StackAlert.Browser == 'firefox')
                StackAlert.Timer.cancel();
            else
                window.clearTimeout(StackAlert.Timer);
            
            StackAlert.Timer = null;
            
        }
        
        StackAlert.UpdateAllButtons('...', 'Loading data...', StackAlert.ColorLoading);
        
        // Check to make sure the user is authenticated
        var access_token = StackAlert.GetPreference('access_token', '');
        
        if(access_token != '') {
            
            StackAlert.MakeAPIRequest('/inbox', { access_token: access_token, filter: '.g7piuS' },
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
                                      function(error_details) {
                                          
                                          var error_html = '<p>An error has occurred.</p><p>Details: <code>' + StackAlert.EscapeHTML(error_details) + '</code>.</p>';
                                          
                                          // Store the error HTML
                                          StackAlert.SetPreference('error_details', error_html);
                                          
                                          StackAlert.UpdateAllButtons('!', error_details, StackAlert.ColorError);
                                          
                                      });
            
            // Schedule the next update
            if(StackAlert.Browser == 'firefox') {
            
                StackAlert.Timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
                StackAlert.Timer.initWithCallback(StackAlert, 120000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
                
            } else
                StackAlert.Timer = window.setTimeout(StackAlert.PerformUpdate, 120000);
            
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