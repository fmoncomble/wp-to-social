document.addEventListener("DOMContentLoaded", async function() {
    // Get tab URL elements
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const blogUrl = urlParams.get("data");
    console.log('Blog URL: ', blogUrl);

    // Social network option
    const socialOption = document.getElementById("socialOption");

    // Function to extract blog post
    async function extractPost() {
        try {
            const parser = new DOMParser();
            const response = await fetch(blogUrl);

            if (!response.ok) {
                throw new Error("Failed to fetch page");
            }

            const html = await response.text();
            const page = parser.parseFromString(html, 'text/html');
            const post = page.querySelector('.post-content-inner');
            const text = post.innerText;

            // Call the function to split into tweets
            const tweets = splitIntoTweets(text);

            // Log or do something with the tweets
            console.log('Tweets: ', tweets);

            // Create and append tweetContainer
            const tweetContainer = document.createElement('div');
            tweets.forEach(tweet => {
                const tweetUnit = document.createElement('div');
                tweetUnit.classList.add('tweet-frame')
                const tweetText = document.createElement('p');
                tweetText.textContent = tweet;
                tweetUnit.appendChild(tweetText);
                
                const copyButton = document.createElement('button');
                copyButton.textContent = 'Copier';
                copyButton.addEventListener('click', () => {
                	copyToClipboard(tweet, copyButton)
                });
                tweetUnit.appendChild(copyButton);
                
                tweetContainer.appendChild(tweetUnit);
            });

            const body = document.getElementById("content");
            body.innerHTML = '';
            body.appendChild(tweetContainer);

        } catch (error) {
            console.error(error);
        }
    };
    
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
    	copyButton.textContent = 'Copié !';
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

    const createButton = document.getElementById("createButton");
    createButton.addEventListener('click', extractPost);
});
