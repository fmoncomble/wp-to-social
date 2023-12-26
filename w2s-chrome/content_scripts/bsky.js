console.log('Bsky content script injected');

if (document.readyState !== 'loading') {
	console.log('Page ready, firing function');
	triggerPost();
} else {
	document.addEventListener('DOMContentLoaded', () => {
		console.log('Page was not ready, placing code here');
		triggerPost();
	});
}

function sendMessage() {
	console.log('sendMessage function invoked');
    return new Promise((resolve) => {
        try {
            let port = chrome.runtime.connect({ name: 'bskyjs' });
            port.postMessage({ action: 'readyToPost' });
            port.onMessage.addListener((msg) => getResponse(msg));
            function getResponse(msg) {
                let response = msg.response;
                console.log('Response from resultsjs: ', response);
                resolve(response);
                response = null;
            };
            port.onMessage.removeListener(getResponse);
            port.onDisconnect.addListener(() => {
                console.log('Port disconnected');
                port = null;
            });
        } catch (error) {
            console.log('Error: ', error);
            resolve(null);
        }
    });
}

async function triggerPost() {
    try {
		console.log('triggerPost function invoked');
        let response = await sendMessage();
        console.log('Text to paste: ', response);

        if (response) {
            console.log('Post function triggered…');
            let text = response;

            let newPostButton = await findPostButton();
            if (newPostButton) {
                await clickPostButton(newPostButton);
                await inputText(text);
            } else {
                console.error('Could not locate new post button');
            }
        } else {
            console.error('No response to trigger post function');
        }
    } catch (error) {
        console.error('Error in Bsky script: ', error);
    }
}

function findPostButton(retryCount = 5) {
    return new Promise((resolve) => {
    	const tryFindButton = () => {
            let newPostButton = document.querySelector("button[aria-label*='post']");
            if (newPostButton) {
            	console.log('New post button located: ', newPostButton);
            	resolve(newPostButton);
            } else {
            	if (retryCount > 0) {
            		console.log(`⚠️ Could not find new post button, retrying. Retries left: ${retryCount}`);
            		setTimeout(tryFindButton, 500);
            		retryCount--;
            	} else {
            		console.error('Maximum retries reached. Could not locate new post button');
            		resolve(null);
            	}
            }
        };
        tryFindButton();
    });
}

function clickPostButton(newPostButton) {
    return new Promise((resolve) => {
        setTimeout(() => {
            newPostButton.click();
            resolve();
        }, 0);
    });
}

function inputText(text) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const postField = document.querySelector('div.tiptap');
            if (postField) {
                console.log('New post field located: ', postField);
                postField.textContent = text;
                console.log('Pasted text: ', text);
            } else {
                console.error('Could not locate new post field');
            }
            resolve();
        }, 500);
    });
}
