document.addEventListener("DOMContentLoaded", () => {
  new ImageGrid({
    id: "one",
  });
});

class ImageGrid {
  constructor(args) {
    // 所有card的容器元素
    this.containerElem = document.querySelector(`#${args.id}`);
    // 所有card的容器元素类名
    this.gridElemClass = `image-grid`;
    this.cardContent = null; // card中的内容（应当包含其子元素为图像的a标签和card的title）
    this.curPage = 1; // 获取图像和展示时的当前页信息
    this.loadingStatusElem = null; // 展示当前页所有图像前的loading
    this.imagesPerRequest = 100; // 发送一次XMLHttpRequest请求时，返回100个包含图像URL等信息的数据对象，然后在每个img元素中对对应的src的URL值进行图像的请求
    this.observer = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // 只观察当前页面中的最后一个img元素
            observer.unobserve(entry.target);

            let curPageCardElems = this.getCardElems();
            const curPageCardElemsLength = curPageCardElems.length,
              curPageStartIndex = (this.curPage - 1) * this.imagesPerRequest,
              contentIndex = curPageCardElemsLength - curPageStartIndex;
            // 加载下一页
            if (
              curPageCardElemsLength <
              curPageStartIndex + this.cardContent.length
            ) {
              console.log("fetch");
              this.addCard(this.cardContent[contentIndex]);
              curPageCardElems = this.getCardElems();
              // 监听当前页面中的最后一个img元素
              observer.observe(curPageCardElems[curPageCardElemsLength]);
            } else {
              ++this.curPage;
              this.requestImages(this.imagesPerRequest, this.curPage);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: "0px 0px 0px 0px",
        threshold: 0.99,
      }
    );
    this.createLoadingStatus();
    this.requestImages(this.imagesPerRequest);
  }

  // 当前页面所有图像渲染前的loading
  createLoadingStatus() {
    this.loadingStatusElem = document.createElement("div");
    this.loadingStatusElem.className = `${this.gridElemClass}_status`;
    this.containerElem.appendChild(this.loadingStatusElem);

    const preloaderElem = document.createElement("div"),
      loadingStatusMessageElem = document.createElement("p"),
      loadingStatusMessageTextElem = document.createTextNode("loading...");

    preloaderElem.className = "pl pl-fade";
    this.loadingStatusElem.appendChild(preloaderElem);
    this.loadingStatusElem.appendChild(loadingStatusMessageElem);
    loadingStatusMessageElem.appendChild(loadingStatusMessageTextElem);
  }

  // 修改loading状态时的文本内容
  setLoadingStatus(msg) {
    if (this.loadingStatusElem !== null) {
      const preloaderElem = this.loadingStatusElem.querySelector(".pl"),
        loadingStatusMessageElem = this.loadingStatusElem.querySelector("p");
      this.loadingStatusElem.removeChild(this.loadingStatusElem.firstChild);
      loadingStatusMessageElem.textContent = msg;
    }
  }

  // 移除loading状态
  removeLoadingStatus() {
    if (this.loadingStatusElem !== null) {
      const parentElem = this.loadingStatusElem.parentElement;
      parentElem.removeChild(parentElem.firstChild);
      this.loadingStatusElem = null;
    }
  }

  // 远程请求图像
  requestImages(perPage = 20, curPage = 1) {
    // Pixabay上的限制，每次请求的数量应在3-200之间
    perPage = perPage < 3 ? 3 : perPage > 200 ? 200 : perPage;
    curPage = curPage < 1 ? 1 : curPage;

    // 设置请求时所需的参数
    const APIKey = "2913992-c926292594f754c09b7f796ad",
      query = "animal",
      minWidth = 270,
      minHeight = 180,
      url = `https://pixabay.com/api/?key=${APIKey}&q=${query}&image_type=photo&min_width=${minWidth}&min_height=${minHeight}&per_page=${perPage}&curPage=${curPage}&safesearch=true`;

    // 发送请求
    this.requestJSON(url)
      .then(items => {
        this.cardContent = items;
        if (this.cardContent !== null && this.cardContent.length) {
          // 移除loading状态
          this.removeLoadingStatus();
          // 根据获取到的图像内容来创建对应的card元素
          this.addCard(this.cardContent[0]);
          const firstCardElem = this.containerElem.lastChild;
          this.observer.observe(firstCardElem);
        } else {
          // 将loading状态中的文本内容修改为未获取到数据
          this.setLoadingStatus("未获取到数据");
        }
      })
      .catch(err => {
        this.setLoadingStatus(err);
      });
  }

  // 请求图像JSON格式数据
  requestJSON(url) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("GET", url, true);
      request.onload = function () {
        let items;
        try {
          const res = JSON.parse(this.response);
          items = [...res.hits];
        } catch (err) {
          items = [];
        }
        resolve(items);
      };
      request.onerror = () => {
        reject(
          "It appears you’re offline. Check your connection and try again."
        );
      };
      request.send();
    });
  }

  // 根据获取到的图像内容创建对应的card元素
  addCard(content) {
    /*
        生成的每张card的html结构为
        card → a → img
         */
    const data = {
      title: content.tags || "undefined",
      link: content.pageURL || "#0",
      thumbnail:
        content.webformatURL.replace("640.jpg", "180.jpg") ||
        "https://i.ibb.co/6Whjrmx/placeholder.png",
      thumbWidth: content.webformatWidth / 2 || 1,
      thumbHeight: content.webformatHeight / 2 || 1,
    };
    // card
    const cardElem = document.createElement("div");
    cardElem.className = `${this.gridElemClass}_card`;
    this.containerElem.appendChild(cardElem);

    // thumbLink
    const thumbLinkElem = document.createElement("a");
    thumbLinkElem.href = data.link;
    thumbLinkElem.target = "_blank";
    thumbLinkElem.rel = "noopener noreferrer";
    cardElem.appendChild(thumbLinkElem);

    // thumb
    const thumbElem = document.createElement("img");
    thumbElem.className = `${this.gridElemClass}_card-thumb`;

    // 如果图像的宽度小于高度（图像类似于垂直状的长方形），让图像的宽度拉伸至其容器元素a标签的100%，占满整个card
    if (data.thumbWidth < data.thumbHeight) {
      thumbElem.classList.add(`${this.gridElemClass}_card-thumb-portrait`);
    }
    thumbElem.src = data.thumbnail;
    thumbElem.width = data.thumbWidth;
    thumbElem.height = data.thumbHeight;
    thumbElem.alt = data.title;
    thumbLinkElem.appendChild(thumbElem);

    // card title
    const cardTitleElem = document.createElement("span");
    const cardTitleText = document.createTextNode(data.title);
    cardTitleElem.className = `${this.gridElemClass}_card-title`;
    cardTitleElem.title = data.title;
    cardTitleElem.appendChild(cardTitleText);
    cardElem.appendChild(cardTitleElem);
  }
  getCardElems() {
    return this.containerElem.querySelectorAll(`.${this.gridElemClass}_card`);
  }
}
