// Send the hash to complete the authorization
chrome.extension.sendRequest({ command: 'authorize',
                               hash: window.location.hash });