console.log("LeaveFlow background script running");

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});
