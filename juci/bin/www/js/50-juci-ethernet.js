
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

JUCI.app.factory("$ethernet", function($rpc, $uci){
	function Ethernet() {
		this._adapters = []; 
		this._subsystems = []; 
	}

	Ethernet.prototype.addSubsystem = function(subsys){
		if(subsys) 
			this._subsystems.push(subsys); 
	} 
	
	Ethernet.prototype.getAdapters = function(){
		var def = $.Deferred(); 
		var self = this; 
		$rpc.juci.ethernet.adapters().done(function(result){
			if(result && result.adapters) {
				result.adapters.map(function(x){
					if(x.flags && x.flags.indexOf("UP") != -1) x.state = "UP"; 
					else x.state = "DOWN"; 
				}); 
				// pipe all adapters though all subsystems and annotate them
				async.each(self._subsystems, function(sys, next){
					if(sys.annotateAdapters && sys.annotateAdapters instanceof Function){
						sys.annotateAdapters(result.adapters).always(function(){
							next(); 
						});
					} else {
						next(); 
					}
				}, function(){ 
					def.resolve(result.adapters);
				}); 
			} else def.reject(); 
		}).fail(function(){ def.reject(); }); 	
		return def.promise(); 
	}

	return new Ethernet(); 
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
.controller("InternetLayer2", function($scope, $uci, $rpc, $ethernet, $network, $config){
	$scope.config = $config; 

	$scope.order = function(field){
		$scope.predicate = field; 
		$scope.reverse = !$scope.reverse; 
	}

	$ethernet.getAdapters().done(function(adapters){
		$scope.adapters = adapters.filter(function(a){
			return (!a.flags || !a.flags.match("NOARP")); 
		}).map(function(a){
			var type = "unknown"; 
			if(["eth", "eth-bridge", "eth-port", "vlan", "wireless", "vdsl", "adsl"].indexOf(a.type) != -1){ 
				type = a.type; 
			} 
			a._icon = type+((a.state == "DOWN")?"_disabled":""); 
			return a; 
		}); 
		$scope.$apply(); 
	}); 
}); 

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"Layer-2 Ethernet Devices":"","internet.ethernet.info":"Ethernet devices are the low level devices that you can use to access a network. These are MAC level devices and so do not have IP addresses. You should configure IP addresses in the connections section. ","Name":"","Adapter":"","MAC":"","MTU":"","Status":"Status","internet-ethernet-title":"Ethernet Devices","menu-internet-ethernet-title":"Devices"});
	gettextCatalog.setStrings('fi', {"Layer-2 Ethernet Devices":"Layer-2 Ethernet-laitteet","internet.ethernet.info":" Ethernet","Name":"Nimi","Adapter":"Verkkolaite","MAC":"MAC","MTU":"MTU","Status":"Status","internet-ethernet-title":"Ethernet","menu-internet-ethernet-title":"Ethernet"});
	gettextCatalog.setStrings('sv-SE', {"Layer-2 Ethernet Devices":"Layer-2 enheter","internet.ethernet.info":"Här kan du ställa in ethernet enheter","Name":"Namn","Adapter":"Adapter","MAC":"MAC","MTU":"MTU","Status":"Status","internet-ethernet-title":"Ethernet","menu-internet-ethernet-title":"Ethernet"});
}]);

JUCI.style({"css":"\n\n\n"});
JUCI.template("pages/internet-ethernet.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"InternetLayer2\">\n<juci-config-heading>{{ 'Layer-2 Devices' | translate }}</juci-config-heading>\n<juci-config-info>{{ 'internet.ethernet.info' | translate }}</juci-config-info>\n<juci-config-section ng-show=\"adapters\">\n<table class=\"table\">\n<thead>\n<th><a href=\"\" ng-click=\"order('type')\" translate>Type</a></th>\n<th><a href=\"\" ng-click=\"order('name')\" translate>Name</a></th>\n<th><a href=\"\" ng-click=\"order('device')\" translate>Adapter</a></th>\n<th><a href=\"\" ng-click=\"order('macaddr')\" translate>MAC</a></th>\n<th><a href=\"\" ng-click=\"order('mtu')\" translate>MTU</a></th>\n<th width=\"1px\"><a href=\"\" ng-click=\"order('state')\" translate>Status</th>\n</thead>\n<tr ng-repeat=\"dev in adapters track by $index | orderBy:predicate:reverse\">\n<td><img ng-src=\"/img/juci-ethernet/icons/{{dev._icon}}.png\" style=\"width: 20px; height: 20px;\"/></td>\n<td>{{dev.name}}</td>\n<td>{{dev.device}}</td>\n<td>{{dev.macaddr}}</td>\n<td>{{dev.mtu}}</td>\n<td style=\"white-space: nowrap;\"><i class=\"fa fa-circle\" ng-class=\"{'text-success': dev.state=='UP'}\"></i> {{dev.state}}</td>\n</tr>\n</table>\n</juci-config-section>\n<i class=\"fa fa-spinner fa-spin fa-2x\" ng-hide=\"adapters\"></i>\n</div>\n</juci-layout-with-sidebar>\n");