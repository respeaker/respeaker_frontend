// respeaker js
var respeaker = {};

// filter wifi single count
Vue.filter('formatSingle', function(value){
    // 将wifi信号分三个级别，除以30向上取整，显示对应的信号图标
    return Math.ceil(value/30)
})

respeaker.login = new Vue({
    el: '#rp-login',
    data: {
        ssid_name : 'Choose your wifi',     //wifi名
        ssid_psw: '',                       //wifi密码
        isShowList: false,                  //是否打开wifi列表
        ssidList: {},                       //wifi single list
        token: '',
        ws: '',
        ws_token: '',
        ws_res: {},

        // now choose option
        nowChooseItem: {},

        // state flag
        isNormalList: true,
        adminLoginState: false,
        isSearchWifiDone: false,            // wifi search
        isConnectingWifi: false,            // wifi connecting
        isConnectingWifiSuccess: false,     // wifi connecting success
        isCheckUpdate: false,               // check update state

        // updata state
        skipCount: 0,
        thisVersion: '',
        latestVersion: '',
        latestVersionMd5: '',
        isOpenUpdate: false,
        isDownLoadingFirmware: false,
        isDownLoadingFirmwareDone: false,
        downloadProgress: '',
        isMD5Pass: false,

    },
    ready: function () {

        if( typeof(returnVersion) == 'function'){
            this.latestVersion      = JSON.parse(returnVersion()).result.version;
            this.latestVersionMd5   = JSON.parse(returnVersion()).result.md5sum;
        }

        var _self = this;
        var wsUrl = "ws://"+location.host+"/websocket/";
        // var wsUrl = "ws://192.168.100.1/websocket/";
        _self.ws = new WebSocket(wsUrl);

        // console.log(this.ws)
        this.ws.onopen = function(res){
            console.log("connect");
            _self.ws.send('{"jsonrpc":"2.0","id":0,"method":"challenge","params":[]}')
        };

        this.ws.onmessage = function(res){

            _self.ws_res = res;

                if (JSON.parse(res.data).id == 0){
                    _self.ws_token = JSON.parse(res.data).result.token;
                    _self.tokenSHA(_self.ws_token, 'root');
                }else if (JSON.parse(res.data).id == 1){

                    // if admin login
                    if(JSON.parse(res.data).error && JSON.parse(res.data).error.code == 'EACCESS') {
                        _self.isNormalList = !_self.isNormalList;
                        console.log('the token is:'+_self.ws_token);
                        return false;
                    }

                    // from admin login
                    if(_self.adminLoginState == true) {
                        _self.isNormalList = true;
                    }

                    if(!_self.isCheckUpdate) {
                        checkUpgrade(res);
                        _self.isCheckUpdate = true;
                    }

                    _self.token = JSON.parse(res.data).result.success;

                    adminLogin(res);

                    // 自定义成功失败跳转

                }else if(JSON.parse(res.data).id == 4){

                    // connect success
                    console.log(JSON.parse(res.data).result);

                    // connect success
                    if(JSON.parse(res.data).result.result == 'success') {
                        // 成功连接wifi
                        _self.isConnectingWifi = false;
                        _self.isConnectingWifiSuccess = true;
                        // clear wifi portal
                        _self.ws.send('{"jsonrpc": "2.0","id": 12,"method": "call","params": ["'+_self.token+'","/juci/rewifi","clear",{"flag": 0}]}');
                        // location
                        setTimeout(function(){
                            window.location.href="/start.html";
                        }, 2000);
                    }

                    // connect failed
                    if(JSON.parse(res.data).result.result == 'failed') {
                        _self.isConnectingWifi = false;
                        alert('connect error');
                    }

                    // location
                }else if(JSON.parse(res.data).id == 99){
                    // 升级版本

                }else{
                    // console.log(JSON.parse(res.data).result);
                    // showWifi(res);
                }

                if(JSON.parse(res.data).id == 3) {
                    showWifi(res);
                }

                if(JSON.parse(res.data).id == 12) {

                    console.log('版本升级控制');

                    // get now version
                    _self.thisVersion = JSON.parse(res.data).result.release.revision;

                    // console.log(_self.thisVersion)
                    // console.log(_self.latestVersion);
                    // console.log(_self.latestVersionMd5);

                    // 发送跳过版本比较
                    var checkSkip = '{"jsonrpc":"2.0","id":18,"method":"call","params":["'+_self.token+'","/system","getskip",{}]}'
                    _self.ws.send(checkSkip);

                    // test
                    // console.log('版本差异是：'+_self.getVerCalculation('v0.9.92', 'v1.0.00'))
                }

                // 14 get progress
                if(JSON.parse(res.data).id == 14 ) {
                    _self.downloadProgress = JSON.parse(res.data).result.results.size;
                }

                // 15 download done
                if(JSON.parse(res.data).id == 15 ) {
                    // download done
                    if( JSON.parse(res.data).result.results == 'done' ) {
                        console.log('下载完成');
                        _self.isDownLoadingFirmware = false;
                        var check_md5_param = '{"jsonrpc": "2.0","id": 16,"method":"call","params": ["'+_self.token+'","/system","check",{}] }';
                        _self.ws.send(check_md5_param);
                        _self.isDownLoadingFirmwareDone = true;
                        // 比较md5
                    }
                }

                // 16 check md5
                if(JSON.parse(res.data).id == 16 ) {
                    // console.log(JSON.parse(res.data).result.results)
                    var download_md5  = JSON.parse(res.data).result.results;
                    console.log(download_md5);
                    console.log(_self.latestVersionMd5);
                    if( download_md5 == _self.latestVersionMd5 ){
                        // 成功 执行最后升级
                        // console.log('比对一致');
                        this.isMD5Pass = true;
                    }
                }

                // 18 check skip
                if(JSON.parse(res.data).id == 18){
                    _self.skipCount = JSON.parse(res.data).result.results;
                    console.log('skipCount is '+_self.skipCount);

                    // 执行比较
                    var thisVerCount = _self.thisVersion.substr(1).replace(/\./g, ''),
                    laststVerCount   = _self.latestVersion.substr(1).replace(/\./g, '');

                    // 模拟数据
                    // _self.thisVersion     =  'v0.9.98';
                    // _self.latestVersion   =  'v1.0.08';

                    console.log(_self.thisVersion)
                    console.log(_self.skipCount)
                    console.log(_self.latestVersion)
                    // console.log((Number(_self.thisVersion)+ Number(_self.skipCount)) <  Number(_self.latestVersion))

                    console.log(_self.getVerCalculation(_self.thisVersion, _self.latestVersion))

                    // if( (Number(_self.thisVersion)+ Number(_self.skipCount)) <  Number(_self.latestVersion)) {
                    if( _self.getVerCalculation(_self.thisVersion, _self.latestVersion) > Number(_self.skipCount) ) {
                        console.log('弹窗提示用户升级');
                        _self.isOpenUpdate = true;
                    }else{
                        console.log('no update');
                    }
                }



            }

            this.ws.onerror = function(res){
                console.log(res);
            }

            this.ws.onclose = function(res){
                console.log(res);
            }

            function adminLogin(res){
                var token = JSON.parse(res.data).result.success;
                if(token != null){
                    _self.ws.send('{"jsonrpc": "2.0","id": 3,"method": "call","params": ["'+token+'","/juci/rewifi","scan",{"device": "ra0"}]}');
                }
            }

            function showWifi(res){
                // var wifilist = JSON.parse(res.data).result.results;

                // for (wifi in wifilist){

                //     ssidList:['{"id":wifilist[wifi].ssid}'];

                //     console.log(wifilist[wifi].ssid);

                // }
                //_self.ssidList = res.data.results;

                // console.log('new data');
                // console.log(JSON.parse(res.data));

                 _self.ssidList = JSON.parse(res.data).result.results;
                 _self.isSearchWifiDone = true;

            }

            function checkUpgrade(res) {
                console.log('开始执行更新检查');
                var token = JSON.parse(res.data).result.success;
                _self.ws.send('{"jsonrpc":"2.0","id":12,"method":"call","params":["'+token+'","/system","board",{}]}');
            }

            // close list
            $('body').on("click", '.j-rp-list', function(e) {
                var $target = $(e.target);
                if ($target.closest(".rp-list").length == 0) {
                    _self.isShowList = false;
                }
            })

            // login admin account
            $('body').on('click', '.j-fill-account', function(){
                if( _self.ssid_psw == '') {
                    alert()
                }
                _self.tokenSHA(_self.ws_token, _self.ssid_psw);
                _self.adminLoginState = true;
                return false;
            });

    },
    methods: {
        tokenSHA: function(the_token, psw){
            console.log(the_token)
            // var token = JSON.parse(res.data).result.token;
            var token = the_token;
            var sha = new jsSHA("SHA-1", "TEXT");
            var pwhash = new jsSHA("SHA-1", "TEXT");

            pwhash.update(psw);
            sha.update(token);
            sha.update(pwhash.getHash("HEX"));

            //console.log(sha.getHash("HEX"));
            var str = sha.getHash("HEX");
            // this.token =sha.getHash("HEX");

            console.log("admin login");
            this.ws.send('{"jsonrpc":"2.0","id":1,"method":"login","params":["admin","'+ str +'"]}');
        },

        // 显示列表
        showSSIDList: function(){
            this.isShowList = true;
            var _self = this;
            // var wsUrl = "ws://192.168.6.146/websocket/";
            // var ws = new WebSocket(wsUrl);

            console.log( _self.ws)

            _self.ws.onopen = function(res){
                console.log("connect");
                _self.ws.send('{"jsonrpc":"2.0","id":0,"method":"challenge","params":[]}')
            };


        },
        // 选择wifi
        chooseSSID: function(item){
            this.nowChooseItem = item;
            console.log(item)
            this.ssid_name = event.target.innerText.trim();
            this.isShowList = false;
        },
        //clearText
        clearText: function(){
            this.ssid_psw = '';
        },

        // 连接 wifi
        connectWifi: function(){
            if(this.ssid_psw == '') {
                alert('Please enter the wifi password');
                return false;
            }
            this.isConnectingWifi = true;
            var connect_param = '{"jsonrpc": "2.0","id": 4,"method": "call","params": ["'+this.token+'","/juci/rewifi","connect",{"apname":"ra0","staname":"apcli0","ssid":"'+this.nowChooseItem.ssid+'","passwd":"'+this.ssid_psw+'", "channel":"'+this.nowChooseItem.channel+'", "security":"'+this.nowChooseItem.security+'", "bssid":"'+this.nowChooseItem.bssid+'" }]}';
            this.ws.send(connect_param);

            // console.log(this.ws_res)
            // console.log(this.ssid_psw)
        },

        closeWifiList: function(){
            this.isShowList = !this.isShowList;
        },

        // get version differences count
        getVerCalculation: function (ver_now, ver_new) {
            var count_1 = ver_now.substr(1).replace(/\./g, ''),
                count_2 = ver_new.substr(1).replace(/\./g, '');
                return (Number(count_2) - Number(count_1));
        },

        updateFirmware: function(){
            // console.log(this.ws_res);
            // console.log(this.ws);

            // update version
            this.isDownLoadingFirmware = true;
            var dl_param  = '{"jsonrpc": "2.0","id": 15,"method":"call","params": ["'+this.token+'","/system","download",{}] }';
            this.ws.send(dl_param);

            // get progress
            var get_progress_param = '{"jsonrpc":"2.0","id":14,"method":"call","params":["'+this.token+'","/system","progress",{}]}';
            this.ws.send(get_progress_param);
        },

        skipFirmware: function(){
            console.log('skip this version ');
            this.isOpenUpdate = false;
            var count = this.getVerCalculation(this.thisVersion, this.latestVersion),
            skip_param = '{"jsonrpc":"2.0","id":12,"method":"call","params":["'+this.token+'","/system","setskip",{"value":"'+count+'"}]}';
            console.log(count);
            // console.log(skip_param);
            this.ws.send(skip_param);
            // skip version done
        },

        updateNow: function(){
            var final_update_param = '{"jsonrpc":"2.0","id":17,"method":"call","params":["'+this.token+'","/system","upgrade",{}]}';
            _self.ws.send(final_update_param);
        },

        closeWifiConnect: function(){
            this.isConnectingWifi = false;
        }

    }
});
