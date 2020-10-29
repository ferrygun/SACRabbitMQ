(function() {
    let _shadowRoot;
    let _id;

    let div;
    let widgetName;
    var Ar = [];
    let _input;

    let client;

    let tmpl = document.createElement("template");
    tmpl.innerHTML = `
      <style>
      </style>      
    `;

    class Mqtt extends HTMLElement {

        constructor() {
            super();

            _shadowRoot = this.attachShadow({
                mode: "open"
            });
            _shadowRoot.appendChild(tmpl.content.cloneNode(true));

            _id = createGuid();

            this._export_settings = {};
            this._export_settings.title = "";
            this._export_settings.subtitle = "";
            this._export_settings.icon = "";
            this._export_settings.unit = "";
            this._export_settings.footer = "";

            this.addEventListener("click", event => {
                console.log('click');
            });

            this._firstConnection = 0;
        }

        connectedCallback() {
            try {
                if (window.commonApp) {
                    let outlineContainer = commonApp.getShell().findElements(true, ele => ele.hasStyleClass && ele.hasStyleClass("sapAppBuildingOutline"))[0]; // sId: "__container0"

                    if (outlineContainer && outlineContainer.getReactProps) {
                        let parseReactState = state => {
                            let components = {};

                            let globalState = state.globalState;
                            let instances = globalState.instances;
                            let app = instances.app["[{\"app\":\"MAIN_APPLICATION\"}]"];
                            let names = app.names;

                            for (let key in names) {
                                let name = names[key];

                                let obj = JSON.parse(key).pop();
                                let type = Object.keys(obj)[0];
                                let id = obj[type];

                                components[id] = {
                                    type: type,
                                    name: name
                                };
                            }

                            for (let componentId in components) {
                                let component = components[componentId];
                            }

                            let metadata = JSON.stringify({
                                components: components,
                                vars: app.globalVars
                            });

                            if (metadata != this.metadata) {
                                this.metadata = metadata;

                                this.dispatchEvent(new CustomEvent("propertiesChanged", {
                                    detail: {
                                        properties: {
                                            metadata: metadata
                                        }
                                    }
                                }));
                            }
                        };

                        let subscribeReactStore = store => {
                            this._subscription = store.subscribe({
                                effect: state => {
                                    parseReactState(state);
                                    return {
                                        result: 1
                                    };
                                }
                            });
                        };

                        let props = outlineContainer.getReactProps();
                        if (props) {
                            subscribeReactStore(props.store);
                        } else {
                            let oldRenderReactComponent = outlineContainer.renderReactComponent;
                            outlineContainer.renderReactComponent = e => {
                                let props = outlineContainer.getReactProps();
                                subscribeReactStore(props.store);

                                oldRenderReactComponent.call(outlineContainer, e);
                            }
                        }
                    }
                }
            } catch (e) {}
        }

        disconnectedCallback() {
            if (this._subscription) { // react store subscription
                this._subscription();
                this._subscription = null;
            }
        }

        onCustomWidgetBeforeUpdate(changedProperties) {
            if ("designMode" in changedProperties) {
                this._designMode = changedProperties["designMode"];
            }
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            var that = this;
            if (this._firstConnection === 0) {
                let mqttjs = "http://localhost:7800/mqttws31.js";
                async function LoadLibs() {
                    try {
                        await loadScript(mqttjs, _shadowRoot);
                    } catch (e) {
                        alert(e);
                    } finally {
                        var wsbroker = 'localhost'; //mqtt websocket enabled broker
                        console.log(wsbroker);
                        var wsport = 15675; // port for above

                        client = new Paho.MQTT.Client(wsbroker, wsport, "/ws",
                            "myclientid_" + parseInt(Math.random() * 100, 10));

                        console.log(client);

                        client.onConnectionLost = function(responseObject) {
                            console.log("CONNECTION LOST - " + responseObject.errorMessage);
                        };

                        client.onMessageArrived = function(message) {
                            console.log("RECEIVE ON " + message.destinationName + " PAYLOAD " + message.payloadString);

                            if(message.payloadString.split(":")[0] === "loc") {
                                loadthis(that, changedProperties, message.payloadString);
                            }
                        };
                        var options = {
                            timeout: 3,
                            keepAliveInterval: 30,
                            onSuccess: function() {
                                console.log("CONNECTION SUCCESS !!");
                                client.subscribe("events", {
                                    qos: 1
                                });
                            },
                            onFailure: function(message) {
                                console.log("CONNECTION FAILURE - " + message.errorMessage);
                            }
                        };
                        if (location.protocol == "https:") {
                            options.useSSL = true;
                        }
                        options.useSSL = false;
                        console.log("CONNECT TO " + wsbroker + ":" + wsport);
                        client.connect(options);
                        loadthis(that, changedProperties, '');
                    }
                }
                LoadLibs();
            }
        }

        _renderExportButton() {
            let components = this.metadata ? JSON.parse(this.metadata)["components"] : {};
            console.log("_renderExportButton-components");
            console.log(components);
            console.log("end");
        }

        _firePropertiesChanged() {
            this.footer = "";
            this.dispatchEvent(new CustomEvent("propertiesChanged", {
                detail: {
                    properties: {
                        footer: this.footer
                    }
                }
            }));
        }

        // SETTINGS
        get title() {
            return this._export_settings.title;
        }
        set title(value) {
            console.log("setTitle:" + value);
            this._export_settings.title = value;
        }

        get subtitle() {
            return this._export_settings.subtitle;
        }
        set subtitle(value) {
            this._export_settings.subtitle = value;
        }

        get icon() {
            return this._export_settings.icon;
        }
        set icon(value) {
            this._export_settings.icon = value;
        }

        get unit() {
            return this._export_settings.unit;
        }
        set unit(value) {
            this._export_settings.unit = value;
        }

        get footer() {
            return this._export_settings.footer;
        }
        set footer(value) {
            console.log("hello is me");
            value = _input;
            this._export_settings.footer = value;
        }

        static get observedAttributes() {
            return [
                "title",
                "subtitle",
                "icon",
                "unit",
                "footer",
                "link"
            ];
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue != newValue) {
                this[name] = newValue;
            }
        }

    }
    customElements.define("com-fd-djaja-sap-sac-mqtt", Mqtt);


    // UTILS
    function loadthis(that, changedProperties, message) {
        var that_ = that;

        widgetName = changedProperties.widgetName;
        console.log("DDDDDD:" + widgetName);
        if (typeof widgetName === "undefined") {
            widgetName = that._export_settings.title.split("|")[0];
            console.log("DDDDDD__:" + widgetName);
        }

        div = document.createElement('div');
        div.slot = "content_" + widgetName;

        if (that._firstConnection === 0) {
            console.log("--First Time --");

            let div0 = document.createElement('div');
            div0.innerHTML = '<?xml version="1.0"?><script id="oView_' + widgetName + '" name="oView_' + widgetName + '" type="sapui5/xmlview"><mvc:View xmlns:l="sap.ui.layout" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" controllerName="myView.Template"><l:VerticalLayout class="sapUiContentPadding" width="100%"><TextArea id="textArea_' + widgetName + '" value="{' + widgetName + '>/values}" showExceededText="true" maxLength="{' + widgetName + '>/value}" width="100%" liveChange=".handleLiveChange" valueState="Error" valueLiveUpdate="true"/></l:VerticalLayout></mvc:View></script>';
            _shadowRoot.appendChild(div0);

            let div1 = document.createElement('div');
            div1.innerHTML = '<div id="ui5_content_' + widgetName + '" name="ui5_content_' + widgetName + '"><slot name="content_' + widgetName + '"></slot></div>';
            _shadowRoot.appendChild(div1);

            that_.appendChild(div);

            var mapcanvas_divstr = _shadowRoot.getElementById('oView_' + widgetName);

            Ar.push({
                'id': widgetName,
                'div': mapcanvas_divstr
            });
            console.log(Ar);
        }

        that_._renderExportButton();

        sap.ui.getCore().attachInit(function() {
            "use strict";

            //### Controller ###
            sap.ui.define([
                "jquery.sap.global",
                "sap/ui/core/mvc/Controller",
                "sap/ui/model/json/JSONModel",
                "sap/m/MessageToast",
                "sap/ui/core/library",
                "sap/ui/core/Core",
                'sap/ui/model/Filter',
                'sap/m/library',
                'sap/m/MessageBox',
                'sap/ui/unified/DateRange',
                'sap/ui/core/format/DateFormat',
                "sap/ui/model/BindingMode",
                "sap/ui/unified/CalendarLegendItem",
                "sap/ui/unified/DateTypeRange",
                "sap/ui/unified/library"
            ], function(jQuery, Controller, JSONModel, MessageToast, coreLibrary, Core, Filter, mobileLibrary, MessageBox, DateRange, DateFormat, BindingMode, CalendarLegendItem, DateTypeRange, unifiedLibrary) {
                "use strict";

                var CalendarDayType = unifiedLibrary.CalendarDayType;

                return Controller.extend("myView.Template", {

                    onInit: function() {
                        console.log("-------oninit--------");
                        console.log("widgetName:" + that.widgetName);

                        if (that._firstConnection === 0) {
                            that._firstConnection = 1;
                            var oData = {
                                "value": parseInt(that._export_settings.subtitle)
                            };
                            var oModel = new JSONModel(oData);
                            this.getView().setModel(oModel, that.widgetName);
                        } else {
                            console.log("After-------------");
                            console.log(that.widgetName);
                            MessageToast.show(message.split(":")[1]);
                        }
                    },

                    handleLiveChange: function(oEvent) {
                        var oTextArea = oEvent.getSource(),
                            iValueLength = oTextArea.getValue().length,
                            iMaxLength = oTextArea.getMaxLength(),
                            sState = iValueLength > iMaxLength ? "Error" : "None";

                        _input = oTextArea.getValue();
                        console.log("_input:" + _input);
                        that._firePropertiesChanged();
                        this.settings = {};
                        this.settings.input = "";
                        that.dispatchEvent(new CustomEvent("onStart", {
                            detail: {
                                settings: this.settings
                            }
                        }));
                        oTextArea.setValueState(sState);

                        var message = new Paho.MQTT.Message("sac:" + _input);
                        message.destinationName = "events"; 
                        console.log("SEND ON " + message.destinationName + " PAYLOAD " + _input);
                        client.send(message);
                    }
                });
            });

            console.log("widgetName Final:" + widgetName);
            var foundIndex = Ar.findIndex(x => x.id == widgetName);
            var divfinal = Ar[foundIndex].div;
            console.log(divfinal);

            //### THE APP: place the XMLView somewhere into DOM ###
            var oView = sap.ui.xmlview({
                viewContent: jQuery(divfinal).html(),
            });

            oView.placeAt(div);
        });
    }

    function createGuid() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
            let r = Math.random() * 16 | 0,
                v = c === "x" ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }    

    function loadScript(src, shadowRoot) {
        return new Promise(function(resolve, reject) {
            let script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                console.log("Load: " + src);
                resolve(script);
            }
            script.onerror = () => reject(new Error(`Script load error for ${src}`));
            shadowRoot.appendChild(script)
        });
    }
})();
