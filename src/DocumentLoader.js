import { useEffect, useRef } from "react";
import importHTML from "import-html-entry";

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

const DocumentLoader = (props) => {
  const conatiner = useRef(null);
  const instance = useRef(true);

  useEffect(() => {
    props.code && instance.current && start();
  }, [props.code]);

  const start = async () => {
    instance.current = false;
    const tpl = props.code;
    importHTML("/code", {
      fetch: (url) => {
        if (url === "/code") {
          return new Promise((resolve) => {
            resolve(new Response(new Blob([tpl], { type: "text/plane" })));
          });
        }
        return fetch.bind(window)(url);
      },
    }).then((res) => {
      if (conatiner.current) {
        const dom = conatiner.current;
        const shadowRoot = dom.attachShadow({ mode: "open" });
        shadowRoot.innerHTML = res.template;
        const documentBox = new Sandbox(
          substitute(document),
          substitute(shadowRoot)
        ).box;
        const windowBox = new Sandbox(substitute(window), {
          document: documentBox,
        }).box;
        res.execScripts(windowBox, true);
      }
    });
  };

  return (
    <div
      ref={conatiner}
      style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
      }}
    ></div>
  );
};

export default DocumentLoader;
