// This file sets the browser and API key for Chrome

StackAlert.Browser  = 'chrome';
StackAlert.IconSize = '19';
StackAlert.APIKey   = 'jo7ss)kjUytEaOELX5xdcg((';
StackAlert.ClientID = '24';

// Perform the initial update
StackAlert.PerformUpdate();

// Listen for requests to update the data
chrome.extension.onRequest.addListener(function(request, sender) {
    
    // The command to perform is listed in request
    if(request.command == 'update')
        StackAlert.PerformUpdate();
    else if(request.command == 'authorize') {
        StackAlert.CompleteAuthorization(request.hash);
        chrome.tabs.remove(sender.tab.id);
        StackAlert.PerformUpdate();
    }
    
});
