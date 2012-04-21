#!/bin/bash

#====================
#      Chrome
#====================

echo -e "\033[34mPackaging Chrome extension...\033[m"

# Switch to the directory and copy the JS / CSS files
cp common/stackalert.js chrome
cp common/style.css chrome

# Check for an existing PEM key
KEYFILE="stackalert.pem"

if [ -f $KEYFILE ] ; then
    KEYARG="--pack-extension-key=$KEYFILE"
    echo -e "\033[32m - found existing key: $KEYFILE\033[m"
fi

ARGS="--pack-extension=chrome $KEYARG"

# Check to see if Chrome or Chromium is installed
if ! chromium-browser $ARGS 2>/dev/null ; then
    if ! google-chrome $ARGS 2>/dev/null ; then
        echo -e "\033[1m\033[31mError: neither Google Chrome nor Chromium was found on your system. At least one of them is required to run this script.\033[m"
        exit 1
    fi
fi

# Clean up
mv chrome.crx stackalert.crx

if [ -f chrome.pem ] ; then
    mv chrome.pem stackalert.pem
fi

#====================
#      Firefox
#====================

echo -e "\033[34mPackaging Firefox add-on...\033[m"

# Switch to the directory and copy the JS / CSS files
cd firefox
cp ../common/stackalert.js chrome/content/stackalert.jsm
cp ../common/style.css chrome/skin/popup.css

# Now create the add-on
zip -r ../stackalert.xpi .

#====================
#       Opera
#====================

echo -e "\033[34mPackaging Opera extension...\033[m"

# Switch to the directory and copy the JS / CSS files
cd ../opera
cp ../common/stackalert.js .
cp ../common/style.css .

# Now create the add-on
zip -r ../stackalert.oex .

echo -e "\033[32mPackaging complete!\033[m"