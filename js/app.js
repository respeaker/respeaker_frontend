// respeaker js
var respeaker = {};

console.log('Start vue ……');


respeaker.login = new Vue({
    el: '#rp-login',
    data: {
        ssid_name : 'Choose your wifi',     //wifi名
        ssid_psw: '',                       //wifi密码
        isShowList: false,                  //是否打开wifi列表
        ssidList:[                          //wifi list
            { id: 'seeed' },
        ],
        token: '',
        ws: '',

    },
    ready: function (){
        var wsUrl = "ws://192.168.7.155/websocket/",
        _self = this;
        this.ws = new WebSocket(wsUrl);
        // console.log(this.ws)
        this.ws.onopen = function(res){
            console.log("connect");
            _self.ws.send('{"jsonrpc":"2.0","id":0,"method":"challenge","params":[]}')
        };

        this.ws.onmessage = function(res){

                if (JSON.parse(res.data).id == 0){
                    console.log(JSON.parse(res.data).result);
                    tokenSHA(res);
                    
                }else if (JSON.parse(res.data).id == 1){
                    console.log(JSON.parse(res.data).result);
                    adminLogin(res);
                    
                }else if(JSON.parse(res.data).id == 4){
                    //处理失败
                    
                }else{
                    console.log(JSON.parse(res.data).result);
                    showWifi(res);
                } 

            }

            this.ws.onerror = function(res){
                console.log(res);
            }

            this.ws.onclose = function(res){
                console.log(res);
            }

            function tokenSHA(res){

                var token = JSON.parse(res.data).result.token;
                var sha = new jsSHA("SHA-1", "TEXT");
                var pwhash = new jsSHA("SHA-1", "TEXT"); 

                pwhash.update("admin");
                sha.update(token);
                sha.update(pwhash.getHash("HEX"));

                //console.log(sha.getHash("HEX"));
                var str = sha.getHash("HEX");
                _self.token =sha.getHash("HEX");

                console.log("admin login");
                _self.ws.send('{"jsonrpc":"2.0","id":1,"method":"login","params":["admin","'+ str +'"]}');


            }

            function adminLogin(res){
                var token = JSON.parse(res.data).result.success;
                _self.token = JSON.parse(res.data).result.success;
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
                 _self.ssidList = JSON.parse(res.data).result.results;

            }

    },
    methods: {

        // 显示列表
        showSSIDList: function(){
            console.log("ssssss");
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
        chooseSSID: function(el){
            this.ssid_name = el.target.innerText.trim();
            this.isShowList = false;
        },
        //clearText
        clearText: function(){
            this.ssid_psw = '';
        },

        // 连接 wifi
        connectWifi: function(){
            if(this.ssid_psw.trim() == ''){
                alert('Please enter the wifi password');
                return false;
            }

            this.ws.send('{"jsonrpc": "2.0","id": 4,"method": "call","params": ["'+this.token+'","/juci/rewifi","connect",{"ifname":"ra0","staname":"apcli0","essid":"'+this.ssid_name+'","passwd":"'+this.ssid_psw+'"}]}');
            // 执行连接，do something
            //alert('连接成功');
        }
    }
});
