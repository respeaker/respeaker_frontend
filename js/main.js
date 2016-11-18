// respeaker js
var respeaker = {};


respeaker.home = new Vue({
    el: '#home',
    data: {
        token: '',
        ws: '',
        ws_token: '',
        ws_res: {},

        // now choose option
        nowChooseItem: {},

        // state flag
        isNormalList: true,
        adminLoginState: false,
        isCheckUpdate: false,               // check update state

        // updata state
        skipCount: 0,
        thisVersion: '',
        latestVersion: '',
        latestVersionMd5: '',
        isOpenUpdate: false,
        isDownLoadingFirmware: false,
        isDownLoadingFirmwareDone: false,
        isUpgradeCountingDown: false,
        downloadProgress: '',
        isMD5Pass: false,
        interval: null,
    },
    ready: function () {
        var _self = this;
        //var wsUrl = "ws://"+location.host+"/websocket/";
        var wsUrl = "ws://192.168.100.1/websocket/";
        _self.ws = new WebSocket(wsUrl);

        // console.log(this.ws)
        _self.ws.onopen = function(res){
            console.log("connect");
            _self.ws.send('{"jsonrpc":"2.0","id":0,"method":"challenge","params":[]}')
        };


        function checkUpgrade() {
            var delta = _self.getVerCalculation(_self.thisVersion, _self.latestVersion);

            // thisVersion     =  'v0.9.98';
            // latestVersion   =  'v1.0.08';

            console.log('Current version:' + _self.thisVersion)
            console.log('Latest version:' + _self.latestVersion)

            console.log('Skip ' + _self.skipCount + ' version(s)')
            console.log(delta)

            if (delta > Number(_self.skipCount) ) {
                console.log('Update available');
                _self.isOpenUpdate = true;
                return true;
            } else{
                console.log('No update');
            }

            return false;
        }



        _self.ws.onmessage = function(res){

            _self.ws_res = res;

                if (JSON.parse(res.data).id == 0){
                    _self.ws_token = JSON.parse(res.data).result.token;
                    _self.tokenSHA(_self.ws_token, 'root');
                }else if (JSON.parse(res.data).id == 1){

                    // if admin login
                    if(JSON.parse(res.data).error && JSON.parse(res.data).error.code == 'EACCESS') {
                        isNormalList = !isNormalList;
                        console.log('the token is:'+ws_token);
                        return false;
                    }


                    // from admin login
                    if(_self.adminLoginState == true) {
                        _self.isNormalList = true;
                    }

                    _self.token = JSON.parse(res.data).result.success;


                   _self.ws.send('{"jsonrpc":"2.0","id":12,"method":"call","params":["'+_self.token+'","/system","board",{}]}');

                   _self.ws.send('{"jsonrpc":"2.0","id":18,"method":"call","params":["'+_self.token+'","/system","getskip",{}]}');

                    console.log('Check update');

                    $.ajax({
                            //url: 'https://s3-us-west-2.amazonaws.com/respeaker.io/firmware/version.json',
                            url: 'http://192.168.4.48:8000/version.json',
                            timeout: 9000,
                            dataType: 'jsonp',
                            jsonpCallback: 'checkVersion',
                            success: function(data) {
                                console.log(data);
                                _self.latestVersion  = data.result.version;
                                _self.latestVersionMd5 = data.result.md5sum;
                                console.log('Latest version:' + _self.latestVersion);

                                checkUpgrade();
                            },
                        });

                    adminLogin(res);
                }


                if(JSON.parse(res.data).id == 12) {
                    // Get current version
                    _self.thisVersion = JSON.parse(res.data).result.release.revision;

                    console.log('Current system version:' + _self.thisVersion);
                }

                // 14 get progress
                if(JSON.parse(res.data).id == 14 ) {
                    console.log(res.data);
                    response = JSON.parse(res.data);
                    if (response.hasOwnProperty('result')) {
                        _self.downloadProgress = response.result.results[0].size;
                        console.log('progress:' + _self.downloadProgress)
                        if (_self.downloadProgress == '100%') {
                            clearInterval(_self.interval);

                            _self.isDownLoadingFirmware = false;
                            var check_md5_param = '{"jsonrpc": "2.0","id": 16,"method":"call","params": ["'+_self.token+'","/system","check",{}] }';
                           _self.ws.send(check_md5_param);
                            _self.isDownLoadingFirmwareDone = true;
                        }
                    }

                }

                // 15 download
                if(JSON.parse(res.data).id == 15 ) {
                    if( JSON.parse(res.data).result.results == 'done' ) {
                        console.log('Download started');
                        _self.interval = setInterval(function() {
                            // get progress
                            var get_progress_param = '{"jsonrpc":"2.0","id":14,"method":"call","params":["'+_self.token+'","/system","progress",{}]}';
                            _self.ws.send(get_progress_param);
                        }, 1000);
                    } else {

                    }
                }

                // 16 check md5
                if(JSON.parse(res.data).id == 16 ) {
                    // console.log(JSON.parse(res.data).result.results)
                    var download_md5  = JSON.parse(res.data).result.results;
                    console.log(download_md5);
                    console.log(_self.latestVersionMd5);
                    if( download_md5 == _self.latestVersionMd5 ){
                        _self.isMD5Pass = true;
                    }
                }

                // 18 check skip
                if(JSON.parse(res.data).id == 18){
                    _self.skipCount = JSON.parse(res.data).result.results;
                    console.log('skipCount is '+_self.skipCount);


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
    },
    methods: {
        tokenSHA: function (the_token, psw){
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
            this.ws.send(final_update_param);
        }
    }
});
