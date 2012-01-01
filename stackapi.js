//==========================================
//
// A rather simple API wrapper for getting
//   simple information from the API.
//
//==========================================

var StackAPI = {
    
    // The information needed to connect to the API
    APIKey: 'jo7ss)kjUytEaOELX5xdcg((',
    ClientID: '24',
    
    // Stores a unique number for generating unique callback names
    UniqueNumber: 0,
    
    // Generates a number that is unique for the current instance of the library
    GenerateUniqueNumber: function() {
        
        return StackAPI.UniqueNumber++;
        
    },
    
    // Makes an API request to the specified URL
    MakeRequest: function(method, parameters, success_callback, failure_callback) {
        
        // Create the unique name for the callback that we will use for the requests
        var jsonp_callback = 'jsonp_' + StackAPI.GenerateUniqueNumber();
        
        // Create the callback that gets invoked when the page loads
        window[jsonp_callback] = function(data) {
            
            if(typeof data['error_id'] == 'undefined')
                success_callback(data);
            else
                failure_callback(data);
        };
        
        // URL-encode the parameters
        var param_str = '';
        for(var key in parameters)
            param_str += '&' + key + '=' + encodeURIComponent(parameters[key]);
        
        // Create the script element and set its source
        var script_response = document.createElement('script');
        script_response.src = 'https://api.stackexchange.com/2.0' + method + '?key=' + StackAPI.APIKey + '&callback=' + jsonp_callback + param_str;
        document.getElementsByTagName('head')[0].appendChild(script_response);
        
    },
    
    // Begins an implicit OAuth 2.0 request
    BeginImplicitAuth: function(redirect_uri) {
        
        // Create the new window
        var window_url = 'https://stackexchange.com/oauth/dialog?client_id=' + StackAPI.ClientID +
                         '&scope=no_expiry,read_inbox&redirect_uri=' + encodeURIComponent(redirect_uri);
        window.open(window_url, 'auth_window', 'width=640,height=400,menubar=no,toolbar=no,location=no,status=no');
        
    },
    
    // Completes an implicit OAuth 2.0 request
    CompleteImplicitAuth: function() {
        
        // Trim the '#' and split against '&'
        var hash = location.hash;
        
        if(hash.indexOf('#') === 0)
            hash = hash.substr(1);
        
        hash = hash.split('&');
        
        // Convert to an array
        var hash_map = {};
        for(var i=0;i<hash.length;++i)
            if(hash[i] != '' && hash[i].indexOf('=') !== -1)
                hash_map[hash[i].split('=')[0]] = decodeURIComponent(hash[i].split('=')[1]).replace(/\+/g, ' ');
        
        // Retrieve the success and error callbacks
        if(typeof hash_map['access_token'] == 'undefined') {
            
            document.write('<p>An error has occurred during the authorization process. Please close this window and try again.</p>');
            
            if(typeof hash_map['error_description'] != 'undefined')
                document.write('<p><b>Description:</b> ' + hash_map['error_description'] + '</p>');
            
        } else {
            
            // Store the access token
            localStorage.setItem('access_token', hash_map['access_token']);
            
            // Trigger an update in the background page
            chrome.extension.sendRequest({});
        
            // Close the window
            window.close();
            
        }
    }
    
};