const LIST_URL = "https://example.com/blocked-sites.txt";
import {tags} from "./tags.json"
import {sites} from "./site_list.json"
// Интервал обновления списка (в минутах)
const UPDATE_INTERVAL_MINUTES = 60;

// Хранилище списка в памяти
let siteList = {};
let lastUpdate = 0;
let localList = true;

async function loadList() {
  if (localList)
    siteList = sites
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
    
    let siteKey = Object.entries(siteList).find(siteName => 
    {
      if (!siteName.includes("://"))
        return hostname === entry || hostname.endsWith("." + entry);
      return url.toLowerCase().startsWith(entry);
    });
    if (siteKey === undefined)
      return null;
    let siteData = siteList[siteKey]
    if ("alias" in siteData)
      return siteList[siteData["alias"]]
    else
      return siteData
  } catch {
    return null;
  }
}

// Показ уведомления
function notify(url, siteData) {
  let msg = ""
  if (tags in siteData && siteData["tags"].length != 0)
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
    notify(url, siteData);
  }
}

// Слушаем переключение вкладок
browser.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await browser.tabs.get(activeInfo.tabId);
    if (tab.url) checkTab(tab.id, tab.url);
  } catch (e) {
    // Вкладка могла быть закрыта
  }
});

// Слушаем обновление страницы (навигация)
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    checkTab(tabId, tab.url);
  }
});

// Загружаем список при старте
loadList();