document.addEventListener("DOMContentLoaded", async function() {

    // Get interface elements
    const tweetContainer = document.getElementById('content');    
    const createButton = document.getElementById("createButton");
    createButton.addEventListener('click', extractPost);
    const retrieveMessage = document.getElementById('retrieveMessage');
    const errorMessage = document.getElementById('errorMessage');
    const spinner = document.getElementById('loading-spinner');

    // Get post URL
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const postUrl = urlParams.get("data");
    console.log('Post URL: ', postUrl);

    // Get REST API link
    async function getApiLink() {
        try {
            retrieveMessage.style.display = 'block';
            spinner.style.display = 'block';
            const parser = new DOMParser();
            const response = await fetch(postUrl);
            if (!response.ok) {
                errorMessage.style.display = 'block';
                errorMessage.textContent = 'Site non accessible';
                throw new Error('Failed to fetch post');
            }
            const html = await response.text();
            const page = parser.parseFromString(html, 'text/html');
            const head = page.querySelector('head');
            const link = head.querySelector('link[rel="alternate"][type="application/json"]');
            if (link) {
                // Self-hosted blog method
                const apiLink = link.getAttribute('href');
                retrieveMessage.style.display = 'none';
                spinner.style.display = 'none';
                createButton.style.display = 'block';
                return apiLink;
            } else {
                // Wordpress.com method				
                // Get blog domain name and post slug
                const urlObject = new URL(postUrl);
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
                    spinner.style.display = 'none';
                    retrieveMessage.style.display = 'none';
                    errorMessage.style.display = 'block';
                    errorMessage.textContent = 'Site non pris en charge';
                    throw new Error('Not a Wordpress site');
                }
                retrieveMessage.style.display = 'none';
                spinner.style.display = 'none';
                createButton.style.display = 'block';
                return apiLink;
            }
        } catch (error) {
            console.error('Failed to fetch API link \/ Not a Wordpress site');
            spinner.style.display = 'none';
            retrieveMessage.style.display = 'none';
            errorMessage.style.display = 'block';
            errorMessage.textContent = 'Site non pris en charge';
            return null;
        }
    }

    // Pass REST API link
    const apiLink = await getApiLink();
    console.log('Post API link: ', apiLink);

    // Get social network option
    const socialOption = document.getElementById("socialOption");

    // Function to extract blog post
    async function extractPost() {
        try {
            spinner.style.display = 'block';

            let postContent;

            const response = await fetch(apiLink);
            const postData = await response.json();
            intPostContent = postData.content.rendered;
            if (intPostContent) {
                postContent = intPostContent;
            } else if (!intPostContent) {
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
            const lastTweetText = `Un billet à retrouver ici :
${postUrl}`;
            const lastTweet = createTweetUnit(lastTweetText);
            tweetContainer.appendChild(lastTweet);

            // Hide loading spinner after extraction
            spinner.style.display = 'none';
            
            // Count generated tweets
            const tweetUnits = tweetContainer.querySelectorAll('.tweet-frame');
            console.log('Number of posts generated: ', tweetUnits.length);
            const tweetCount = tweetUnits.length;
            const tweetCounter = document.getElementById('post-count');
            tweetCounter.style.display = 'block';
            tweetCounter.textContent = `${tweetCount} posts créés`;

        } catch (error) {
            console.error(error);
            const spinner = document.getElementById('loading-spinner');
            spinner.style.display = 'none';
            createButton.style.display = 'block';
            errorMessage.style.display = 'block';
            errorMessage.textContent = 'Échec de l\'extraction';
        }
    };


    // Function to create a tweet unit (text or image)
    function createTweetUnit(content, isImage = false) {
        const tweetUnit = document.createElement('div');
        tweetUnit.classList.add('tweet-frame');

        const contentElement = isImage ? createImageElement(content) : createTextElement(content);
        tweetUnit.appendChild(contentElement);
		
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
		
		// Add copy button
        const copyButton = document.createElement('button');
        copyButton.classList.add('copy-button');
        copyButton.textContent = 'Copier';
        copyButton.addEventListener('click', () => {
            copyToClipboard(content, copyButton)
        });
        tweetUnit.appendChild(copyButton);

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
        copyButton.textContent = 'Copié !';
    }

    // Function to copy image to clipboard
    async function copyImageToClipboard(imageSrc, copyButton) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imageSrc;

        const imageDataArrayBuffer = await new Promise((resolve, reject) => {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const context = canvas.getContext('2d');
                context.drawImage(img, 0, 0, img.width, img.height);

                // Get the image data as ArrayBuffer
                canvas.toBlob(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve(reader.result);
                    };
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(blob);
                }, 'image/png');
            };

            img.onerror = reject;
        });

        try {
            // Use clipboard.setImageData() to copy the image
            await browser.clipboard.setImageData(imageDataArrayBuffer, 'png');
            console.log('Image copied to clipboard!');
        } catch (error) {
            console.error('Error copying image to clipboard: ', error);
            copyButton.style.backgroundColor = '#ffe6e6';
            copyButton.style.color = '#e60000';
            copyButton.style.borderColor = '#e60000';
            copyButton.style.height = 'auto';
            copyButton.style.width = 'auto';
            copyButton.style.padding = '4px';
            copyButton.textContent = 'Échec de la copie. Faites un clic droit sur l\'image et choisissez "Copier l\'image"';
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