const LIST_URL = "https://example.com/blocked-sites.txt";

// Интервал обновления списка (в минутах)
const UPDATE_INTERVAL_MINUTES = 60;

// Хранилище списка в памяти
let siteList = {};
let lastUpdate = 0;
let localList = true;
let tags = {}


async function loadList() {
  tags = await (await fetch(browser.runtime.getURL("./tags.json"))).json();
  if (localList)
  {
    siteList = await (await fetch(browser.runtime.getURL("./site_list.json"))).json();
    console.log("Local site list")
  }
  else
    try {
      const response = await fetch(LIST_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      siteList = await response.json();
      lastUpdate = Date.now();
      console.log(`Список загружен: ${Object.keys(siteList).length} записей`);
    } catch (err) {
      console.error("Ошибка загрузки списка:", err);
    }
}

function getSite(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    let siteKey = Object.keys(siteList).find(siteName => 
    {
      if (!siteName.includes("://"))
      {
        return hostname === siteName || hostname.endsWith("." + siteName);
      }
      return url.toLowerCase().startsWith(siteName);
    });
    if (siteKey === undefined)
    {
      console.log("Сайт не в списке")
      return null;
    }
    let siteData = siteList[siteKey]
    if ("alias" in siteData)
      return siteList[siteData["alias"]]
    else
      return siteData
  } catch (err){
    console.error("Error" + err)
    return null;
  }
}

async function onSiteFound(url, siteData, tabId)
{
  if (siteData["tags"].some(tag => (tag in tags && tags[tag]["level"] == "warning")))
    await notify(url, siteData, tabId)
}
async function notify(url, siteData, tabId) {
  let msg = ""
  if ("tags" in siteData && siteData["tags"].length != 0)
  {
    msg += siteData["tags"].join(', ')
  }
  browser.notifications.create({
    type: "basic",
    iconUrl: browser.runtime.getURL("icon.png"),
    title: "⚠️ Сайт из списка",
    message: msg
  });
  try{
    await browser.scripting.executeScript({target: {tabId: tabId}, files: ["content.js"]})
    console.log("Frame added")
  }
  catch (err)
  {
    console.error(err)
  }
}


async function checkTab(tabId, url) {
  if (!url || url.startsWith("about:") || url.startsWith("moz-extension:")) return;
  

  if (Date.now() - lastUpdate > UPDATE_INTERVAL_MINUTES * 60 * 1000) {
    await loadList();
  }
  let siteData = getSite(url)
  if (siteData) {
    await onSiteFound(url, siteData, tabId);
  }
}

browser.tabs.onActivated.addListener(async (activeInfo) => {
  if (activeInfo.previousTabId)
    return
  try {
    const tab = await browser.tabs.get(activeInfo.tabId);
    //if (tab.url) checkTab(tab.id, tab.url);
  } catch (e) {

  }
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    checkTab(tabId, tab.url);
  }
});


loadList();