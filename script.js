class PeerManager {
    constructor() {
        this.peer = new Peer()
        this.conn = null

        this.peer.on('open', id => {
            console.log('My peer ID:', id)
        })

        this.peer.on('connection', conn => {
            this.setupConnection(conn)
        })
    }

    connectTo(id) {
        const conn = this.peer.connect(id)
        this.setupConnection(conn)
    }

    setupConnection(conn) {
        this.conn = conn

        conn.on('open', () => {
            console.log('Connected to', conn.peer)
        })

        conn.on('data', data => {
            console.log('Received:', data)
        })

        conn.on('close', () => {
            this.conn = null
        })
    }

    send(data) {
        if (this.conn?.open) this.conn.send(data)
    }
}

window.peerManager = new PeerManager()

class CyrusDialog {
    constructor(rootId) {
        this.root = document.getElementById(rootId)
        this.methodAppContainer = null
        this.activeApp = null
        this.apps = {}
    }

    registerApp(key, appInstance) {
        this.apps[key] = appInstance
    }

    show() {
        this.root.innerHTML = this.template()
        this.methodAppContainer = this.root.querySelector('.methodApp')
        this.bind()
    }

    close() {
        this.root.innerHTML = ''
        this.activeApp = null
    }

    bind() {
        this.root.querySelectorAll('.connectionMethod').forEach(el => {
            el.addEventListener('click', () => {
                const key = el.dataset.key
                this.loadApp(key)
            })
        })
    }

    loadApp(key) {
        if (this.activeApp && this.activeApp.destroy) {
            this.activeApp.destroy()
        }

        const app = this.apps[key]
        if (!app) return

        this.methodAppContainer.innerHTML = app.html()
        app.mount(this.methodAppContainer)

        requestAnimationFrame(() => {
            if (app.onLoad) app.onLoad()
        })

        this.activeApp = app
    }

    template() {
        return `
        <div class="cryus_dialog">
            <div class="cyrus_inner">

        <div class="weareconnected">
        <div class="icn" style="font-size: 6em; text-shadow: 0 0 50px #ffffff, 0 0 8px #ffffff">done_all</div>
        <h1>We are connected!</h1>
        <small class="cyrus">Cyrus Wizard closes in 3...</small>
        </div>
                <div class="header">
                    <h1>First, let's connect these together</h1>
                    <p>Both your devices must be on the same network.</p>
                </div>
                <div class="cyrus_sides">
                    <div class="side">
                        <div class="waysForConnection">
                        <div class="label">Smart PIN (LAN only)</div>

                            <div class="connectionMethod" data-key="spin-generate">
                                <div class="icn">wand_stars</div>
                                <div class="p">Generate a smart PIN</div>
                                <div class="continueBtn icn">chevron_forward</div>
                            </div>
                            <div class="connectionMethod" data-key="spin-connect">
                                <div class="icn">password</div>
                                <div class="p">Connect with a smart PIN</div>
                                <div class="continueBtn icn">chevron_forward</div>
                            </div>

                            <div class="label">QR Code</div>

                            <div class="connectionMethod" data-key="qr-generate">
                                <div class="icn">qr_code</div>
                                <div class="p">Generate a QR code</div>
                                <div class="continueBtn icn">chevron_forward</div>
                            </div>

                            <div class="connectionMethod" data-key="qr-scan">
                                <div class="icn">qr_code_scanner</div>
                                <div class="p">Scan a QR code</div>
                                <div class="continueBtn icn">chevron_forward</div>
                            </div>

                            <div class="label">Wireless</div>

                            <div class="connectionMethod disabled" data-key="ble">
                                <div class="icn">bluetooth</div>
                                <div class="p">Connect using bluetooth (BLE)</div>
                                <div class="continueBtn icn">chevron_forward</div>
                            </div>

                            <div class="connectionMethod disabled" data-key="sound">
                                <div class="icn">waves</div>
                                <div class="p">Connect using sound waves</div>
                                <div class="continueBtn icn">chevron_forward</div>
                            </div>

                            <div class="label">Manual</div>

                            <div class="connectionMethod" data-key="manual">
                                <div class="icn">content_paste</div>
                                <div class="p">Connect manually by pasting</div>
                                <div class="continueBtn icn">chevron_forward</div>
                            </div>

                            <div class="connectionMethod disabled" data-key="server">
                                <div class="icn">hub</div>
                                <div class="p">Connect using a public routing server</div>
                                <div class="continueBtn icn">chevron_forward</div>
                            </div>
                        </div>
                    </div>

                    <div class="side">
                        <div class="methodApp">
                        <div class="funside">
                            <div class="icn">android_wifi_3_bar</div>
                            <span>You can continue to the application once devices are connected.</span>
                        </div></div>
                    </div>
                </div>
            </div>
        </div>`
    }
}

class QRGenerateApp {
    html() {
        return `
        <div class="app qr-generate">
            <div class="label">Scan this QR Code:</div>
            <div class="output"></div>
        </div>
        <style>
        .output {
        width:fit-content;
        background-color: white;
        padding: 1em;
        border-radius: 1em;
        }
        </style>
        `
    }

    mount(container) {
        this.container = container
    }

    onLoad() {
        window.peerManager.peer.on('open', () => {
            this.generate()
        })
    }

    generate() {
        const id = window.peerManager.peer.id

        new QRCode(this.container.querySelector('.output'), {
            text: id,
            width: 200,
            height: 200
        });
    }

    destroy() { }
}
class QRScanApp {
    html() {
        return `
        <div class="app qr-scan">
            <div id="qrScanner"></div>
        </div>
        `
    }

    mount(container) {
        this.container = container
        this.scanner = null
    }

    onLoad() {
        this.scanner = new Html5Qrcode("qrScanner")

        this.scanner.start(
            { facingMode: "environment" },
            { fps: 1, qrbox: 250 },
            (decodedText) => {
                window.peerManager.connectTo(decodedText)
                this.destroy()
            },
            (errorMessage) => {
                console.log(errorMessage)
            }
        )
    }

    async destroy() {
        if (this.scanner) {
            try {
                await this.scanner.stop()
                await this.scanner.clear()
            } catch (e) { }
            this.scanner = null
        }
    }
}

class ManualApp {
    html() {
        return `
        <div class="app manual-app">
            <div class="label">Manual Connect</div>
            <textarea placeholder="Paste token"></textarea>
            <button onclick="ManualApp_connect()">Connect</button>
            <div class="status"></div>
        </div>`
    }

    mount(container) {
        this.container = container
        window.ManualApp_connect = this.connect.bind(this)
    }

    connect() {
        const val = this.container.querySelector('textarea').value.trim()

        if (!val) {
            this.container.querySelector('.status').innerHTML = 'Invalid ID'
            return
        }

        window.peerManager.connectTo(val)
        this.container.querySelector('.status').innerHTML = 'Connecting...'
    }

    destroy() {
        delete window.ManualApp_connect
    }
}

async function deriveId(code) {
    const enc = new TextEncoder().encode(code.toUpperCase())
    const hash = await crypto.subtle.digest("SHA-256", enc)
    const bytes = Array.from(new Uint8Array(hash))
    return bytes.slice(0, 16).map(b => b.toString(16).padStart(2,"0")).join("")
}

function randomCode(len = 8) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let out = ""
    for (let i = 0; i < len; i++)
        out += chars[Math.floor(Math.random() * chars.length)]
    return out
}

class SPinGenerateApp {
    html() {
        return `
        <div class="app spin-generate">
            <div class="label">Here's your Smart PIN:</div>
            <div class="code" id="roomCode"></div>
        </div>
        `
    }

    mount(container) {
        this.container = container
    }

    async onLoad() {
        const code = randomCode(8)
        this.code = code
        this.container.querySelector("#roomCode").textContent = code

        const id = await deriveId(code)

        if (window.peerManager.peer?.destroyed === false)
            window.peerManager.peer.destroy()

        window.peerManager.peer = new Peer(id, {
            config: { iceServers: [] }
        })

        window.peerManager.peer.on("connection", conn => {
            window.peerManager.setupConnection(conn)
        })
    }
}

class SPinConnectApp {
    html() {
        return `
        <div class="app spin-connect">
            <div class="label">Enter your Smart PIN:</div>
            <input class="pinput" id="roomInput" maxlength="8" placeholder="00000000"/>
            <button id="joinBtn">Connect</button>
        </div>
        `
    }

    mount(container) {
        this.container = container
    }

    onLoad() {
        const input = this.container.querySelector("#roomInput")
        const btn = this.container.querySelector("#joinBtn")

        btn.onclick = async () => {
            const code = input.value.trim().toUpperCase()
            if (code.length !== 8) return

            const id = await deriveId(code)

            const conn = window.peerManager.peer.connect(id)
            window.peerManager.setupConnection(conn)
        }
    }
}

const dialog = new CyrusDialog('cyrus-root')

dialog.registerApp('qr-generate', new QRGenerateApp())
dialog.registerApp('manual', new ManualApp())
dialog.registerApp('qr-scan', new QRScanApp())
dialog.registerApp('spin-generate', new SPinGenerateApp())
dialog.registerApp('spin-connect', new SPinConnectApp())

dialog.show()