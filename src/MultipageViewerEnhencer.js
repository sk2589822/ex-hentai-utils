// ==UserScript==
// @name        Multipage Viewer Enhencer - exhentai.org
// @namespace   Violentmonkey Scripts
// @match       https://exhentai.org/mpv/*/*/
// @grant       none
// @version     1.0.4
// @author      -
// @description 2021/12/17 下午9:54:11
// ==/UserScript==

(() => {
  appendPageIndex()
  
  showThumbsWhenHover()
  
  const pageElevatorElem = appendPageElevator()
  setRightEdgeScrollEvent()
  overrideKeyBoardEvent()
  overrideImagesScrollEvent(pageElevatorElem)

  injectCss()
  
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
    
    document.addEventListener('mousemove', e => {
      if (e.clientX < paneThumbs.clientWidth + 15) {
        paneThumbsStyle.opacity = 1
      } else {
        paneThumbsStyle.opacity = 0
      }
    })
  }
  
  function appendPageElevator() {
    const pageElevatorElem = document.createElement('input')
    pageElevatorElem.classList.add('page-elevator')
    pageElevatorElem.value = currentpage // currentpage 為 exhentai 內建變數
    
    pageElevatorElem.addEventListener('keydown', e => {
      e.stopPropagation()
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        const page = e.target.value
        goToPage(page)
      }
    })
    
    pageElevatorElem.addEventListener('wheel', e => {
      e.stopPropagation()
      if (Math.sign(e.deltaY) === -1) { // 滾輪向上
        currentpage = --currentpage > 0 ? currentpage : 1
        goToPage(currentpage) 
      } else { // 滾輪向下
        currentpage = ++currentpage < pagecount ? currentpage : pagecount  // pagecount 為 exhentai 內建變數
        goToPage(currentpage)
      }
    })
    
    document.querySelector('#pane_outer').append(pageElevatorElem)

    return pageElevatorElem
  }
  /**
   * 滑鼠移到最右邊時，滾動直接換頁
   */
  function setRightEdgeScrollEvent() {
    // ExHentai 的網頁有覆寫 #pane_images的 wheel 事件，而因為沒寫好(?)導致滑鼠移到最右邊時觸發的 target 是 html
    // 就將錯就錯
    document.querySelector('html').addEventListener('wheel', e => {
      if (Math.sign(e.deltaY) === -1) { // 滾輪向上
        currentpage = --currentpage > 0 ? currentpage : 1
        goToPage(currentpage) 
      } else { // 滾輪向下
        currentpage = ++currentpage < pagecount ? currentpage : pagecount  // pagecount 為 exhentai 內建變數
        goToPage(currentpage)
      }
    })
  }
  
  function goToPage(index) {
    document.getElementById(`image_${index}`).scrollIntoView();
  }
  
  // onscroll 時同時更新 currentpage 至 pageElevatorElem 的 value
  function overrideImagesScrollEvent(pageElevatorElem) {
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

  function injectCss() {
    const style = document.createElement('style');
    style.textContent = `
      div#pane_thumbs {
        display: block;
        opacity: 0;
        z-index: 1;
        transition: opacity .3s;
      }

      .page-elevator {
        position: absolute;
        top: 50%;
        right: 5px;
        width: 30px;
        height: 30px;
        transform: translate(0, -50%);
        text-align: center;
      }
    `;

    document.querySelector('head').append(style);
  }
})()
