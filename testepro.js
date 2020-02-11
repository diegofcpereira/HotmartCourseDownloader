chrome.tabs.create({ url: nextVideo }, function (callback) {
    nextTab = callback.id;
    chrome.tabs.update(currentTab, { active: true });
    
});