
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

