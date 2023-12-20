document.addEventListener("DOMContentLoaded", function() {
    const popupTitle = document.getElementById("popupTitle");
    popupTitle.textContent = chrome.i18n.getMessage("popupTitle");
    
    const retrieveMessage = document.getElementById("retrieveMessage");
	retrieveMessage.textContent = chrome.i18n.getMessage("retrieveMessage");

	const extractButton = document.getElementById("extractButton");
	extractButton.textContent = chrome.i18n.getMessage("extractButton");
    
    chrome.runtime.sendMessage({
        action: 'generateUrl'
    }, function(response) {
        if (chrome.runtime.lastError) {
            const errorMessage = document.getElementById('errorMessage');
            errorMessage.textContent = chrome.i18n.getMessage("errorMessage");
            errorMessage.style.display = 'block';
            console.error(chrome.runtime.lastError);
            return;
        }

        if (response && response.url) {
            const url = response.url;
            console.log('URL in popup: ', url);

            const spinner = document.getElementById('loading-spinner');
            spinner.style.display = 'none';
            retrieveMessage.style.display = 'none';

            extractButton.style.display = 'block';
            extractButton.addEventListener("click", function() {
                if (!url) {
                    console.error('URL not defined');
                    return;
                } else {
                    const blogPostUrl = chrome.runtime.getURL("result.html") + "?data=" + encodeURIComponent(url);
                    chrome.tabs.create({
                        url: blogPostUrl
                    });
                }
            });

        } else {
            console.error('Response is undefined or missing URL');
            const spinner = document.getElementById('loading-spinner');
//             const retrieveMessage = document.getElementById('retrieveMessage');
            spinner.style.display = 'none';
            retrieveMessage.style.display = 'none';
            const errorMessage = document.getElementById('errorMessage');
            errorMessage.textContent = chrome.i18n.getMessage("errorPopup");
            errorMessage.style.display = 'block';
        };

    });
});