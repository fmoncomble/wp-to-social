console.log('Threads content script injected');

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
            let port = browser.runtime.connect({ name: 'threadsjs' });
            port.postMessage({ action: 'readyForThread' });
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
                console.log('New post button located: ', newPostButton);
                await clickPostButton(newPostButton);
                await inputText(text);
            } else {
                console.error('Could not locate new post button');
            }
        } else {
            console.error('No response to trigger post function');
        }
    } catch (error) {
        console.error('Error in Threads script: ', error);
    }
}

function findPostButton() {
    return new Promise((resolve) => {
        setTimeout(() => {
            let newPostButton = document.querySelector("div[class='x1i10hfl xjbqb8w x6umtig x1b1mbwd xaqea5y xav7gou x9f619 xe8uvvx xdj266r xat24cr xexx8yu x4uap5 x18d9i69 x16tdsg8 x1hl2dhg xggy1nq x1a2a7pz x6s0dn4 x1a2cdl4 xnhgr82 x1qt0ttw xgk8upj x1ed109x x78zum5 x1iyjqo2 x1i64zmx x1emribx x1e558r4 x87ps6o']");
            resolve(newPostButton);
        }, 500);
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
            document.execCommand('insertText', false, text);
            resolve();
        }, 500);
    });
}

