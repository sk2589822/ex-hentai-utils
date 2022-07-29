// ==UserScript==
// @name        Multipage Viewer Enhencer - exhentai.org
// @namespace   Violentmonkey Scripts
// @match       https://exhentai.org/mpv/*/*/
// @grant       none
// @version     1.0.16
// @author      -
// @description 2021/12/17 下午9:54:11
// ==/UserScript==

(() => {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    main()
  } else {
    document.addEventListener("DOMContentLoaded", main)
  }

  function main() {
    appendPageIndex()
  
    showThumbsWhenHover()

    const featuresContainer = appendFeaturesContainer()
    
    const [pageElevatorElem, pageElevatorContainer] = createPageElevator()
    featuresContainer.append(pageElevatorContainer)
    overrideKeyBoardEvent()
    updateCurrentPageWhenScrolling(pageElevatorElem)

    setMouseWheelChangePageEvent(pageElevatorElem)
    setClickChangePageEvent()

    featuresContainer.append(createImageHeightResizer())

    injectCss()
  }
  
  /**
   * 於圖片資訊欄新增目前頁數/總共頁數
   */
  function appendPageIndex() {
    const imageContainers = getElements('.mi0')
    const length = imageContainers.length

    const mutationObserver = new MutationObserver(([mutation]) => {
      const target = mutation.target
      const index = target.id.split('image_')[1]
      const caption = getElement('.mi4', target)
      const text = caption?.innerText

      if (!text || text?.includes(' ／ ')) {
        return
      }

      caption.innerText = `${text}　-　${index} ／ ${length}`
    })

    const config = { attributes: true };
    imageContainers.forEach(container => {
      mutationObserver.observe(container, config);
    })
  }
  
  /**
   * 滑鼠移到左方時顯示縮圖清單
   */
  function showThumbsWhenHover() {
    const paneThumbs = getElement('#pane_thumbs')

    document.addEventListener('mousemove', e => {
      if (e.clientX < paneThumbs.offsetWidth + 15) {
        paneThumbs.style.opacity = 1
      } else {
        paneThumbs.style.opacity = 0
      }
    })
  }

  function appendFeaturesContainer() {
    const featuresContainer = document.createElement('div')
    featuresContainer.classList.add('enhencer-features')
    getElement('#pane_outer').append(featuresContainer)

    return featuresContainer
  }
  
  function createPageElevator() {
    const container = document.createElement('div')
    container.classList.add('enhencer-features__enhencer-feature','page-elevator', )

    const pageElevatorElem = document.createElement('input')
    pageElevatorElem.classList.add('page-elevator__input')
    pageElevatorElem.value = currentpage // currentpage 為 exhentai 內建變數，表示目前頁數
    
    pageElevatorElem.addEventListener('keydown', e => {
      e.stopPropagation()
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        const page = Number(e.target.value)
        goToPage(page)
      }
    })

    container.append(pageElevatorElem)

    const slash = document.createElement('span')
    slash.classList.add('page-elevator__slash')
    slash.innerText = '／'
    container.append(slash)

    const totalPage = document.createElement('span')
    totalPage.innerText = pagecount
    container.append(totalPage)

    return [pageElevatorElem, container]
  }
  
  /**
   * 滑鼠移到右側時，滾動直接換頁
   */
  function setMouseWheelChangePageEvent(pageElevatorElem) {
    document.body
      .addEventListener('mousewheel', e => {
        // 以 page elevator 左側當作界線
        if (e.x < pageElevatorElem.getBoundingClientRect().left) {
          hideCursor()
          getElement('#pane_images')
            .addEventListener('mousemove', showCursor, { once: true })
          return
        }

        e.stopPropagation()

        if (Math.sign(e.deltaY) === -1) { // 滾輪向上
          goToPrevPage()
        } else { // 滾輪向下
          goToNextPage()
        }
      },
      true)

  }


  function showCursor() {
    getElement('#pane_images')
      .classList
      .remove('hide-cursor')
  }

  function hideCursor() {
    getElement('#pane_images')
      .classList
      .add('hide-cursor')
  }

  /**
   * 點擊畫面上半部 -> 上一頁
   * 點擊畫面下半部 -> 下一頁
   */
  function setClickChangePageEvent() {
    getElement('#pane_images')
      .addEventListener('click', e => {

        // 點擊資訊列則不動作
        if (e.target.closest('.mi1')) {
          return
        }

        e.preventDefault()
        e.stopPropagation()

        if (e.clientY < window.innerHeight / 2) {
          goToPrevPage()
        } else {
          goToNextPage()
        }
      })
  }

  function goToNextPage() {
    // pagecount 為 exhentai 內建變數，表示總共的頁數
    if (currentpage === pagecount) {
      return
    }
    
    goToPage(++currentpage)
  }

  function goToPrevPage() {
    if (currentpage === 1) {
      return
    }
    
    goToPage(--currentpage)
  }
  
  function goToPage(index) {
    currentpage = index
    document.getElementById(`image_${index}`).scrollIntoView();
  }
  
  /**
   * onscroll 時同時更新 currentpage 至 pageElevatorElem 的 value
   */
  function updateCurrentPageWhenScrolling(pageElevatorElem) {
    // exhentai 原為 pane_images.onscroll = preload_scroll_images
     pane_images.onscroll = () => {
      preload_scroll_images()
      pageElevatorElem.value = currentpage
    }
  }
  
  /**
   * 只保留方向鍵的事件，且改寫左右鍵的方法
   */
  function overrideKeyBoardEvent() {
    document.onkeydown = (e) => {
      switch (e.code) {
        case 'ArrowUp':
          scroll_relative("pane_images", 50); // scroll_relative 為 exhentai 內建變數 function
          break;
        case 'ArrowDown':
          scroll_relative("pane_images", -50);
          break;
        case 'ArrowLeft':
          goToPrevPage()
          break;
        case 'ArrowRight':
          goToNextPage()
          break;
      }
    }
  }
  
  let currentImageHeight = null

  /**
   * 產生一個可將圖片高度設定為特定高度的按鈕 (不會超過原圖最大高度)
   */ 
  function createImageHeightResizer() {
    const heightList = [100, 125, 150, 175, 200]
    
    const container = document.createElement('div')
    container.classList.add('enhencer-features__enhencer-feature', 'image-resizer')

    for (const height of heightList) {
      const fitButton = document.createElement('button')
      fitButton.classList.add('image-resizer__button', `image-resizer__button--${height}`)
      fitButton.innerText = height

      const imagesContainer = getElement('#pane_images')
      fitButton.addEventListener('click', function() {
        const containerActiveClass = 'resize'
        const buttonActiveClass = 'image-resizer__button--active'
        
        removeClassFromElements('.image-resizer__button', buttonActiveClass)
        
        if (height === currentImageHeight) {
          currentImageHeight = null
          imagesContainer.classList.remove(containerActiveClass)
          imagesContainer.style.removeProperty('--image-height')
        } else {
          addClassToElement(`.image-resizer__button--${height}`, buttonActiveClass)
          imagesContainer.classList.add(containerActiveClass)
          imagesContainer.style.setProperty('--image-height', `${height}vh`)
          currentImageHeight = height
        }
        
        goToPage(currentpage)
      })
      
      container.append(fitButton)
    }

    return container
  }
  
  function addClassToElement(selector, className) {
    getElement(selector)
      ?.classList
      ?.add(className)
  }
  
  function removeClassFromElements(selector, className) {
    getElements(selector).forEach(elem => {
      elem.classList.remove(className)
    })
  }

  function getElement(selector, doc = document) {
    return doc.querySelector(selector)
  }

  function getElements(selector, doc = document) {
    return doc.querySelectorAll(selector)
  }

  function injectCss() {
    const style = document.createElement('style');
    style.textContent = `
      html {
        width: 100% !important;
        height: 100% !important;
      }

      body {
        padding: 0;
        width: 100% !important;
        height: 100% !important;
      }

      div#pane_outer {
        height: 100% !important;
        width: 100% !important;
      }

      div#pane_images {
        height: 100% !important;
        width: 100% !important;
      }

      .hide-cursor * {
        cursor: none;
      }
      
      div#pane_images.resize .mi0 {
        height: calc(var(--image-height) + 24px) !important;
        width: max-content !important
      }

      div#pane_images.resize img[id^=imgsrc_] {
        width: auto !important;
        height: var(--image-height) !important;
        max-height: calc(100% - 24px);
      }

      div#pane_thumbs {
        display: block;
        opacity: 0;
        z-index: 1;
        transition: opacity .3s;
      }

      .enhencer-features {
        display: flex;
        flex-direction: column;
        gap: 16px;
        position: absolute;
        top: 50%;
        right: 5px;
        width: 40px;
        transform: translate(0, -50%);
        box-sizing: border-box;
        z-index: 100;
      }

      .enhencer-features__enhencer-feature {
        background: #77777777;
        padding: 10px 5px;
        border-radius: 10px;
      }

      .page-elevator {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .page-elevator__input {
        width: 100%;
        display: flex;
        padding: 0;
        height: 30px;
        margin: 0;
        box-sizing: border-box;
        border: #777 solid 1px;
        text-align: center;
      }

      .page-elevator__slash {
        line-height: 100%;
      }

      .image-resizer {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .image-resizer__button {
        padding: 0;
        width: 100%;
        height: 30px;
        border: #777 solid 1px;
        border-radius: 5px;
        background-color: transparent;
        box-sizing: border-box;
        text-align: center;
        cursor: pointer;
      }

      .image-resizer__button:hover {
        background-color: #ffa50033;
      }

      .image-resizer__button--active,
      .image-resizer__button--active:hover {
        background-color: #ffa500;
      }
    `;

    getElement('head').append(style);
  }
})()
