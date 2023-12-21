console.log('Content script injected');

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === "parseDom") {
        try {
            const parser = new DOMParser();
            const head = document.querySelector('head');
            const link = head.querySelector('link[rel="alternate"][type="application/json"]');
            const apiLink = link ? link.getAttribute('href') : null;

            console.log('API Link in content script:', apiLink);

            sendResponse(apiLink);
        } catch (error) {
            console.error('Error in content script:', error);
            sendResponse('');
        }

        return true; // Indicates that the response will be sent asynchronously
    }
});
