
/*	
	This file is part of JUCI (https://github.com/mkschreder/juci.git)

	Copyright (c) 2015 Martin K. Schröder <mkschreder.uk@gmail.com>

	This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
*/ 

UCI.$registerConfig("uhttpd"); 
UCI.uhttpd.$registerSectionType("uhttpd", {
	"home":				{ dvalue: "/www", type: String }, 
	"max_requests":		{ dvalue: false, type: Number }, 
	"max_connections":	{ dvalue: false, type: Number }, 
	"ubus_prefix":		{ dvalue: true, type: String } 
}); 
UCI.uhttpd.$registerSectionType("logopts", {
	"ubus_status":		{ dvalue: [], type: Array },
	"ubus_method": 		{ dvalue: [], type: Array }
});
UCI.uhttpd.$insertDefaults("logopts");

/*	
	This file is part of JUCI (https://github.com/mkschreder/juci.git)

	Copyright (c) 2015 Martin K. Schröder <mkschreder.uk@gmail.com>

	This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
*/ 

JUCI.app
.controller("PageUhttpdSettings", function($scope, $uci, $systemService){
	$scope.logopts = {ubus_status: {value: []}};
	$scope.status = {
		items: [
			{label: "OK",		value: "ok"},
			{label: "Invalid command",	value: "invalid_command"},
			{label: "Invalid argument",	value: "invalid_argument"},
			{label: "Method not found", value: "method_not_found"},
			{label: "Object not found", value: "object_not_found"},
			{label: "No data",			value: "no_data"},
			{label: "Permission denied",value: "permission_denied"},
			{label: "Timeout",			value: "timeout"},
			{label: "Not supported",	value: "not_supported"},
			{label: "Unknown error", 	value: "unknown_error"},
			{label: "Connection failed",value: "connection_failed"}
		],
	};
	$scope.method = {};
	$scope.data = {status:  [],method: []}
	$scope.getStatusItemTitle = function(item){return item.label};
	$scope.getMethodItemTitle = function(item){return item};
	$scope.addStatusItem = function(){
		if(!$scope.status.new)return;
		var ret = false;
		$scope.data.status.map(function(item){
			if(item.value == $scope.status.new){
				alert("Status allredy in list, please select another one");
				ret = true;;
			}
		});
		if(ret)return;
		$scope.data.status.push($scope.status.items.find(function(x){return (x.value == $scope.status.new)}));
	};
	$scope.addMethodItem = function(){
		if($scope.method.new.indexOf('.') === -1){
			alert("The input must be on the form Object.Method");
			return;
		}
		if($scope.logopts.ubus_method.value.find(function(x){return (x == $scope.method.new)})){
			alert("Method allredy in list, pease select another one");
			return
		}
		$scope.logopts.ubus_method.value.push($scope.method.new);
		$scope.logopts.ubus_method.value = $scope.logopts.ubus_method.value.filter(function(x){return true;});
		$scope.method.new = "";
	};
	$scope.deleteStatusItem = function(item){
		$scope.data.status = $scope.data.status.filter(function(x){
			return (x != item);
		});
	};
	$uci.$sync("uhttpd").done(function(){
		$scope.config = $uci.uhttpd.main; 
		$scope.logopts = $uci.uhttpd.logopts;
		$scope.data.status = $scope.logopts.ubus_status.value.map(function(x){
			return $scope.status.items.find(function(y){
				return (y.value == x);
			});
		});
		$scope.$watch("data", function onUhttpdDataChanged(){
			$scope.logopts.ubus_status.value = $scope.data.status.map(function(x){
				return x.value;
			});
		}, true);
		$scope.$apply(); 
	}); 
	$systemService.find("uhttpd").done(function(service){
		$scope.service = service; 
		$scope.$apply(); 
	});
	$scope.onKeyup = function(x){
		if(x.keyCode == 32){//32 = space
			alert("no spaces allowed");
			$scope.method.new = $scope.method.new.slice(0,-1);
		}
	};
	$scope.deleteMethodItem = function(item){
		$scope.logopts.ubus_method.value = $scope.logopts.ubus_method.value.filter(function(x){
			return (x != item);
		});
	 };
}); 

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"HTTPD Settings":"HTTPD Settings","uhttpd.settings.info":"Configuration for uHTTPd micro web server. ","WWW-root":"","WWW-root path":"","UBUS Prefix":"","ex. /ubus":"","Max Requests":"","Max Connections":"","Specify UBUS return codes to log into system log":"","Will only log status codes above that are returned by these ubus calls":"","Object.Method":"","page-uhttpd-settings-title":"uHTTPd Micro Web-Server Settings","menu-page-uhttpd-settings-title":"HTTPD"});
	gettextCatalog.setStrings('fi', {"uHTTPD Settings":"uHTTPD asetukset","uhttpd.settings.info":"UHTTPd","WWW-root":"WWW-root","WWW-root path":"WWW-root polku","Max Requests":"Max pyynnöt","Max Connections":"Yhteyksien enimmäismäärä","UBUS Prefix":"UBUS etuliite","ex. /ubus":"ex. /ubus","Object.Method":"Object.Method","page-uhttpd-settings-title":"uHTTPD Asetukset","menu-page-uhttpd-settings-title":"uhttpd"});
	gettextCatalog.setStrings('sv-SE', {"uHTTPD Settings":"uHTTPD inställningar","uhttpd.settings.info":"Här kan du konfigurera den embeddade web servern ","WWW-root":"","WWW-root path":"","Max Requests":"","Max Connections":"Max. Uppkopplingar","UBUS Prefix":"UBUS prefix (ändra ej!)","ex. /ubus":"","Object.Method":"<objekt>.<metod>","page-uhttpd-settings-title":"UHTTPD","menu-page-uhttpd-settings-title":"UHTTPD"});
}]);

