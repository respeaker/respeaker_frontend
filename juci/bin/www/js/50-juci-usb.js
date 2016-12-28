
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
.factory("$usb", function($rpc){
	function USB(){
		
	}
	
	USB.prototype.getDevices = function(){
		var def = $.Deferred(); 
		$rpc.juci.usb.list().done(function(result){
			if(result && result.devices) def.resolve(result.devices); 
			else def.reject(); 
		}); 
		return def.promise(); 
	}
	
	return new USB(); 
}).run(function($events){	
	$events.subscribe("usb.device.add", function(event){
		console.log("USB Plugged in: "+JSON.stringify(event)); 
	});
});  


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
.controller("StatusUsbDevicesPage", function($scope, $uci, $usb){
	$usb.getDevices().done(function(devices){
		$scope.devices = devices; 
		$scope.$apply(); 
	}); 
}); 

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
.directive("overviewWidget40USB", function(){
	return {
		templateUrl: "widgets/overview.usb.html", 
		controller: "overviewWidget40USB", 
		replace: true
	 };  
})
.directive("overviewStatusWidget40USB", function(){
	return {
		templateUrl: "widgets/overview.usb.small.html", 
		controller: "overviewWidget40USB", 
		replace: true
	 };  
})
.controller("overviewWidget40USB", function($scope, $uci, $usb, $events){
	$events.subscribe("hotplug.usb", function(res){
		if(res.data && res.data.action && (res.data.action == "add" || res.data.action == "remove")){
			update();
		}
	});
	function update(){
		$usb.getDevices().done(function(devices){
			$scope.devices = devices.filter(function(dev){ return dev.product && !dev.product.match(/Platform/) && !dev.product.match(/Host Controller/); }); 
			$scope.loaded = true; 
			$scope.$apply(); 
		}); 
	}update();
}); 

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"USB":"","USB Devices":"USB Devices","usb.devices.info":"USB device information","Device ID":"Device ID","Vendor ID":"","Vendor Name":"","Device Name":"Device Name","status-usb-title":"USB Status","menu-status-usb-title":"USB Status"});
	gettextCatalog.setStrings('fi', {"USB":"USB","No usb devices connected!":"Ei usb-laitteita!","USB Devices":"USB-laitteet","usb.devices.info":"USB","Device ID":"Laite ID","Vendor ID":"Toimittajatunnus","Vendor Name":"Toimittajan Nimi","Device Name":"Laitteen nimi","status-usb-title":"Status","menu-status-usb-title":"USB"});
	gettextCatalog.setStrings('sv-SE', {"USB":"USB","No usb devices connected!":"Inga USB enheter är inkopplade","USB Devices":"USB-enheter","usb.devices.info":"Information om USB-enheter som för närvarande är uppkopplade till routern. ","Device ID":"Enhets-ID","Vendor ID":"Tillverkarens ID","Vendor Name":"Tillverkare","Device Name":"Enhetsnamn","status-usb-title":"USB","menu-status-usb-title":"USB"});
}]);

JUCI.style({"css":"\n\n\n"});
JUCI.template("widgets/overview.usb.html", "<div class=\"panel panel-default\" >\n<div class=\"panel-heading\">\n<h3 class=\"panel-title\" style=\"font-size: 1.7em; padding-top: 0.3em; font-weight: bold; font-family: 'eurostyle';\">\n<i class=\"juci juci-usb\" style=\"margin-right: 10px;\"></i>{{'USB'|translate}}\n</h3>\n</div>\n<div class=\"panel-body\">\n<div class=\"row\" ng-show=\"loaded && (!devices || devices.length == 0)\"><div class=\"col-md-12\" translate>No usb devices connected!</div></div>\n<div class=\"row\" ng-show=\"devices && devices.length > 0\" ng-repeat=\"dev in devices track by $index\">\n<div class=\"col-xs-2\"><strong>{{$index + 1}}</strong></div>\n<div class=\"col-xs-10\"><strong>{{dev.product}}</strong></div>\n<div class=\"col-xs-2\"></div>\n<div class=\"col-xs-10\">{{dev.manufacturer}}</div>\n</div>\n</div>\n</div>\n");JUCI.template("widgets/overview.usb.small.html", "<div>\n<table>\n<tr>\n<td style=\"width:1%\"><i class=\"juci juci-usb\"></i></td>\n<td style=\"padding-left: 10px;\">{{'USB'|translate}}</td>\n<td style=\"width:1%\">\n<div class=\"badge\" ng-show=\"devices\">{{devices.length}}</div>\n<i class=\"fa fa-spinner fa-spin\" ng-show=\"!devices\"></i>\n</td>\n</tr>\n</table>\n</div>\n");JUCI.template("pages/status-usb.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"StatusUsbDevicesPage\">\n<juci-config-heading>{{ 'USB Devices' | translate }}</juci-config-heading>\n<juci-config-info>{{ 'usb.devices.info' | translate }}</juci-config-info>\n<table class=\"table table-bordered\">\n<thead>\n<th translate>Device ID</th>\n<th translate>Vendor ID</th>\n<th translate>Vendor Name</th>\n<th translate>Device Name</th>\n</thead>\n<tr ng-repeat=\"dev in devices track by $index\">\n<td>{{dev.productid}}</td>\n<td>{{dev.vendorid}}</td>\n<td>{{dev.manufacturer}}</td>\n<td>{{dev.product}}</td>\n</tr>\n</table>\n</div>\n</juci-layout-with-sidebar>\n");