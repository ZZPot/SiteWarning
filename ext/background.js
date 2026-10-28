const LIST_URL = "https://example.com/blocked-sites.txt";

// Интервал обновления списка (в минутах)
const UPDATE_INTERVAL_MINUTES = 60;

// Хранилище списка в памяти
let siteList = {};
let lastUpdate = 0;
let localList = true;
let tags = await (await fetch(browser.runtime.getURL("./tags.json"))).json();
console.log(tags)

async function loadList() {
  if (localList)
  {
    siteList =  await (await fetch(browser.runtime.getURL("./site_list.json"))).json()
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
    console.log(siteList)
    const hostname = new URL(url).hostname.toLowerCase();
    console.log("Check " + hostname)
    let siteKey = Object.keys(siteList).find(siteName => 
    {
      console.log(siteName)
      if (!siteName.includes("://"))
      {
        console.log("Comparing " + siteName + " and " + hostname)
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


function onSiteFound(url, siteData)
{
  if (siteData["level"] == "warning")
    notify(url, siteData)
}
function notify(url, siteData) {
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
}

// Основная проверка вкладки
async function checkTab(tabId, url) {
  if (!url || url.startsWith("about:") || url.startsWith("moz-extension:")) return;
  
  // Обновляем список, если прошло достаточно времени
  if (Date.now() - lastUpdate > UPDATE_INTERVAL_MINUTES * 60 * 1000) {
    await loadList();
  }
  let siteData = getSite(url)
  if (siteData) {
    onSiteFound(url, siteData);
  }
}

browser.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await browser.tabs.get(activeInfo.tabId);
    if (tab.url) checkTab(tab.id, tab.url);
  } catch (e) {
    // Вкладка могла быть закрыта
  }
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    checkTab(tabId, tab.url);
  }
});


loadList();