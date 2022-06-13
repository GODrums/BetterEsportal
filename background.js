/*
permissions needed:
 - storage: required to use storage for icons, etc
 - activeTab: required to gain access to modify the current page
 - scripting: for using the executeScript function
*/

let color = '#3aa757';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ color });
  console.log('Default background color set to %cgreen', `color: ${color}`);
});


const getCurrentTab = async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}
chrome.tabs.onUpdated.addListener(
    (tabId, changeInfo, tab) => {
        // Read changeInfo data and send urls to content.js
        if (changeInfo.url && changeInfo.url.includes("esportal")) {
            /*
            chrome.runtime.sendMessage(myExtId, { whatever you want to send goes here  },
            response => { handle the response from background here }
            );
            */
            if(changeInfo.url.includes("profile")) {
              chrome.tabs.sendMessage(tabId, {
                  message: 'profile',
                  url: changeInfo.url
              }, response => {
                console.log("Success for "+changeInfo.url);
              });
            } else if (changeInfo.url.includes("match")) {
              chrome.tabs.sendMessage(tabId, {
                  message: 'lobby',
                  url: changeInfo.url
              }, response => {
                console.log("Success for "+changeInfo.url);
              });
            }
        }
    }
);

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        getCurrentTab().then((tab) => {
            if (tab && tab.url) {
                if (tab.url.includes("profile")) {
                    //sendFaceitLevel(tabId, tab.url);
                }
            }
        });
    }
});

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    console.log(message);
    if (request.message === 'profile') {
      //getFaceitLevels(request).then(sendResponse);
    }
    sendResponse("test");
    return true;
  }
);
