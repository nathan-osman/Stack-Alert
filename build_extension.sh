#!/bin/bash

#====================
#      Chrome
#====================

# Switch to the directory and copy the JS / CSS files
cp common/stackalert.js chrome
cp common/style.css chrome

# Generate the CRX, using an existing key if present
if [ -f stackalert.pem ] ; then KEY="--pack-extension-key=stackalert.pem" ; fi
chromium-browser --pack-extension=chrome $KEY

# Clean up
mv chrome.crx stackalert.crx
mv chrome.pem stackalert.pem

#====================
#      Firefox
#====================

# Switch to the directory and copy the JS / CSS files
cd firefox
cp ../common/stackalert.js chrome/content/stackalert.jsm
cp ../common/style.css chrome/skin/popup.css

# Now create the add-on
zip -r ../stackalert.xpi .