// ==UserScript==
// @name        Fetch All Images - exhentai.org
// @namespace   Violentmonkey Scripts
// @match       https://exhentai.org/g/*
// @grant       none
// @version     1.0
// @author      -
// @description 2022/6/26 下午1:21:59
// ==/UserScript==
(() => {
  window.onload = () => {
    
    preloadLinks()
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
  
})()
