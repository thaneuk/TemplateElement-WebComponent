/**!
 * Copyright 2017 Gregory Jackson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

(function (window) {
    'use strict';

    class TemplateElement extends HTMLElement {
        constructor() {
            super();

            let shadowRoot = this.attachShadow({mode: 'open'});
            /* important webcomponent templates with id matching tagName in lowercase e.g. <template id="tag-name"></template> */
            let content = document.currentScript.ownerDocument.querySelector(`template#${this.tagName.toLowerCase()}`).content.cloneNode(true);
            let docFrag = document.createDocumentFragment();

            /* check for any data bindings and attempt to retrieve reference to the data (objects reference only) */
            this.resolveInputs();

            if (shadowRoot && content) {

                docFrag.append(content);

                /* scan template dom for anything that is attributed for outputting data
                 * tags with attribute bind="<data-ref>" will be written to innerText if data can be found that matches data reference
                 * tags with attributes encased in square brackets will be written as a normal attribute minus the square brackets if
                 *     data reference found, e.b. [title]="<data-ref>" will cause a title attribute to be created.
                 */
                this.updateBindings(docFrag);

                /* when done write compiled template to shadowRoot dom */
                shadowRoot.appendChild(docFrag);
            }

            this.$watchers = [];

            window.setTimeout(() => {
                this.$checkWatchers();
            }, 250);
        }

        disconnectedCallback() {
            this.$clearWatches();
        }

        attributeChangedCallback() {
            this.$checkWatchers();
        }

        /**
         * scan shadowRoot host to attributes suggesting data input and attempt to retrieve
         */
        resolveInputs() {
            let hostElement,
                parentHost;

            if (!this.data) {
                this.data = {};
            }

            if (this.shadowRoot && this.shadowRoot.host) {
                hostElement = this.shadowRoot.host;

                parentHost = hostElement;
                while (parentHost.nodeType !== 11 && parentHost.parentNode) {
                    parentHost = parentHost.parentNode;
                }

                if (parentHost.host && parentHost.host.$getBindingValue) {
                    this.$getDataWith(false, hostElement.attributes, parentHost.host);
                } else if (parentHost.defaultView) {
                    this.$getDataWith(this.$getBindingValue.bind(parentHost.defaultView), hostElement.attributes);
                }
            }
        }

        /**
         * call $getBindingValue from a parent component or seek data from parent defaultView to get data as per attributes path
         * @param fn {function|boolean}
         * @param hostAttributes {object}
         * @param [host] {object}
         * @private
         */
        $getDataWith(fn, hostAttributes, host) {
            let path, value;

            for (let i = 0, iLen = hostAttributes.length; i < iLen; i += 1) {
                path = hostAttributes[i].name;

                if (path.match(/^data-/)) {
                    if (fn) {
                        value = fn(hostAttributes[i].value);
                    } else {
                        value = host.$getBindingValue(hostAttributes[i].value);
                    }

                    if (value) {
                        this.data[path.replace(/^data-/, '')] = value;
                    }
                }
            }
        }

        /**
         * @param documentFrag {object} reference to a document fragment or will default to referencing the shadowRoot
         */
        updateBindings(documentFrag) {
            (documentFrag || this.shadowRoot).querySelectorAll('[bind]').forEach(el => {
                const
                    binding = el.getAttribute('bind'),
                    bindText = this.$getBindingValue(binding);

                if (bindText) {
                    el.innerText = bindText;
                }
            });

            (documentFrag || this.shadowRoot).querySelectorAll('*').forEach(el => {
                const elAttributes = el.attributes;

                for (let i = 0, iLen = elAttributes.length; i < iLen; i += 1) {
                    if (elAttributes[i].name.match(/\[[a-z\-]*]/)) {
                        el.setAttribute(elAttributes[i].name.replace(/\[([a-z\-]*)]/, '$1'), this.$getBindingValue(elAttributes[i].value) || '');
                    }
                }
            });
        }

        /**
         * take a string and attempt to get value that matches path from component
         * @param path {string}
         * @returns {*}
         * @private
         */
        $getBindingValue(path) {
            try {
                return path.replace(/\['/g, '.').replace(/']/g, '').split('.').reduce((val, path) => {
                    return val && path in val ? val[path] : undefined;
                }, this);
            } catch (e) {
                return undefined;
            }
        }

        /**
         * create a primitive value watcher
         * @param path {string} path to primitive value to watch
         * @param fn {function} call when value changes
         * @returns {*}
         */
        $watch(path, fn) {
            try {
                let watchId = this.$watchers.push({
                    path: path, fn: fn, current: this.$getBindingValue(path)
                }) - 1;

                this.$watchers[watchId].destroyer = () => {
                    this.$watchers[watchId] = null;
                    path = null;
                    fn = null;
                };

                return this.$watchers[watchId].destroyer;
            } catch (e) {
                return () => {
                };
            }
        }

        /**
         * clear all watches on web component
         */
        $clearWatches() {
            this.$watchers.forEach(watch => {
                if (watch !== null) {
                    watch.destroyer();
                }
            });
        }

        /**
         * scan all watches for changes
         */
        $checkWatchers() {
            this.$watchers.length && this.$watchers.forEach(watch => {
                let newValue = this.$getBindingValue(watch.path);

                if (newValue !== watch.current) {
                    watch.fn(watch.current, newValue);
                    watch.current = newValue;
                }
            });

            window.setTimeout(() => {
                this.$checkWatchers();
            }, 250);
        }
    }

    window.TemplateElement = TemplateElement;

})(window);
