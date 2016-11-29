// respeaker js
var respeaker = {};

// filter Wi-Fi single count
Vue.filter('formatSingle', function(value) {
    // 3 Wi-Fi signal level
    return Math.ceil(value / 30)
})

respeaker.login = new Vue({
    el: '#rp-login',
    data: {
        ssid_name: 'Choose your Wi-Fi',
        ssid_psw: '',
        isShowList: false,
        ssidList: {},
        token: '',
        ws: '',
        wsUrl: "ws://192.168.100.1/websocket/",
        wsToken: '',
        wsResponse: {},

        // now choose option
        currentChooseItem: {},

        // state flag
        isNormalList: true,
        adminLoginState: false,
        isSearchWifiDone: false, // wifi search
        isConnectingWifi: false, // wifi connecting
        isConnectingWifiSuccess: false, // wifi connecting success
        isCheckUpdate: false, // check update state

        isShowMessage: false,
        message: '',
    },
    ready: function() {
        var self = this;
        if (!location.host.startsWith('localhost') && !location.host.startsWith('127.0.0.1')) {
            self.wsUrl = "ws://" + location.host + "/websocket/";
        }
        var run = function() {
            self.ws = new WebSocket(self.wsUrl);
            self.ws.onopen = function(message) {
                console.log("connect");
                self.ws.send('{"jsonrpc":"2.0","id":0,"method":"challenge","params":[]}')
            };

            self.ws.onmessage = function(message) {
                self.wsResponse = message;
                var data = JSON.parse(message.data);

                if (data.id == 0) {
                    self.wsToken = data.result.token;
                    self.tokenSHA(self.wsToken, 'root');
                } else if (data.id == 1) {

                    // if admin login
                    if (data.error && data.error.code == 'EACCESS') {
                        self.isNormalList = !self.isNormalList;
                        console.log('the token is:' + self.wsToken);
                        return false;
                    }


                    // from admin login
                    if (self.adminLoginState == true) {
                        self.isNormalList = true;
                    }

                    self.token = data.result.success;

                    adminLogin(data);
                } else if (data.id == 4) {
                    // connect success
                    console.log(data.result);

                    // connect success
                    if (data.result.result == 'success') {
                        // Wi-Fi is connected
                        self.isConnectingWifi = false;
                        self.isConnectingWifiSuccess = true;
                        // clear wifi portal
                        self.ws.send('{"jsonrpc": "2.0","id": 20,"method": "call","params": ["' + self.token + '","/juci/rewifi","clear",{"flag": 0}]}');

                        setTimeout(function() {
                            window.location.href = "/start/";
                        }, 2000);
                    } else if (data.result.result == 'failed') {
                        self.isConnectingWifi = false;
                        self.message = 'Failed to connect ' + self.currentChooseItem.ssid;
                        self.isShowMessage = true;
                    }
                } else if (data.id == 3) {
                    showWifi(data);
                }
            }

            self.ws.onerror = function(message) {
                console.log(message);
                setTimeout(function() {
                    run()
                }, 3000);
            }

            self.ws.onclose = function(message) {
                console.log(message);
                setTimeout(function() {
                    run()
                }, 1000);
            }

            function adminLogin(data) {
                var token = data.result.success;
                if (token != null) {
                    self.ws.send('{"jsonrpc": "2.0","id": 3,"method": "call","params": ["' + token + '","/juci/rewifi","scan",{"device": "ra0"}]}');
                }
            }

            function showWifi(data) {
                self.ssidList = data.result.results;
                self.isSearchWifiDone = true;
            }
        };

        run();

        // close list
        $('body').on("click", '.j-rp-list', function(e) {
            var $target = $(e.target);
            if ($target.closest(".rp-list").length == 0) {
                self.isShowList = false;
            }
        })

        // login admin account
        $('body').on('click', '.j-fill-account', function() {
            if (this.ssid_psw == '' && this.currentChooseItem.security != 'NONE') {
                self.message = 'Please enter the password';
                self.isShowMessage = true;
                return false;
            }
            self.tokenSHA(self.wsToken, self.ssid_psw);
            self.adminLoginState = true;
            return false;
        });

    },
    methods: {
        tokenSHA: function(the_token, psw) {
            console.log(the_token)
            var token = the_token;
            var sha = new jsSHA("SHA-1", "TEXT");
            var pwhash = new jsSHA("SHA-1", "TEXT");

            pwhash.update(psw);
            sha.update(token);
            sha.update(pwhash.getHash("HEX"));
            var str = sha.getHash("HEX");
            console.log("login automatically");
            this.ws.send('{"jsonrpc":"2.0","id":1,"method":"login","params":["admin","' + str + '"]}');
        },

        // show Wi-Fi SSID list
        showSSIDList: function() {
            this.isShowList = true;
            this.ws.send('{"jsonrpc": "2.0","id": 3,"method": "call","params": ["' + this.token + '","/juci/rewifi","scan",{"device": "ra0"}]}');
        },
        // choose Wi-Fi
        chooseSSID: function(item) {
            this.currentChooseItem = item;
            console.log(item)
            this.ssid_name = event.target.innerText.trim();
            this.isShowList = false;
        },
        //clearText
        clearText: function() {
            this.ssid_psw = '';
        },

        connectWifi: function() {
            if (this.ssid_psw == '' && this.currentChooseItem.security != 'NONE') {
                this.message = 'Please enter the password of ' + this.currentChooseItem.ssid;
                this.isShowMessage = true;
                return false;
            }
            this.isConnectingWifi = true;
            var connect_param = '{"jsonrpc": "2.0","id": 4,"method": "call","params": ["' + this.token + '","/juci/rewifi","connect",{"apname":"ra0","staname":"apcli0","ssid":"' + this.currentChooseItem.ssid + '","passwd":"' + this.ssid_psw + '", "channel":"' + this.currentChooseItem.channel + '", "security":"' + this.currentChooseItem.security + '", "bssid":"' + this.currentChooseItem.bssid + '" }]}';
            this.ws.send(connect_param);
        },

        closeMessage: function() {
            this.isShowMessage = false;
        },

        closeWifiList: function() {
            this.isShowList = !this.isShowList;
        },

        closeWifiConnect: function() {
            this.isConnectingWifi = false;
        }
    }
});
