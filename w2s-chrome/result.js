document.addEventListener("DOMContentLoaded", async function() {

    // Get interface elements
    const tweetContainer = document.getElementById('content');    
    const createButton = document.getElementById("createButton");
    createButton.textContent = chrome.i18n.getMessage("createThread");
    createButton.addEventListener('click', extractPost);
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = chrome.i18n.getMessage('errorMessage');
    const spinner = document.getElementById('loading-spinner');

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
    
			// Initiate thread
			const ouText = document.createElement('span');
			ouText.classList.add('init-thread');
			ouText.textContent = chrome.i18n.getMessage('or');
			
			const copyButton = document.getElementsByClassName('copy-button')[0];
			
			const initButton = document.createElement('button');
			initButton.classList.add('init-thread');
			
			if (socialOption.value === '280') {
				initButton.textContent = chrome.i18n.getMessage('initX');
				initButton.classList.add('init-x');
				copyButton.before(ouText);
				ouText.before(initButton);
			} else if (socialOption.value === '500') {
				initButton.textContent = chrome.i18n.getMessage('initMasto');
				initButton.classList.add('init-masto');
				copyButton.before(ouText);
				ouText.before(initButton);
			} else if (socialOption.value === '300') {
				initButton.textContent = chrome.i18n.getMessage('initBsky');
				initButton.classList.add('init-bsky');
				ouText.textContent = chrome.i18n.getMessage('and');
				copyButton.after(ouText);
				ouText.after(initButton);
			};

			const posts = tweetContainer.querySelectorAll('.tweet-frame');
			const firstPost = posts[0];
			const firstPostText = firstPost.querySelector('p').textContent;

			initButton.addEventListener('click', () => {
				if (socialOption.value === '280') {
					const tweetUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(firstPostText)
					chrome.tabs.create({
						url: tweetUrl
					});
				} else if (socialOption.value === '500') {
					const modal = document.getElementById('modal');
					modal.style.display = 'block';
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
					function launchMastodon() {
						const mastoInstance = instanceLoader.value;
						let mastoAlert = chrome.i18n.getMessage('mastoAlert');
						if (mastoInstance === '') {
							alert(mastoAlert);
						} else {
							const instUrl = 'https://' + mastoInstance
							fetch(instUrl)
								.then((response) => {
									if(!response.ok) {
										throw new Error('Mastodon instance ' + instUrl + ' not found');
									};
									console.log('Mastodon instance found: ', instUrl);
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
				} else if (socialOption.value === '300') {
					const bskyUrl = 'https://bsky.app';
					chrome.tabs.create({
						url: bskyUrl
					});
				};
			}); 


            // Hide loading spinner after extraction
            spinner.style.display = 'none';
            
            // Count generated tweets
            const tweetUnits = tweetContainer.querySelectorAll('.tweet-frame');
            console.log('Number of posts generated: ', tweetUnits.length);
            const tweetCount = tweetUnits.length;
            const tweetCounter = document.getElementById('post-count');
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
				
		// Add copy button
        const copyButton = document.createElement('button');
        copyButton.classList.add('copy-button');
        copyButton.textContent = chrome.i18n.getMessage('copy');
        copyButton.addEventListener('click', () => {
            copyToClipboard(content, copyButton)
        });
        tweetUnit.appendChild(copyButton);
        
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
        	tweetUnit.appendChild(characterCount);
        } else if (!isImage) {
	        characterCount.textContent = `${content.length}\/${socialOption.value}`;
    	    tweetUnit.appendChild(characterCount);
    	};

        return tweetUnit;
    }

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

    //Function to copy text to clipboard
    function copyToClipboard(text, copyButton) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
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