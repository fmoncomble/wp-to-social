chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === "generateUrl") {
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, async function(tabs) {
            const tab = tabs[0];
            const url = tab ? tab.url : '';
            console.log('Tab URL: ', url);

            if (url) {
                async function getApiLink() {
                    try {
                        
                        const response = await chrome.tabs.sendMessage(tab.id, { action: 'parseDom' });
                        
                        if (response) {
                            // Self-hosted blog method
                            const apiLink = response;
                            console.log('Self-hosted API link: ', apiLink);
                            return apiLink;
                        } else {
                            // Wordpress.com method				
                            // Get blog domain name and post slug
                            console.log('No self-hosted link found, trying wordpress.com');
                            const urlObject = new URL(url);
                            const blogDomain = urlObject.hostname;
                            console.log('Blog domain = ', blogDomain);
                            const path = urlObject.pathname;
                            console.log('Path: ', path);
                            const cleanPath = path.replace(/\/$/, '');
                            const pathSegments = cleanPath.split('/');
                            const postSlug = pathSegments.pop();
                            console.log('Post slug: ', postSlug);

                            // Build API link
                            const apiLink = `https://public-api.wordpress.com/rest/v1.1/sites/${blogDomain}/posts/slug:${postSlug}`
                            const response = await fetch(apiLink);
                            if (!response.ok) {
                                throw new Error('Not a Wordpress site');
                            }
                            return apiLink;
                        }
                    } catch (error) {
                        console.error('Failed to fetch API link \/ Not a Wordpress site');
                    }
                }

                // Pass REST API link
                const apiLink = await getApiLink();
                console.log('Post API link: ', apiLink);

                sendResponse({
                    url: apiLink
                });
            } else {
                console.error('No URL found in the active tab.');
                sendResponse({
                    url: ''
                }); // Sending an empty URL as a fallback
            }
        });
        return true; // Indicates that the response will be sent asynchronously
    }
});