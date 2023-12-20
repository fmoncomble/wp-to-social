document.addEventListener("DOMContentLoaded", async function() {

    // Get interface elements
    const tweetContainer = document.getElementById('content');    
    const createButton = document.getElementById("createButton");
    createButton.textContent = chrome.i18n.getMessage("createThread");
    createButton.addEventListener('click', extractPost);
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = chrome.i18n.getMessage('errorMessage');
    const spinner = document.getElementById('loading-spinner');
	const tweetCounter = document.getElementById('post-count');
    
    // Get Mastodon interface elements
	const modal = document.getElementById('modal');
	const mastoInput = document.getElementById('mastoInput');
	mastoInput.textContent = chrome.i18n.getMessage('mastoInput');
    const instanceLoader = document.getElementById('instanceLoader');
	instanceLoader.addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			launchMastodon();
		};
	});
	const mastoButton = document.getElementById('launch-mastodon');
	mastoButton.textContent = chrome.i18n.getMessage('shareMasto');
	mastoButton.addEventListener('click', () => {
		launchMastodon();
	});

    // Get post URL
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const postApiUrl = urlParams.get("data");
    console.log('Extracting from: ', postApiUrl);

    // Get social network option
    const socialOption = document.getElementById("socialOption");
    const socialSelect = document.getElementById('socialSelect');
    socialSelect.textContent = chrome.i18n.getMessage('socialSelect');

    // Function to extract blog post
    async function extractPost() {
        try {
            spinner.style.display = 'block';
            tweetCounter.style.display = 'none';

            let postContent;

            const response = await fetch(postApiUrl);
            const postData = await response.json();
            postContent = postData.content.rendered;
            if (!postContent) {
                postContent = postData.content;
            }

            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = postContent;

            const nodes = tempContainer.querySelectorAll('p, img, ul, ol');
            if (nodes.length > 0) {
                console.log('Nodes found: ', nodes);
            } else {
                console.error('No nodes found.');
            };

            tweetContainer.innerHTML = '';

            // Extract content depending on node type
            Array.from(nodes).forEach(node => {
                if (node.textContent) {
                	const links = node.querySelectorAll('a');
                    if (links.length > 0) {
                    	links.forEach(link => {
                    		const img = link.querySelector('img')
                    		const hashtag = link.textContent.match(/#\w+?/);
                    		const urlText = link.textContent.match(/\w*\/\w*/);
                    		if (!img && !hashtag && urlText) {
								const url = link.getAttribute('href');
								link.textContent = '(' + url + ')';  
                    		};            		
                    	});
                    };
                    const text = node.innerText;
                    const textTweets = splitIntoTweets(text);
                    console.log('Tweets: ', textTweets);
                    textTweets.forEach(tweet => {
                        const tweetUnit = createTweetUnit(tweet);
                        tweetContainer.appendChild(tweetUnit);
                    });
                } else if (node.tagName === 'IMG') {
                    const imgSrc = node.src;
                    console.log('Image URL: ', imgSrc);
                    const tweetUnit = createTweetUnit(imgSrc, true);
                    tweetContainer.appendChild(tweetUnit);

                    const copyButton = tweetUnit.querySelector('.copy-button');
                    copyButton.addEventListener('click', () => {
                        copyImageToClipboard(imgSrc, copyButton);
                    });
                }
            });

            // Create last tweet with blog post URL
            let postUrl = postData.link;
            if (!postUrl) {
            	postUrl = postData.URL;
            }
            
            let lastTweetBlurb = chrome.i18n.getMessage('lastTweetBlurb');
            const lastTweetText = `${lastTweetBlurb}
${postUrl}`;
            const lastTweet = createTweetUnit(lastTweetText);
            tweetContainer.appendChild(lastTweet);
    
			// Add thread initiation button
			const ouText = document.createElement('span');
			ouText.classList.add('init-thread');
			ouText.textContent = chrome.i18n.getMessage('or');
			
			const copyButton = document.getElementsByClassName('copy-button')[0];
			
			const initButton = document.createElement('button');
			initButton.classList.add('init-thread');
			const initText = document.createElement('text');
			initText.style.verticalAlign = 'middle';
			initButton.appendChild(initText);
			const initIcon = document.createElement('img');
			initIcon.height = '20';
			initIcon.style.verticalAlign = 'middle';
			
			if (socialOption.selectedOptions[0].label === '𝕏 / Twitter') {
				initText.textContent = chrome.i18n.getMessage('initX');
				initButton.classList.add('init-x');
				copyButton.before(ouText);
				ouText.before(initButton);
			} else if (socialOption.selectedOptions[0].label === 'Mastodon') {
				const mastoIcon = document.createElement('img');
				initIcon.src = 'icons/masto-logo-white.svg';
				initText.before(initIcon);
				initText.textContent = chrome.i18n.getMessage('initMasto');
				initButton.classList.add('init-masto');
				copyButton.before(ouText);
				ouText.before(initButton);
			} else if (socialOption.selectedOptions[0].label === 'Bluesky') {
				initText.textContent = chrome.i18n.getMessage('initBsky');
				initButton.classList.add('init-bsky');
				ouText.textContent = chrome.i18n.getMessage('and');
				copyButton.after(ouText);
				ouText.after(initButton);
			} else if (socialOption.selectedOptions[0].label === 'Threads') {
				const threadsIcon = document.createElement('img');
				initIcon.src = 'icons/threads-icon.svg';
				initText.before(initIcon);
				initText.textContent = chrome.i18n.getMessage('initThreads');
				initButton.classList.add('init-threads');
				ouText.textContent = chrome.i18n.getMessage('and');
				copyButton.after(ouText);
				ouText.after(initButton);
			};

			initButton.addEventListener('click', () => {
				initiateThread(initButton)
			});

            // Hide loading spinner after extraction
            spinner.style.display = 'none';
            
            // Count generated tweets
            const tweetUnits = tweetContainer.querySelectorAll('.tweet-frame');
            console.log('Number of posts generated: ', tweetUnits.length);
            const tweetCount = tweetUnits.length;
            let tweetCounterText = chrome.i18n.getMessage('tweetCounter');
            tweetCounter.style.display = 'block';
            tweetCounter.textContent = `${tweetCount} ${tweetCounterText}`;

        } catch (error) {
            console.error(error);
            const spinner = document.getElementById('loading-spinner');
            spinner.style.display = 'none';
            createButton.style.display = 'none';
            errorMessage.style.display = 'block';
            errorMessage.textContent = chrome.i18n.getMessage('errorMessage');
        }
    };


    // Function to create a tweet unit (text or image)
    function createTweetUnit(content, isImage = false) {
        const tweetUnit = document.createElement('div');
        tweetUnit.classList.add('tweet-frame');

        const contentElement = isImage ? createImageElement(content) : createTextElement(content);
        tweetUnit.appendChild(contentElement);
        
        // Add footer container
        const tweetFooter = document.createElement('div');
        tweetFooter.classList.add('tweet-footer');
        tweetUnit.appendChild(tweetFooter);
				
		// Add copy button
        const copyButton = document.createElement('button');
        copyButton.classList.add('copy-button');
        copyButton.textContent = chrome.i18n.getMessage('copy');
        copyButton.addEventListener('click', () => {
            copyToClipboard(content, copyButton, tweetUnit, tweetFooter)
        });
        tweetFooter.appendChild(copyButton); 
        
		const appendixContainer = document.createElement('div');
		appendixContainer.classList.add('clearfix');
		tweetFooter.appendChild(appendixContainer);
		       
		// Add edit/save buttons
		if (!isImage) {
			const editButton = document.createElement('button');
			const saveButton = document.createElement('button');
			const cancelButton = document.createElement('button');
			editButton.classList.add('edit-button');
			saveButton.classList.add('edit-button');
			cancelButton.classList.add('edit-button');
			editButton.textContent = chrome.i18n.getMessage('edit');
			saveButton.textContent = chrome.i18n.getMessage('validate');
			cancelButton.textContent = chrome.i18n.getMessage('cancel');
			cancelButton.classList.add('cancel-button');
			saveButton.style.display = 'none';
			cancelButton.style.display = 'none';
			editButton.addEventListener('click', () => {
				editTweet(editButton, saveButton, copyButton, cancelButton, tweetFooter);
			});
			appendixContainer.appendChild(editButton);
			appendixContainer.appendChild(cancelButton);
			appendixContainer.appendChild(saveButton);
			contentElement.addEventListener('click', () => {
				editTweet(editButton, saveButton, copyButton, cancelButton, tweetFooter);
			});
		}
        
		// Add character count
        const characterCount = document.createElement('span');
        characterCount.classList.add('char-count');
        
        const containsUrl = containsURL(content);
        if (containsUrl) {
        	const urls = extractURLs(content);
        	let cleanContent = content;
        	urls.forEach(url => {
        		cleanContent = cleanContent.replace(url, '');
        	});
        	cleanContentCharCount = (cleanContent.length += 25);
        	characterCount.textContent = `~${cleanContentCharCount}\/${socialOption.value}`;
        	appendixContainer.appendChild(characterCount);
        } else if (!isImage) {
	        characterCount.textContent = `${content.length}\/${socialOption.value}`;
    	    appendixContainer.appendChild(characterCount);
    	};

        return tweetUnit;
    }
    
    // Function to handle editing a tweet
	function editTweet(editButton, saveButton, copyButton, cancelButton, tweetFooter) {
		console.log('editTweet function triggered');
		const initTools = tweetFooter.querySelectorAll('.init-thread');
		initTools.forEach(initTool => {
			initTool.style.display = 'none';
		});
		copyButton.style.display = 'none';
		const contentElement = tweetFooter.parentNode.querySelector('p');
		let editInst = chrome.i18n.getMessage('editInst');
		const editInstructions = document.createElement('p');
		editInstructions.classList.add('edit-inst');
		editInstructions.textContent = editInst;
		contentElement.before(editInstructions);
		const contentStyle = getComputedStyle(contentElement);
		const originalContent = contentElement.textContent;
		const editZone = document.createElement('textarea');
		editZone.style.height = '200px';
		editZone.style.width = contentStyle.width;
		editZone.style.boxSizing = 'border-box';
		editZone.style.marginBottom = '4px';
		editZone.value = originalContent;
		contentElement.replaceWith(editZone);
		editZone.focus();
		editButton.style.display = 'none';
		saveButton.removeAttribute('style');
		cancelButton.removeAttribute('style');
		let editedContent = editZone.value;
		
		if (editedContent !== null) {
		
			// Update character count
			function updateCharacterCount(tweetContent) {
				const characterCount = editButton.parentNode.querySelector('.char-count');
				if (characterCount) {
					const containsUrl = containsURL(tweetContent);
					if (containsUrl) {
						// Update character count for tweets with URLs
						const urls = extractURLs(tweetContent);
						let cleanContent = tweetContent;
						urls.forEach(url => {
							cleanContent = cleanContent.replace(url, '');
						});
						const cleanContentCharCount = cleanContent.length + 25;
						characterCount.textContent = `~${cleanContentCharCount}/${socialOption.value}`;
						if (cleanContentCharCount > socialOption.value) {
							let newCharCount = '⚠️ ' + characterCount.textContent;
							characterCount.textContent = newCharCount;
							characterCount.style.color = '#cc0000';
							characterCount.style.fontWeight = 'bold';
						} else {
							characterCount.removeAttribute('style');
						}
					} else {
						// Update character count for tweets without URLs
						characterCount.textContent = `${tweetContent.length}/${socialOption.value}`;
						if (tweetContent.length > socialOption.value) {
							let newCharCount = '⚠️ ' + characterCount.textContent;
							characterCount.textContent = newCharCount;
							characterCount.style.color = '#cc0000';
							characterCount.style.fontWeight = 'bold';
						} else {
							characterCount.removeAttribute('style');
						}
					}
				}
			}
			
			editZone.addEventListener('input', () => {
				updateCharacterCount(editZone.value);
			});
			
			// Update tweet content
			function updateTweetContent () {
				editedContent = editZone.value;
				contentElement.textContent = editedContent;
				editZone.blur();
				editZone.replaceWith(contentElement);
				editedTweet = contentElement.textContent;
				cancelButton.style.display = 'none';
				saveButton.style.display = 'none';
				editButton.removeAttribute('style');
				updateCharacterCount(editedContent);
				editInstructions.remove();
				initTools.forEach(initTool => {
					initTool.removeAttribute('style');
				});
				resetCopyButton(copyButton);
			}
			
			window.addEventListener('keydown', doEditOrNot);
			
			function doEditOrNot(event) {
				if (event.key === 'Enter' && !event.shiftKey) {
					event.preventDefault();
					updateTweetContent();
				} else if (event.key === 'Escape') {
					cancelEdit();
				}
			}
			
			cancelButton.addEventListener('click', cancelEdit);
			
			function cancelEdit () {
				editZone.blur();
				window.removeEventListener('keydown', doEditOrNot);
				const cancelDialog = document.getElementById('cancel-dialog');
				const cancelText = document.getElementById('cancel-text');
				cancelText.textContent = chrome.i18n.getMessage('cancelText');
				const noButton = document.getElementById('no-button');
				noButton.textContent = chrome.i18n.getMessage('noText');
				const yesButton = document.getElementById('yes-button');
				yesButton.textContent = chrome.i18n.getMessage('yesText');
				if (editZone.value !== originalContent) {
					cancelDialog.style.display = 'block';
					noButton.onclick = function () {
						cancelCancel();
					}
					cancelDialog.onclick = function (event) {
						if (event.target == cancelDialog) {
							cancelCancel();
						}
					}
					yesButton.onclick = confirmCancel;
					window.addEventListener('keydown', doCancelOrNot);
					function doCancelOrNot(event) {
						if (event.key === 'Enter') {
							confirmCancel();
						} else if (event.key === 'Escape') {
							cancelCancel();
						}
					}
				} else {
					confirmCancel();
				}
				
				function cancelCancel () {
					cancelDialog.style.display = 'none';
					editZone.focus();
					window.removeEventListener('keydown', doCancelOrNot);
					window.addEventListener('keydown', doEditOrNot);
				}
				
				function confirmCancel () {
					console.log('Cancel edit function triggered');
					window.removeEventListener('keydown', doCancelOrNot);
					editZone.blur();
					cancelDialog.style.display = 'none';
					saveButton.style.display = 'none';
					cancelButton.style.display = 'none';
					editButton.removeAttribute('style');
					editInstructions.remove();
					copyButton.style.display = 'inline-block';
					initTools.forEach(initTool => {
						initTool.removeAttribute('style');
					});
					editZone.replaceWith(contentElement);
					updateCharacterCount(originalContent);
				}
			}
			
			saveButton.addEventListener('click', (event) => updateTweetContent());
			
			updateCharacterCount(editedContent);
			
		}
	}
		
	// Function to initiate the thread
	function initiateThread (initButton) {
		const posts = tweetContainer.querySelectorAll('.tweet-frame');
		const firstPost = posts[0];
		const firstPostText = firstPost.querySelector('p').textContent;
		if (socialOption.selectedOptions[0].label === '𝕏 / Twitter') {
			const tweetUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(firstPostText)
			chrome.tabs.create({
				url: tweetUrl
			});
		} else if (socialOption.selectedOptions[0].label === 'Mastodon') {
			modal.style.display = 'block';
			instanceLoader.focus();
			const closeButton = document.getElementById('close');
			closeButton.addEventListener('click', function() {
				modal.style.display = 'none';
				});
			window.onclick = function(event) {
				if (event.target == modal) {
					modal.style.display = 'none';
				};
			};
			window.addEventListener('keydown', (event) => {
				if (event.key === 'Escape') {
					modal.style.display = 'none';
				};
			});
		} else if (socialOption.selectedOptions[0].label === 'Bluesky') {
			const bskyUrl = 'https://bsky.app';
			chrome.tabs.create({
				url: bskyUrl
			});
		} else if (socialOption.selectedOptions[0].label === 'Threads') {
			const threadsUrl = 'https://threads.net';
			chrome.tabs.create({
				url: threadsUrl
			});
		};
	};
	
	function launchMastodon() {
		const posts = tweetContainer.querySelectorAll('.tweet-frame');
		const firstPostText = posts[0].querySelector('p').textContent;
		const mastoInstance = instanceLoader.value;
		let mastoAlert = chrome.i18n.getMessage('mastoAlert');
		if (mastoInstance === '') {
			alert(mastoAlert);
		} else {
			const instUrl = 'https://' + mastoInstance;
			fetch(instUrl)
				.then((response) => {
					if(!response.ok) {
						throw new Error('Mastodon instance ' + instUrl + ' not found');
					};
					console.log('Mastodon instance found: ', instUrl);
					modal.style.display = 'none';
					const mastoUrl = instUrl + '/share?text=' + encodeURIComponent(firstPostText);
					chrome.tabs.create({
						url: mastoUrl
					});
				})
				.catch((error) => {
					alert(mastoAlert);
					console.error('Mastodon instance ' + instUrl + ' not found');
				});
		};
	};


    //Function to create text element
    function createTextElement(text) {
        const tweetText = document.createElement('p');
        tweetText.textContent = text;
        return tweetText;
    }

    // Function to create image element
    function createImageElement(imageSrc) {
        const imgParag = document.createElement('p');
        const imgElement = document.createElement('img');
        imgElement.src = imageSrc;
        imgElement.classList.add('tweet-image');
        imgParag.appendChild(imgElement);
        return imgParag;
    }

	// Function to reset copy button
	function resetCopyButton (copyButton) {
		copyButton.removeAttribute('style');
		copyButton.textContent = chrome.i18n.getMessage('copy');
	}

    //Function to copy text to clipboard
    function copyToClipboard(text, copyButton, tweetUnit, tweetFooter) {
        const textarea = document.createElement('textarea');
        const contentElement = tweetFooter.parentNode.querySelector('p');
        textarea.value = contentElement.textContent;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        copyButton.style.backgroundColor = '#e6ffe6';
        copyButton.style.color = '#006600';
        copyButton.style.borderColor = '#006600';
        copyButton.textContent = chrome.i18n.getMessage('copied');
    }

    // Function to copy image to clipboard
    async function copyImageToClipboard(imageSrc, copyButton) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imageSrc;
        
        const imageDataBlob = await new Promise((resolve, reject) => {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const context = canvas.getContext('2d');
                context.drawImage(img, 0, 0, img.width, img.height);

                canvas.toBlob(blob => {
                	resolve(blob);
                }, 'image/png');
            };

            img.onerror = reject;
        });
        
        try {
        	await navigator.clipboard.write([
        		new ClipboardItem({
        			'image/png': imageDataBlob
        		})
        	]);
        	
        	console.log('Image copied to clipboard');
			copyButton.style.backgroundColor = '#e6ffe6';
			copyButton.style.color = '#006600';
			copyButton.style.borderColor = '#006600';
			copyButton.textContent = chrome.i18n.getMessage('copied');
        } catch (error) {
            console.error('Error copying image to clipboard: ', error);
            copyButton.style.backgroundColor = '#ffe6e6';
            copyButton.style.color = '#e60000';
            copyButton.style.borderColor = '#e60000';
            copyButton.style.height = 'auto';
            copyButton.style.width = 'auto';
            copyButton.style.padding = '4px';
            copyButton.textContent = chrome.i18n.getMessage('copyFail');
        }
    }   
    
    // Function to split text into tweets
    function splitIntoTweets(fullText) {
        const maxTweetLength = socialOption.value;
        const separatorRegex = /([.!?,;:])/;
        const urls = extractURLs(fullText);
        
        let textNoUrls = fullText;
        urls.forEach((url, index) => {
        	if (url.length > 25) {
				const placeholder = `__URL_${index}__`;
				textNoUrls = textNoUrls.replace(url, placeholder);
        	};
        });
        
        const chunks = textNoUrls.split(separatorRegex);          
        let currentTweet = '';
        const tweets = [];

        for (const chunk of chunks) {
			const intChunk = chunk.replace(/__URL_(\d+?)__/, '');
			const intChunkCount = intChunk.length + 25;
			
			const intTweet = currentTweet.replace(/\((http[s]?:\/\/[^\s)]+)\)/, '');
			const intTweetCount = intTweet.length + 25;

			const newChunk = chunk.replace(/__URL_(\d+?)__/, (match, captureGroup) => urls[captureGroup] || '');

			console.log('Chunk: ', newChunk);
    
        	const chunkContainsUrl = containsURL(newChunk);
        	const tweetContainsUrl = containsURL(currentTweet);
        	        	      	
        	if (currentTweet !== '' && currentTweet.length < maxTweetLength && chunk.match(separatorRegex)) {
        		currentTweet += chunk;
        	} else if (currentTweet.length === maxTweetLength && chunk.match(separatorRegex)) {
        		tweets.push(currentTweet.trim());
        		currentTweet = '';
        	} else if (chunkContainsUrl) {
        		if (tweetContainsUrl && intTweetCount + intChunkCount < maxTweetLength) {
        			currentTweet += newChunk;
        		} else if (!tweetContainsUrl && currentTweet.length + intChunkCount < maxTweetLength) {
        			currentTweet += newChunk;
        		} else {
        			tweets.push(currentTweet.trim());
        			currentTweet = newChunk;
        		}
        	} else if (!chunkContainsUrl) {
        		if (tweetContainsUrl && intTweetCount + newChunk.length < maxTweetLength) {
        			currentTweet += newChunk;
        		} else if (!tweetContainsUrl && currentTweet.length + newChunk.length < maxTweetLength) {
        			currentTweet += newChunk;
        		} else {
        			tweets.push(currentTweet.trim());
        			currentTweet = newChunk;
        		}
        	} else {
        		tweets.push(currentTweet.trim());
        		currentTweet = newChunk;
        	}
        }
        
        	
        tweets.push(currentTweet.trim());

        return tweets;
    }
    
    // Helper function to check if a string contains a URL
	function containsURL(str) {
		const urlRegex = /\((http[s]?:\/\/[^\s)]+)\)/;
		return urlRegex.test(str);
	}
    
    // Helper function to extract URLs from text content
	function extractURLs(str) {
		const urlRegex = /\((http[s]?:\/\/[^\s)]+)\)/g;
		return str.match(urlRegex) || [];
	}



});