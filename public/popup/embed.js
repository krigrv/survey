/**
 * Survey Widget Loader Script
 * This script dynamically loads the widget.js file which contains the actual survey popup logic
 */
(function() {
    // Get the current script element
    const currentScript = document.currentScript || document.querySelector('script[src*="embed.js"]');
    
    if (currentScript) {
        // Extract the base URL from the script source
        const scriptSrc = currentScript.src;
        let baseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/'));
        
        // Remove /popup from the base URL for API calls
        if (baseUrl.endsWith('/popup')) {
            baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/popup'));
        }
        
        // Set the global base URL for the widget
        window.SURVEY_WIDGET_BASE_URL = baseUrl;
        // Also set the popup base URL for loading widget scripts
        window.SURVEY_WIDGET_POPUP_URL = scriptSrc.substring(0, scriptSrc.lastIndexOf('/'));
        
        // Check for form ID in data attribute
        const formId = currentScript.getAttribute('data-form-id');
        if (formId) {
            window.SURVEY_FORM_ID = formId;
            console.log('Survey Widget: Form ID set to:', formId);
        }
        
        console.log('Survey Widget Base URL set to:', baseUrl);
    }
    
    // Determine which widget to load based on form ID
    const formId = window.SURVEY_FORM_ID;
    let widgetScript;
    
    if (formId) {
        // Load dynamic widget for custom forms
        widgetScript = (window.SURVEY_WIDGET_POPUP_URL || window.SURVEY_WIDGET_BASE_URL || '') + '/dynamic-widget.js';
        console.log('Survey Widget: Loading dynamic widget for form:', formId);
    } else {
        // Load static widget for backward compatibility
        widgetScript = (window.SURVEY_WIDGET_POPUP_URL || window.SURVEY_WIDGET_BASE_URL || '') + '/widget.js';
        console.log('Survey Widget: Loading static widget (no form ID specified)');
    }
    
    // Load the appropriate widget script
    const script = document.createElement('script');
    script.src = widgetScript;
    script.async = true;
    
    // Add error handling
    script.onerror = function() {
        console.error('Failed to load survey widget script:', widgetScript);
    };
    
    script.onload = function() {
        console.log('Survey widget script loaded successfully:', widgetScript);
    };
    
    document.head.appendChild(script);
})();