// ==UserScript==
// @name        Multipage Viewer Enhencer - exhentai.org
// @namespace   Violentmonkey Scripts
// @match       https://exhentai.org/mpv/*/*/
// @grant       none
// @version     1.0
// @author      -
// @description 2021/12/17 下午9:54:11
// ==/UserScript==

(() => {
  appendPageIndex()
  
  showThumbsWhenHover()
  
  let pageElevatorElem = null
  appendPageElevator()
  overrideKeyBoardEvent()
  overrideImagesScrollEvent()
  
  // 於圖片資訊欄新增目前頁數/總共頁數
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
  
  // 滑鼠移到左方時顯示縮圖清單
  function showThumbsWhenHover() {
    const paneThumbs = document.querySelector('#pane_thumbs')
    const paneThumbsStyle = paneThumbs.style
    paneThumbsStyle.display = 'block'
    paneThumbsStyle.opacity = 0
    paneThumbsStyle.zIndex = 1
    paneThumbsStyle.transition = 'opacity .3s'

    document.addEventListener('mousemove', e => {
      if (e.clientX < paneThumbs.clientWidth + 15) {
        paneThumbsStyle.opacity = 1
      } else {
        paneThumbsStyle.opacity = 0
      }
    })
  }
  
  function appendPageElevator() {
    pageElevatorElem = document.createElement('input')
    pageElevatorElem.classList.add('page-selector')
    pageElevatorElem.value = currentpage // currentpage 為 exhentai 內建變數
    pageElevatorElem.addEventListener('keydown', e => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        const page = e.target.value
        goToPage(page)
        
      }
    })
    document.querySelector('#bar3').append(pageElevatorElem)
  }
  
  function goToPage(index) {
    document.getElementById(`image_${index}`).scrollIntoView();
  }
  
  // onscroll 時同時更新 currentpage 至 pageElevatorElem 的 value
  function overrideImagesScrollEvent() {
    // exhentai 原為 pane_images.onscroll = preload_scroll_images
     pane_images.onscroll = () => {
      preload_scroll_images()
      pageElevatorElem.value = currentpage
    }
  }
  
  // 只保留方向鍵的事件，且改寫左右鍵的方法
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
          currentpage = --currentpage > 0 ? currentpage : 1
          goToPage(currentpage) 
          break;
        case 'ArrowRight':
          currentpage = ++currentpage < pagecount ? currentpage : pagecount  // pagecount 為 exhentai 內建變數
          goToPage(currentpage)
          break;
      }
    }
  }
  
})()

