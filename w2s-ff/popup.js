document.addEventListener("DOMContentLoaded", function() {
  browser.runtime.sendMessage({
    action: 'generateUrl'
  }, function(response) {
    if (browser.runtime.lastError) {
      console.error(browser.runtime.lastError);
      return;
    }

    if (response && response.url) {
      const url = response.url;
      console.log('URL:', url);

      const extractButton = document.getElementById("extractButton");
      extractButton.addEventListener("click", function() {
        if (!url) {
          console.error('URL not defined');
          return;
        } else {
          const blogPostUrl = browser.runtime.getURL("result.html") + "?data=" + encodeURIComponent(url);
          browser.tabs.create({
            url: blogPostUrl
          });
        }
      });

    } else {
      console.error('Response is undefined or missing URL');
    };

  });
});
