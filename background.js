// Define some constants for the API endpoints
const API_LOGIN = "https://api.gptcase.show/connect/google";
const API_CONVERSATIONS = "https://api.gptcase.show/conversations";

// Add a listener for when a message is received from the content script
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // Check if the request has a chatData property
  if (request.messages && request.title && request.model) {
    chrome.storage.sync
      .get(["gptcase-jwt"])
      .then(({ "gptcase-jwt": token }) => {
        // Send a POST request to the conversations endpoint with the chat data and the token as headers
        fetch(API_CONVERSATIONS, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({
            data: request,
          }),
        })
          .then(function (response) {
            // Check if the response is ok
            if (response.ok) {
              response.json().then((res) => {
                const conversationId = res.data.id;
                chrome.tabs.create({
                  url: `https://gptcase.show/c/${conversationId}`,
                });
              });

              return true;
            } else if (response.status == 403 || response.status == 401) {
              startLogin();
              return "Unauthorized";
            } else {
              return false;
            }
          })
          .then(function (data) {
            // Send a response to the content script with the url of the shared web page
            sendResponse(data);
          })
          .catch(function (error) {
            // Log or handle any errors that occurred during sharing
            console.error(error);
            sendResponse(false);
          });
      });

    return true;
  }
});

chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    // login jwt
    if (request.jwt) {
      chrome.storage.sync.set({ "gptcase-jwt": request.jwt }).then(() => {
        console.log("GPTCase Login");
      });
    }
  }
);

function startLogin() {
  chrome.tabs.create({ url: API_LOGIN });
}
