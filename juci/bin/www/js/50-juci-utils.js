
//! Author: Reidar Cederqvst <reidar.cederqvist@gmail.com>

UCI.$registerConfig("speedtest"); 
UCI.speedtest.$registerSectionType("testserver", {
	"server":		{ dvalue: "", type: String }, 
	"port":			{ dvalue: "", type: String }, 
});


//! Author: Reidar Cederqvist <reidar.cederqvist@gmail.com>

JUCI.app
.directive("diagnosticsWidget90Speedtest", function($compile, $parse){
	return {
		scope: true,
		replace: true,
		templateUrl: "/widgets/diagnostics-widget-speedtest.html",
		controller: "diagnosticsWidget90Speedtest", 
	 };  
})
.controller("diagnosticsWidget90Speedtest", function($scope, $rpc, $events, $uci, utilsAddTestserverPicker){
	$scope.data = {
		packagesize: 50,
		test_type: "up_down",
		result: "",
		state: ""
	}; 
	var min = 1; 
	var max = 100; 
	$scope.$watch('data.packagesize', function onDiagnosticsPacketsizeChanged(new_value){
		if(new_value < min)$scope.data.packagesize = min;
		if(new_value > max)$scope.data.packagesize = max;
	}, false);

	function getServers(){
		$scope.allTestServers = $scope.testServers.map(function(x){
			return {
				label: x.server.value + "/" + x.port.value, 
				value: x.server.value
			}
		});
		if($scope.allTestServers.length)
			$scope.data.server = $scope.allTestServers[0].value; 
	}

	$scope.testType = [
		{value:"up_down", label: "up and down"}, 
		{value:"up", label: "up"}, 
		{value:"down", label:"down"} 
	];

	$uci.$sync("speedtest").done(function(){
		$scope.testServers = $uci.speedtest["@testserver"];
		getServers();
		$scope.$apply();
	});

	$scope.runTest = function(){
		if(!$scope.testServers.length){
			window.alert("Server and port is mandatory");
			return;
		}
		if($scope.data.state == "running"){
			window.alert("Only one test can be run at a time");
			return;
		}
		var server = $scope.testServers.find(function(x){ return $scope.data.server == x.server.value;});
		var port = server.port.value;
		var address = server.server.value;
		$scope.data.state="running";
		$rpc.juci.utils.speedtest.run({
			"testmode": $scope.data.test_type,
			"port": port,
			"packagesize": $scope.data.packagesize * 1000,
			"address": address
		}).done(function(response){
			if(response && response.message=="success"){
				$scope.data.state="running";
			}else{
				$scope.data.state="";
			}
			$scope.$apply();
		});
	};
	
	$scope.onRemoveAddress = function(){
		var server = $scope.testServers.find(function(x){
			return $scope.data.server == x.server.value
		});
		if(!server){
			alert("error deleting server");
			return;
		}
		server.$delete().done(function(){
			getServers();
			$scope.$apply();
		});
	};

	$scope.onAddAddress = function(){
		utilsAddTestserverPicker.show().done(function(data){
			if(!data)return;
			$uci.speedtest.$create({
				".type": "testserver",
				"server": data.address,
				"port": data.port
			}).done(function(){
				getServers();
				$scope.$apply();
			});
		});
	}
	$events.subscribe("juci.utils.speedtest", function(res){
		if(res.data && res.data.status != undefined){
			switch(res.data.status) {
			case 0:
				var upstream = parseInt(res.data.upstream);
				if(upstream == "NaN") {
					upstream = "none"
				}else{
					upstream = upstream / 1000 / 1000;
				}
				var downstream = parseInt(res.data.downstream);
				if(downstream == "NAN"){
					downstream = "none"
				}else{
					downstream = downstream / 1000 / 1000;
				}
				if(res.data.upstream != "none" && res.data.downstream != "none"){
					$scope.data.result="Upstream: " + upstream.toFixed(2) + " Mbit/s\nDownstream: " + downstream.toFixed(2) + " Mbit/s";
				}else if(res.data.upstream != "none"){
					$scope.data.result="Upstream: " + upstream.toFixed(2) + " Mbit/s";
				}else if(res.data.downstream != "none"){
					$scope.data.result="Downstream: " + downstream.toFixed(2) + " Mbit/s";
				}else {
					$scope.data.result="No speeds found";
				}
				$scope.data.state="result";
				break;
			case -1:
				$scope.data.result="Wrong TP-test address and/or port";
				$scope.data.state="error";
				break;
			case -2:
				$scope.data.result="Wrong TP-test port but correct address";
				$scope.data.state="error";
				break;
			}
			$scope.$apply();
		}
	});
}); 

//! Author: Reidar Cederqvist <reidar.cederqvist@gmail.com>

JUCI.app
.factory("utilsAddTestserverPicker", function($modal, $network){
	return {
		show: function(){
			var def = $.Deferred(); 
			var modalInstance = $modal.open({
				animation: true,
				templateUrl: 'widgets/utils-add-testserver-picker.html',
				controller: 'utilsAddTestserverPicker'
			});

			modalInstance.result.then(function (data) {
				setTimeout(function(){ // do this because the callback is called during $apply() cycle
					def.resolve(data); 
				}, 0); 
			}, function () {
					
			});
			return def.promise(); 
		}
	}; 
})
.controller("utilsAddTestserverPicker", function($scope, $modalInstance, $tr, gettext){
	$scope.data = {}; 
	$scope.ok = function () {
		if((!$scope.data.address) || (!$scope.data.port)) {
			alert($tr(gettext("Address and port needed"))); 
			return; 
		}
		$modalInstance.close($scope.data);
	};

	$scope.cancel = function () {
		$modalInstance.dismiss('cancel');
	};
})

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"Address and port needed":"","Test direction":"","Package size":"","address and prot":"","Run test":"","Trace results":"","Error":"","Server":"Server","Port":"Port","Add test server":""});
	gettextCatalog.setStrings('fi', {"Address and port needed":"Osoite ja portti tarvitaan","Direction":"Suunta","Package Size":"Pakettikoko","Speedtest Server":"Speedtest Server","Run test":"Suorita testi...","Trace results":"Jäljityksen tulokset","Error":"Virhe","Server":"Palvelin","Port":"Portti","Add test server":"Lisää Testipalvelin"});
	gettextCatalog.setStrings('sv-SE', {"Address and port needed":"Adress och port krävs!","Direction":"Riktning","Package Size":"Total ned-/uppladdningsstorlek","Speedtest Server":"Speedtest Server","Run test":"Kör testet","Trace results":"Resultat trace","Error":"Fel","Server":"Server","Port":"Port","Add test server":"Lägg till testserver"});
}]);

JUCI.style({"css":"\n\n\n"});
JUCI.template("widgets/diagnostics-widget-speedtest.html", "<div>\n<juci-config-section title=\"{{'TP test'|translate}}\">\n<juci-config-lines>\n<juci-config-line title=\"{{'Direction'|translate}}\">\n<juci-select ng-model=\"data.test_type\" ng-items=\"testType\"/>\n</juci-config-line>\n<juci-config-line title=\"{{'Package Size'|translate}}\">\n<div class=\"input-group\">\n<input type=\"number\" step=\"5\" class=\"form-control\" ng-model=\"data.packagesize\" />\n<span class=\"input-group-addon\">Mb</span>\n</div>\n</juci-config-line>\n<juci-config-line title=\"{{'Speedtest Server' | translate}}\">\n<juci-select ng-model=\"data.server\" ng-items=\"allTestServers\"/>\n</juci-config-line>\n<juci-config-line>\n<button class=\"btn btn-default\" ng-click=\"onRemoveAddress()\">\n<i class=\"fa fa-minus\"></i>\n</button>\n<button class=\"btn btn-default\" ng-click=\"onAddAddress()\">\n<i class=\"fa fa-plus\"></i>\n</button>\n</juci-config-line>\n<juci-config-line>\n<button class=\"btn btn-default\" ng-click=\"runTest()\">\n{{'Run test' | translate}}</button>\n</juci-config-line>\n</juci-config-lines>\n<div class=\"alert alert-success\" ng-show=\"data.state == 'result'\">\n{{'Test results'|translate}}: <br/>\n<pre>{{data.result}}</pre>\n</div>\n<div class=\"alert alert-success\" ng-show=\"data.state == 'running'\">\n<h4>\n{{\"Running test\"|translate}}\n<i class=\"fa fa-spinner fa-pulse fa-2x\"></i>\n</h4>\n</div>\n    <div class=\"alert alert-danger\" ng-show=\"data.state == 'error'\">\n{{'Error'|translate}}: <br/>\n<pre>{{data.result|translate}}</pre>\n</div>\n</juci-config-section>\n</div>\n\n");JUCI.template("widgets/utils-add-testserver-picker.html", "<div>\n<div class=\"modal-header\">\n<h3 class=\"modal-title\" translate>Add test server</h3>\n</div>\n<div class=\"modal-body\">\n<juci-config-lines>\n<juci-config-line title=\"{{'Server'|translate}}\">\n<input type=\"text\" class=\"form-control\" ng-model=\"data.address\"/>\n</juci-config-line>\n<juci-config-line title=\"{{'Port'|translate}}\">\n<input type=\"number\" class=\"form-control\" min=\"0\" max=\"65535\" ng-model=\"data.port\"/>\n</juci-config-line>\n</juci-config-lines>\n</div>\n<div class=\"modal-footer\">\n<button class=\"btn btn-primary\" ng-click=\"ok()\">OK</button>\n<button class=\"btn btn-default\" ng-click=\"cancel()\">Cancel</button>\n</div>\n</div>\n");