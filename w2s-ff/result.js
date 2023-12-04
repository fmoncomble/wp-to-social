document.addEventListener("DOMContentLoaded", async function() {
    
    const createButton = document.getElementById("createButton");
    createButton.style.display = 'none';
    createButton.addEventListener('click', extractPost);
    
    const retrieveMessage = document.getElementById('retrieveMessage');
    const spinner = document.getElementById('loading-spinner');
    
    // Get tab URL elements
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const postUrl = urlParams.get("data");
    console.log('Post URL: ', postUrl);
    
    // Get blog domain name
    const urlObject = new URL(postUrl);
    const blogDomain = urlObject.hostname;
    console.log('Blog domain = ', blogDomain);
    
    // Get post slug
    const path = urlObject.pathname;
    console.log('Path: ', path);
    const cleanPath = path.replace(/\/$/, '');
    const pathSegments = cleanPath.split('/');
    console.log('Path segments ', pathSegments);
    const postSlug = pathSegments.pop();
    console.log('Post slug: ', postSlug);
    
    // Get WP post ID
    async function getPostId() {
    	try {
    		retrieveMessage.style.display = 'block';
    		spinner.style.display = 'block';
    		const response = await fetch(`https://${blogDomain}/wp-json/wp/v2/posts?slug=${postSlug}`);
    		if (response.ok) {
				const data = await response.json();
				if (data.length > 0) {
					const postId = data[0].id;
					console.log('Self-hosted post ID : ', postId);
    				retrieveMessage.style.display = 'none';
					spinner.style.display = 'none';
					createButton.style.display = 'block';
					return postId;
				} else {
					console.log('Self-hosted post ID not found.');
				}
    		} else {
    			console.error('Error fetching self-hosted postID. Bypassing.');
    			retrieveMessage.style.display = 'none';
				spinner.style.display = 'none';
				createButton.style.display = 'block';
    		}
			
			return null;
			
    	} catch (error) {
    		console.error('Error fetching post ID: ', error);
    		retrieveMessage.style.display = 'none';
            spinner.style.display = 'none';
            createButton.style.display = 'block';
            createButton.style.backgroundColor = '#ffe6e6';
            createButton.style.color = '#e60000';
            createButton.style.borderColor = '#e60000';
            createButton.textContent = 'Échec';
    		return null;
    	}
    }
    
    const postId = await getPostId();
    console.log('Post ID : ', postId);

    // Social network option
    const socialOption = document.getElementById("socialOption");

    // Function to extract blog post
    async function extractPost() {
        try {
        	// Show loading spinner
        	spinner.style.display = 'block';
        	
        	let postContent;

			const response = await fetch(`https://${blogDomain}/wp-json/wp/v2/posts/${postId}`);			
			if (response.ok) {
				const postData = await response.json();
				postContent = postData.content.rendered;
				console.log('Post content: ', postContent);
			} else {
				console.error('Failed to fetch self-hosted post content. Trying for Wordpress.com.');
						
				const response2 = await fetch(`https://public-api.wordpress.com/rest/v1.1/sites/${blogDomain}/posts/slug:${postSlug}`);
				if (response2.ok) {
					const postData2 = await response2.json();
					postContent = postData2.content;
					console.log('Post content: ', postContent);
				} else {
					console.error('Failed to fetch Wordpress.com post content.');
				}
			}
/* 
			const postData = await response.json();
			const postContent = postData.content.rendered;
			console.log('Post content: ', postContent);
 */
			
			const tempContainer = document.createElement('div');
			tempContainer.innerHTML = postContent;
			
			const nodes = tempContainer.querySelectorAll('p, img');
            if (nodes.length > 0) {
                console.log('Nodes found: ', nodes);
            } else {
                console.error('No nodes found.');
            };
			
            const tweetContainer = document.getElementById('content');
            tweetContainer.innerHTML = '';

            // Extract content depending on node type
            Array.from(nodes).forEach(node => {
                if (node.textContent) {
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

        } catch (error) {
            console.error(error);
            const spinner = document.getElementById('loading-spinner');
            spinner.style.display = 'none';
            createButton.style.display = 'block';
            createButton.style.backgroundColor = '#ffe6e6';
            createButton.style.color = '#e60000';
            createButton.style.borderColor = '#e60000';
            createButton.textContent = 'Échec';
            
        }
    };


    // Function to create a tweet unit (text or image)
    function createTweetUnit(content, isImage = false) {
        const tweetUnit = document.createElement('div');
        tweetUnit.classList.add('tweet-frame');

        const contentElement = isImage ? createImageElement(content) : createTextElement(content);
        tweetUnit.appendChild(contentElement);

        const characterCount = document.createElement('span');
        characterCount.classList.add('char-count');
        characterCount.textContent = `${content.length}\/${socialOption.value}`;
        tweetUnit.appendChild(characterCount);

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
        const sentences = fullText.split(separatorRegex);
        let currentTweet = '';
        const tweets = [];

        for (const sentence of sentences) {
            if (sentence.match(separatorRegex)) {
                currentTweet += sentence;
            } else if ((currentTweet + sentence).length <= maxTweetLength) {
                currentTweet += sentence;
            } else {
                tweets.push(currentTweet.trim());
                currentTweet = sentence;
            }
        }

        tweets.push(currentTweet.trim());

        return tweets;
    }

});