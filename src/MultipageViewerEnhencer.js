// ==UserScript==
// @name        Multipage Viewer Enhencer - exhentai.org
// @namespace   Violentmonkey Scripts
// @match       https://exhentai.org/mpv/*/*/
// @grant       none
// @version     1.0.11
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
    
    const pageElevatorElem = createPageElevator()
    featuresContainer.append(pageElevatorElem)
    overrideKeyBoardEvent()
    overrideImagesScrollEvent(pageElevatorElem)

    setMouseWheelChangePageEvent(pageElevatorElem)
    setClickChangePageEvent()

    const fitButton = createFitWindowHeightButton()
    featuresContainer.append(fitButton)

    injectCss()
  }
  
  /**
   * 於圖片資訊欄新增目前頁數/總共頁數
   */
  function appendPageIndex() {
    const imageContainers = document.querySelectorAll('.mi0')
    const length = imageContainers.length

    const mutationObserver = new MutationObserver(([mutation]) => {
      const target = mutation.target
      const index = target.id.split('image_')[1]
      const caption = target.querySelector('.mi4')
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
    const paneThumbs = document.querySelector('#pane_thumbs')

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
    document.querySelector('#pane_outer').append(featuresContainer)

    return featuresContainer
  }
  
  function createPageElevator() {
    const pageElevatorElem = document.createElement('input')
    pageElevatorElem.classList.add('enhencer-features__page-elevator')
    pageElevatorElem.value = currentpage // currentpage 為 exhentai 內建變數
    
    pageElevatorElem.addEventListener('keydown', e => {
      e.stopPropagation()
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        const page = e.target.value
        goToPage(page)
      }
    })

    return pageElevatorElem
  }

  /**
   * 滑鼠移到右側時，滾動直接換頁
   */
  function setMouseWheelChangePageEvent(pageElevatorElem) {
    document
      .querySelector('body')
      .addEventListener('mousewheel', e => {
        // 以 page elevator 左側當作界線
        if (e.x < pageElevatorElem.getBoundingClientRect().left) {
          return
        }

        e.stopPropagation()

        if (Math.sign(e.deltaY) === -1) { // 滾輪向上
          goToPrevPage()
        } else { // 滾輪向下
          goToNextPage()
        }
      }, true)
  }


  /**
   * 點擊畫面上半部 -> 上一頁
   * 點擊畫面下半部 -> 下一頁
   */
  function setClickChangePageEvent() {
    document
      .querySelector('#pane_images')
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
    currentpage = ++currentpage < pagecount ? currentpage : pagecount  // pagecount 為 exhentai 內建變數
    goToPage(currentpage)
  }

  function goToPrevPage() {
    currentpage = --currentpage > 0 ? currentpage : 1
    goToPage(currentpage)
  }
  
  function goToPage(index) {
    currentpage = index
    document.getElementById(`image_${index}`).scrollIntoView();
  }
  
  /**
   * onscroll 時同時更新 currentpage 至 pageElevatorElem 的 value
   */
  function overrideImagesScrollEvent(pageElevatorElem) {
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

  /**
   * 產生一個可切換圖片「原尺寸/符合視窗」高度的按鈕
   */ 
  function createFitWindowHeightButton() {
    const fitButton = document.createElement('button')
    fitButton.classList.add('enhencer-features__button')
    fitButton.innerText = 'Fit'

    const imagesContainer = document.querySelector('#pane_images')
    fitButton.addEventListener('click', function() {
      const fitWindowHeightClass = 'fit-window-height'
      const activeClass = `enhencer-features__button--active`
      
      if (this.classList.contains(activeClass)) {
        this.classList.remove(activeClass)
        imagesContainer.classList.remove(fitWindowHeightClass)
      } else {
        this.classList.add(activeClass)
        imagesContainer.classList.add(fitWindowHeightClass)
      }
      
      goToPage(currentpage)
    })

    return fitButton
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

      div#pane_images.fit-window-height img[id^=imgsrc_] {
        width: auto !important;
        height: 100vh !important;
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
        width: 30px;
        transform: translate(0, -50%);
        box-sizing: border-box;
        z-index: 100;
      }

      .enhencer-features__page-elevator {
        width: 100%;
        display: flex;
        padding: 0;
        height: 30px;
        margin: 0;
        order: 2;
        box-sizing: border-box;
        border: #777 solid 1px;
        text-align: center;
      }

      .enhencer-features__button {
        width: 100%;
        height: 30px;
        border: #777 solid 1px;
        border-radius: 5px;
        background-color: transparent;
        box-sizing: border-box;
        cursor: pointer;
        order: 1;
      }

      .enhencer-features__button:hover {
        background-color: #ffa50033;
      }

      .enhencer-features__button--active,
      .enhencer-features__button--active:hover {
        background-color: #ffa500;
      }
    `;

    document.querySelector('head').append(style);
  }
})()
