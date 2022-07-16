// ==UserScript==
// @name        Gallery Enhencer - exhentai.org
// @namespace   Violentmonkey Scripts
// @match       https://exhentai.org/g/*
// @grant       none
// @version     1.0.5
// @author      -
// @description 2022/6/26 下午1:21:59
// ==/UserScript==
(() => {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    main()
  } else {
    document.addEventListener("DOMContentLoaded", main)
  }
  
  function main() {
    injectCss()
    preloadLinks()
    fetchAllImages()
  }

  /**
   * 若 gallery 的頁數超過1頁，在第1頁時，會依序載入後面的頁面 (間隔3秒)
   */
  async function fetchAllImages() {
    const log = logTemplate.bind(this, 'Fetch All Images')

    log('Start')
    const pageUrls = getPageUrls()

    if (pageUrls.length === 0) {
      log('Only one page, do nothing')
      return
    }

    if (!isFirstPage()) {
      log('Not first page, do nothing')
      return
    }

    for (const url of pageUrls) {
      try {
        await delay(3000)

        log(`fetching ${url}`)
        const doc = await getDoc(url)
        const imageElements = getImageElements(doc)
        appendImages(imageElements)
      } catch (e) {
        log(`fetch ${url} failed`, e)
      }
    }

    log('Done')
  
    function isFirstPage() {
      return document.querySelector('.ptds').innerText === '1'
    }

    function getImageElements(doc) {
      return doc.querySelectorAll('.gdtl')
    }
  
    function getPageUrls() {
      const indexes = [...document.querySelectorAll('.ptb td:not(.ptds)')]
      indexes.pop()
      indexes.shift()
  
      return indexes.map(elem => elem.children[0].href)
    }
  
    function appendImages(elems) {
      document
        .querySelector('#gdt > .c')
        .before(...elems)
    }
  }

  /**
   * 預先載入 Torrent 和 Archive 視窗
   * 
   * 同時把原先的 window.open() popup 改為在同一個頁面內的 popup
   */
  async function preloadLinks() {
    const configList = [
      {
        feature: 'Preload Torrent Links',
        linkSelector: '#gd5 > p:nth-child(3)',
        contentSelector: '#torrentinfo form > div'
      },
      {
        feature: 'Preload Archive Links',
        linkSelector: '#gd5 > p:nth-child(2)',
        contentSelector: '#db'
      }
    ]

    const preloadPromises = configList.map(config => preloadLink(config))
    await Promise.all(preloadPromises)
    setHentaiAtHomeEvent()
    setArchiveEvent()

    async function preloadLink(config) {
      const { feature, linkSelector, contentSelector } = config
      const log = logTemplate.bind(this, feature)
      log('Start')
  
      const [linkContainer, linkElement] = getlinkElements(linkSelector)
  
      const link = getLink(linkElement)
      const doc = await getDoc(link)
      const torrentsDiv = await getMainContent(doc, contentSelector)
      linkContainer.append(torrentsDiv)
      setToggleEvent(linkElement, torrentsDiv)
  
      log('End')
    }

    function getlinkElements(selector) {
      const container = document.querySelector(selector)
      const element = container.querySelector('a')
  
      return [container, element]
    }
  
    function getLink(linkElement) {
      return linkElement
      .getAttribute('onclick')
      .match(/(https:\/\/\S+)',\d+,\d+/)[1]
    }

    async function getMainContent(doc, selector) {
      const content = doc.querySelector(selector)
      content.removeAttribute('style')
      content.classList.add('popup')
      return content
    }
  
    function setToggleEvent(linkElement, popup) {
      linkElement.removeAttribute('onclick')
      linkElement.addEventListener('click', (e) => {
        e.preventDefault()

        const showClass = 'popup--show'
        if (popup.classList.contains(showClass)) {
          popup.classList.remove(showClass)
        } else {
          popup.classList.add(showClass)
        }
      })
    }

    /**
     * 重新實作 Hentai@Home 的下載事件
     * 
     * 原本會開一個新的頁面，裡面有 submit form 的 function
     * 因為改用 preload 就沒辦法呼叫該 function，所以這邊要補實作
     */
    function setHentaiAtHomeEvent() {
      const log = logTemplate.bind(this, 'Hentai At Home Event')
      const toastContainer = appendToastContainerToBody()

      const hentaiAtHomeLinks = document.querySelectorAll('#db table td a')

      for (link of hentaiAtHomeLinks) {
        const postUrl = document.querySelector('#hathdl_form').getAttribute('action')
        const resolution = link.getAttribute('onclick').split("'")[1]
        link.removeAttribute('onclick')

        link.addEventListener('click', async () => {
          const formData = new FormData()
          formData.append('hathdl_xres', resolution)
          const doc = await getDoc(postUrl, {
            method: 'POST',
            body: formData
          })

          const response = doc.querySelector('#db').innerHTML
          log(response)
          const toast = createToastElement(response)
          toastContainer.append(toast)
        })
      }

      function appendToastContainerToBody() {
        const body = document.querySelector('body')
        const container = document.createElement('div')
        container.classList.add('toast-container')

        body.append(container)

        return container
      }

      function createToastElement(response, toastContainer) {
        const toast = document.createElement('div')
        toast.innerHTML = response

        toast.classList.add('toast')
        toast.addEventListener('animationend', function () {
          this.remove()
        })

        return toast
      }
    }

    /**
     * 點擊 Archive 的下載按鈕時，將原本的下載視窗彈出
     * 
     * 會做成彈窗是因為 Archive 的連結最後會連到不同 domain 的 url，會被 same orgin 擋。
     */
    function setArchiveEvent() {
      const archiveDownloadButtons = document.querySelectorAll('form input[name="dlcheck"]')
      for (const button of archiveDownloadButtons) {
        button.addEventListener('click', e => {
          e.preventDefault()
          const buttonValue = button.getAttribute('value')
          const form = button.parentElement.parentElement
          const url = form.getAttribute('action')

          const popupWindow = openWindow(url)
          popupWindow.addEventListener('load', () => {
            popupWindow.document.querySelector(`input[value="${buttonValue}"]`).click()
          })
        })
      }

      function openWindow(url) {
        const width = 600
        const height = 300
        const left = (screen.width - 600) / 2
        const top = (screen.height - 300) / 2
        const target = `_archive+${String(Math.random()).split('.')[1]}`

        return window.open(url, target,`width=${width},height=${height},top=${top},left=${left}`)
      }
    }
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async function getDoc(url, options) {
    const response = await fetch(url, options)
    const html = await response.text()
    return new DOMParser().parseFromString(html, 'text/html');
  }

  function logTemplate(featrue, message, error) {
    const icon = [`%c ${featrue} `, 'background: #777; border-radius: 5px']
    
    if (error) {
      console.error(...icon, message, error)
    } else {
      console.log(...icon, message)
    }
  }

  function injectCss() {
    const style = document.createElement('style');
    style.textContent = `
      .popup {
        position: absolute;
        top: -99999px;
        right: 0;
        padding: 20px;
        border-radius: 20px;
        border: white solid 3px;
        background-color: #34353b;
        text-align: center;
        opacity: 0;
        transition: opacity 0.3s;
      }

      .popup--show {
        top: initial;
        opacity: 1;
      }

      .popup a {
        text-decoration: underline;
      }

      .toast-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 100;
      }

      .toast {
        padding: 10px;
        background-color: gray;
        font-size: 16px;
        z-index: 100;
        opacity: 0;
        animation: show-toast 5s linear;
      }

      .toast h1 {
        margin: 0;
      }

      @keyframes show-toast {
        0% {
          top: 12px;
          opacity: 0;
        }

        10% {
          top: 10px;
          opacity: 1;
        }

        80% {
          opacity: 1;
        }

        100% {
          opacity: 0;
        }
      }
    `;

    document.querySelector('head').append(style);
  }
})()

// 原生 Archive function
function do_hathdl(xres) {
	document.getElementById("hathdl_xres").value = xres;
	document.getElementById("hathdl_form").submit();
	return false;
}
