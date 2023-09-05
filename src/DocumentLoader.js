
import { useEffect, useRef } from 'react';
import importHTML from 'import-html-entry'


Element.prototype.getElementById = function (id) {
    return this.querySelector(`#${id}`)
}

export class Sandbox {

    fakeTarget = {}
    realTarget = window

    box = null

    constructor(target, fake) {
        this.realTarget = target
        this.fakeTarget = fake
        this.box = new Proxy(this.fakeTarget, {
            get: (target, key) => {
                if (Reflect.has(target, key)) return Reflect.get(target, key)
                const result = Reflect.get(this.realTarget, key)
                if (typeof result == 'function') {
                    return result.bind(this.realTarget)
                }
                return result
            },
            set: (target, key, value) => {
                return Reflect.set(target, key, value)
            }
        })
    }
}



const DocumentLoader = (props) => {
    const conatiner = useRef(null)
    const instance = useRef(true)


    useEffect(() => {
        props.code && instance.current && start()
    }, [props.code])

    const start = async () => {
        instance.current = false
        const tpl = props.code
        importHTML("/code", {
            fetch: (url) => {
                if (url === "/code") {
                    return new Promise((resolve) => {
                        resolve(new Response(new Blob([tpl], { type: "text/plane" })))
                    })
                }
                return fetch.bind(window)(url)
            },

        }).then((res) => {
            if (conatiner.current) {
                const dom = conatiner.current
                const shadowRoot = dom.attachShadow({ mode: "open" })
                const wrapper = document.createElement("div")
                shadowRoot.appendChild(wrapper);
                wrapper.innerHTML = res.template
                // console.log(wrapper.getElementById("chart"));
                const sandbox = new Sandbox(window, {
                    document: new Sandbox(document, wrapper).box
                }).box
                res.execScripts(sandbox, true)
            }

        })

    }

    return <div ref={conatiner} style={{
        width: "100%",
        height: "100%",
        overflow: "auto"
    }}>
    </div>
}

export default DocumentLoader