// ...

var StackAlert = {
    
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
    
    ShowPopup: function() {
        
        // Display the popup...
        document.getElementById('stackalert').style.listStyleImage =
          'url(' + StackAlert.GenerateImageURL('4', StackAlert.GenerateRGB(128)) + ')';
    
    }
    
};