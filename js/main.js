// respeaker js
var respeaker = {};


respeaker.home = new Vue({
    el: '#home',
    data: {
        token: '',
        ws: '',
        wsUrl: "ws://192.168.100.1/websocket/",
        ws_token: '',
        ws_res: {},

        adminLoginState: false,
        isCheckUpdate: false, // check update state

        currentVersion: '',
        lastestVersion: '',

        isOpenUpdate: false,
        isShowMessage: true,
        systemUpdateMessage: 'Checking',
        isDownloadProgress: false,
        isRetryDownload: false,
        isDownLoadingFirmwareDone: false,
        isUpgradeCountingDown: false,
        upgradingHint: 60,
        downloadMessage: '',
        md5status: '',
        isMD5Pass: false,
        interval: null,
    },
    ready: function() {
        var self = this;
        if (!location.host.startsWith('localhost') && !location.host.startsWith('127.0.0.1')) {
            self.wsUrl = "ws://" + location.host + "/websocket/";
        }
        self.ws = new WebSocket(self.wsUrl);

        // console.log(this.ws)
        self.ws.onopen = function(message) {
            console.log("connect");
            self.ws.send('{"jsonrpc":"2.0","id":0,"method":"challenge","params":[]}')
        };

        self.ws.onmessage = function(message) {
            var data = JSON.parse(message.data);
            self.ws_res = message;

            if (data.id == 0) {
                self.ws_token = data.result.token;
                self.tokenSHA(self.ws_token, 'root');
            } else if (data.id == 1) {
                // if login failed
                if (data.error && data.error.code == 'EACCESS') {
                    console.log('the token is:' + self.ws_token);
                    return false;
                }

                self.token = data.result.success;

                console.log('Get system information');
                self.ws.send('{"jsonrpc":"2.0","id":12,"method":"call","params":["' + self.token + '","/system","board",{}]}');

                console.log('Check update');
                self.ws.send('{"jsonrpc":"2.0","id":13,"method":"call","params":["' + self.token + '","/system","check",{}]}');

                adminLogin(data);
            } else if (data.id == 12) {
                // Get system information
                self.currentVersion = data.result.release.revision;

                console.log('Current system version:' + self.currentVersion);
            } else if (data.id == 13) {
                // Check update
                if (data.result.results[1].status == 'skiped' || data.result.results[1].status == 'error' || data.result.results[1].status == 'checking') {
                    self.systemUpdateMessage = "Current version " + data.result.results[1].current_version + " is the latest.";
                    return;
                } else if (data.result.results[1].status == 'downloading') {
                    console.log('Downloading firmware');
                    self.interval = setInterval(function() {
                        // get progress
                        self.ws.send('{"jsonrpc":"2.0","id":15,"method":"call","params":["' + self.token + '","/system","progress",{}]}');
                    }, 1000);

                    self.isShowMessage = false;
                    self.downloadMessage = 'Checking ...';
                    self.isDownloadProgress = true;
                    self.isOpenUpdate = true;
                } else if (data.result.results[1].status == 'ok') {
                    self.currentVersion = data.result.results[1].current_version;
                    self.lastestVersion = data.result.results[0].lastest_version;

                    self.isShowMessage = false;
                    self.isOpenUpdate = true;
                }

            } else if (data.id == 14) {
                if (JSON.parse(message.data).result.results == 'done') {
                    console.log('Download started');
                    self.interval = setInterval(function() {
                        // get progress
                        self.ws.send('{"jsonrpc":"2.0","id":15,"method":"call","params":["' + self.token + '","/system","progress",{}]}');
                    }, 1000);
                } else {

                }
            } else if (data.id == 15) {
                // Download progress
                if (data.hasOwnProperty('result')) {
                    if (data.result.results[0].status == 'downloading') {
                        var progress = '0';
                        if (data.result.results[0].progress) {
                            progress = data.result.results[0].progress;
                        }
                        self.downloadMessage = 'Downloading ' + progress + '%';
                        console.log('progress:' + self.downloadMessage)
                    } else if (data.result.results[0].status == 'ok') {
                        self.downloadMessage = 'Downloaded ' + data.result.results[0].progress + '%';
                        clearInterval(self.interval);
                        self.isOpenUpdate = true;
                        self.isDownloadProgress = false;
                        self.isDownLoadingFirmwareDone = true;
                    } else {
                        self.downloadMessage = 'Downloaded ' + data.result.results[0].progress + '%, but failed!';
                        clearInterval(self.interval);
                        self.isRetryDownload = true;
                    }
                } else {
                    // ignore
                    //clearInterval(self.interval);
                    //self.downloadMessage = 'Unkown';
                }

            } else if (data.id == 16) {
                // Start upgrading
                self.isDownloadProgress = false;
                self.isDownLoadingFirmwareDone = false;
                self.isUpgradeCountingDown = true;

                self.upgradingHint = 60
                self.interval = setInterval(function() {
                    self.upgradingHint -= 1;
                    if (self.upgradingHint == 1) {
                        clearInterval(self.interval);
                        location.reload();
                    }
                }, 1000);
            }
        }

        self.ws.onerror = function(message) {
            console.log(message);
        }

        self.ws.onclose = function(message) {
            console.log(message);
        }

        function adminLogin(data) {
            var token = data.result.success;
            if (token != null) {
                self.ws.send('{"jsonrpc": "2.0","id": 3,"method": "call","params": ["' + token + '","/juci/rewifi","scan",{"device": "ra0"}]}');
            }
        }
    },
    methods: {
        tokenSHA: function(the_token, psw) {
            console.log(the_token)
                // var token = JSON.parse(message.data).result.token;
            var token = the_token;
            var sha = new jsSHA("SHA-1", "TEXT");
            var pwhash = new jsSHA("SHA-1", "TEXT");

            pwhash.update(psw);
            sha.update(token);
            sha.update(pwhash.getHash("HEX"));

            //console.log(sha.getHash("HEX"));
            var str = sha.getHash("HEX");
            // this.token =sha.getHash("HEX");

            console.log("login");
            this.ws.send('{"jsonrpc":"2.0","id":1,"method":"login","params":["admin","' + str + '"]}');
        },

        checkSystemUpdate: function() {
            // update version
            this.isShowMessage = true;
            this.isDownloadProgress = false;
            this.isRetryDownload = false;
            this.isDownLoadingFirmwareDone = false;
            this.systemUpdateMessage = "Checking ...";
            this.isOpenUpdate = true;
            this.ws.send('{"jsonrpc":"2.0","id":13,"method":"call","params":["' + this.token + '","/system","check",{}]}');
        },

        hideSystemUpdate: function() {
            // update version
            this.isRetryDownload = false;
            this.isOpenUpdate = false;
        },

        updateFirmware: function() {
            // update version
            this.isRetryDownload = false;
            this.isDownloadProgress = true;
            this.ws.send('{"jsonrpc": "2.0","id": 14,"method":"call","params": ["' + this.token + '","/system","download",{}] }');
        },

        // get version differences count
        getVerCalculation: function(ver_now, ver_new) {
            var count_1 = ver_now.substr(1).replace(/\./g, ''),
                count_2 = ver_new.substr(1).replace(/\./g, '');
            return (Number(count_2) - Number(count_1));
        },

        skipFirmware: function() {
            console.log('skip this version ');
            this.isOpenUpdate = false;
            var count = this.getVerCalculation(this.currentVersion, this.latestVersion),
                skip_param = '{"jsonrpc":"2.0","id":12,"method":"call","params":["' + this.token + '","/system","setskip",{"value":"' + count + '"}]}';
            console.log(count);
            // console.log(skip_param);
            this.ws.send(skip_param);
            // skip version done
        },

        updateNow: function() {
            var final_update_param = '{"jsonrpc":"2.0","id":16,"method":"call","params":["' + this.token + '","/system","upgrade",{}]}';
            this.ws.send(final_update_param);
        }
    }
});