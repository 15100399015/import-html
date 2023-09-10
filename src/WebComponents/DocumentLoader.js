import importHTML from "import-html-entry";

function patchElement(doc) {
  const head = document.createElement("div");
  const body = document.createElement("div");
  head.setAttribute("data-element","head")
  body.setAttribute("data-element","body")
  doc.appendChild(head);
  doc.appendChild(body);
  Reflect.set(doc, "body", body);
  Reflect.set(doc, "head", head);
  const docKeys = Object.keys(Document.prototype);
  const kes = new Set([])
  for (let index = 0; index < docKeys.length; index++) {
    const key = docKeys[index];
    if (!Reflect.has(doc, key)) {
      Object.defineProperty(doc, key, {
        get() {
          let value = Reflect.get(document, key);
          kes.add(key)
          console.log(kes);
          if (typeof value === "function") {
            value = value.bind(document);
          }
          return value;
        },
        enumerable: true,
        configurable: true,
      });
    }
  }
  return doc;
}

/**
 * 创建 proxy 对象，保障this指向正常
 * @param {*} element
 * @returns
 */
function substitute(element) {
  return new Proxy(element, {
    get: (target, key) => {
      const result = Reflect.get(target, key);
      if (typeof result === "function") {
        return result.bind(target);
      }
      return result;
    },
  });
}

/**
 * 沙盒
 */
export class Sandbox {
  fakeTarget = {};
  realTarget = {};

  box = null;

  constructor(target, fake) {
    this.realTarget = target;
    this.fakeTarget = fake;
    this.box = new Proxy(this.fakeTarget, {
      get: (target, key) => {
        if (Reflect.has(target, key)) {
          return Reflect.get(target, key);
        } else {
          const result = Reflect.get(this.realTarget, key);
          if (typeof result === "function") {
            return result.bind(this.realTarget);
          }
          return result;
        }
      },
      set: (target, key, value) => {
        return Reflect.set(target, key, value);
      },
    });
  }
}

// 实现 document 加载组件
class DocumentLoaderClass extends HTMLElement {
  // 当前实例的缓存key
  cacheKey = crypto.randomUUID();
  // 当前加载的状态
  loadStatus = null;
  // 下一个等待被加载的 document
  nextDoc = null;
  // 监听 attribute 变化
  static get observedAttributes() {
    return ["code"];
  }
  constructor(props) {
    super(props);
    // 启用 shadow dom
    this.attachShadow({ mode: "open" });
  }
  // attribute 变化回调
  attributeChangedCallback(prop, oldValue, newValue) {
    if (prop === "code") {
      if (newValue && this.verifyDoc(newValue)) {
        // 如果在加载中
        if (this.loadStatus) {
          this.nextDoc = newValue;
        } else {
          this.load(newValue, () => {
            if (this.nextDoc) {
              this.nextDoc = null;
              this.load(this.nextDoc);
            }
          });
        }
      }
    }
  }

  /**
   * 验证dom结构是否合法
   * @param {*} tpl
   * @returns
   */
  verifyDoc(tpl) {
    const doc = new DOMParser().parseFromString(tpl, "text/html");
    return !!doc.body.children.length;
  }

  /**
   * 加载文档片段
   * @param {*} tpl
   * @param {*} callback
   */
  load(tpl, callback = () => { }) {
    this.loadStatus = true;
    importHTML(`/${this.cacheKey}`, {
      fetch: (url, ...args) => {
        if (url === `/${this.cacheKey}`) {
          return Promise.resolve(
            new Response(new Blob([tpl], { type: "text/plane" }))
          );
        }
        return fetch.bind(window)(url, ...args);
      },
    }).then(
      (res) => {
        this.loadStatus = false;
        callback(true);
        patchElement(this.shadowRoot);
        this.shadowRoot.body.innerHTML = res.template;
        const windowBox = new Sandbox(substitute(window), {
          document: this.shadowRoot,
        }).box;
        res.execScripts(windowBox, true);
      },
      () => {
        this.loadStatus = false;
        callback(false);
      }
    );
  }
}

export const DocumentLoader = "document-loader";

customElements.define(DocumentLoader, DocumentLoaderClass);
