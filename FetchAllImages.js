// ==UserScript==
// @name        Fetch All Images - exhentai.org
// @namespace   Violentmonkey Scripts
// @match       https://exhentai.org/g/*
// @grant       none
// @version     1.1
// @author      -
// @description 2022/6/26 下午1:21:59
// ==/UserScript==
(() => {
  window.onload = () => {
    injectCss()
    preloadTorrentLinks()
    fetchAllImages()
  }

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

  async function preloadTorrentLinks() {
    const log = logTemplate.bind(this, 'preload Torrent Links')
    log('Start')

    const linkContainer = document.querySelector('#gd5 > p:nth-child(3)')
    const linkElement = linkContainer.querySelector('a')

    if (!hasTorrents(linkElement)) {
      log('No torrents')
      return
    }

    const link = getLink(linkElement)
    const torrentsDiv = await getTorrentsDiv(link)
    linkContainer.append(torrentsDiv)
    setToggleEvent(linkElement, torrentsDiv)

    log('End')

    function hasTorrents(linkElement) {
      return linkElement.innerText !== 'Torrent Download (0)'
    }

    function getLink(linkElement) {
      return linkElement
      .getAttribute('onclick')
      .match(/(https:\/\/exhentai\.org\/gallerytorrents\.php\?gid=\d+&t=\S+)',\d+,\d+/)[1]
    }

    async function getTorrentsDiv() {
      const doc = await getDoc(link)
      const torrentsDiv = doc.querySelector('#torrentinfo form > div')
      torrentsDiv.removeAttribute('style')
      torrentsDiv.classList.add('torrents')
      return torrentsDiv
    }

    function setToggleEvent(linkElement, torrentsDiv) {
      linkElement.removeAttribute('onclick')
      linkElement.addEventListener('click', (e) => {
        e.preventDefault()

        const showClass = 'torrents--show'
        if (torrentsDiv.classList.contains(showClass)) {
          torrentsDiv.classList.remove(showClass)
        } else {
          torrentsDiv.classList.add(showClass)
        }
      })
    }
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async function getDoc(url) {
    const response = await fetch(url)
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
      .torrents {
        position: absolute;
        right: -25%;
        padding: 20px;
        border-radius: 20px;
        border: white solid 3px;
        background-color: #34353b;
        opacity: 0;
        transition: opacity 0.3s;
      }

      .torrents--show {
        opacity: 1;
      }
    `;

    document.querySelector('head').append(style);
  }
})()
