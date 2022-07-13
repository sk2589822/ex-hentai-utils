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
  window.onload = async () => {
    log('Start')
    await main()
    log('Done')
  }

  async function main() {
    const urls = getUrls()

    if (urls.length === 0) {
      log('Only one page, do nothing')
      return
    }

    if (!isFirstPage()) {
      log('Not first page, do nothing')
      return
    }

    for (let url of urls) {
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
  }

  const isFirstPage = () => document.querySelector('.ptds').innerText === '1'

  function getUrls() {
    const indexes = [...document.querySelectorAll('.ptb td:not(.ptds)')]
    indexes.pop()
    indexes.shift()

    return indexes.map(elem => elem.children[0].href)
  }

  async function getDoc(url) {
    const response = await fetch(url)
    const html = await response.text()
    return new DOMParser().parseFromString(html, 'text/html');
  }

  function getImageElements(doc) {
    return doc.querySelectorAll('.gdtl')
  }

  function appendImages(elems) {
    document
      .querySelector('#gdt > .c')
      .before(...elems)
  }

  function delay(ms) {
    log(`wait for ${ms}ms`)
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  function log(message, error) {
    const icon = ['%c Fetch All Images ', 'background: #777; border-radius: 5px']
    
    if (error) {
      console.error(...icon, message, error)
    } else {
      console.log(...icon, message)
    }
  }
})()
