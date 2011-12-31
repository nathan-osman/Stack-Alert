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
                error_callback(data);
        };
        
        // URL-encode the parameters
        var param_str = '';
        for(var key in parameters)
            param_str += '&' + key + '=' + encodeURIComponent(parameters[key]);
        
        // Create the script element and set its source
        var script_response = document.createElement('script');
        script_response.src = 'http://api.stackexchange.com/2.0' + method + '?key=' + StackAPI.APIKey + '&callback=' + jsonp_callback + param_str;
        document.getElementsByTagName('head')[0].appendChild(script_response);
        
    },
    
    // Begins an implicit OAuth 2.0 request
    BeginImplicitRequest: function() {
        
        //...
        
    },
    
    // Completes an implicit OAuth 2.0 request
    CompleteImplicitRequest: function() {
        
        //...
        
    }
    
};

/*
// In case we are participating in an implicit OAuth transaction,
// check to see if we need to complete the process.
if(typeof window.opener != 'undefined' && window.opener !== null && typeof window.opener.StackPHP != 'undefined') {
    
    window.opener.StackPHP.CompleteImplicitFlow(location.hash);
    window.close();
    
}
*/