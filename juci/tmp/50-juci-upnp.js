
//! Author: Martin K. Schröder <mkschreder.uk@gmail.com>

JUCI.app
.factory("$upnp", function($uci){
	return {
		get enabled(){
			if(!$uci.upnpd.config) return false; 
			return $uci.upnpd.config.enable_upnp.value; 
		},
		set enabled(value){
			if(!$uci.upnpd.config) return; 
			$uci.upnpd.config.enable_upnp.value = value; 
		}, 
		getConfig: function(){
			var deferred = $.Deferred(); 
			$uci.$sync("upnpd").done(function(){
				deferred.resolve($uci.upnpd.config); 
			}); 
			return deferred.promise(); 
		}
	}; 
}); 

JUCI.app
.run(function($uci){
	$uci.$sync("upnpd"); 
}); 

UCI.$registerConfig("upnpd"); 
UCI.upnpd.$registerSectionType("upnpd", {
	"enable_natpmp":	{ dvalue: false, type: Boolean }, 
	"enable_upnp":		{ dvalue: false, type: Boolean }, 
	"secure_mode":		{ dvalue: false, type: Boolean }, 
	"log_output":		{ dvalue: true, type: Boolean }, 
	"download":			{ dvalue: 1024, type: Number }, 
	"upload":			{ dvalue: 512, type: Number }, 
	"internal_iface":	{ dvalue: '', type: String }, 
	"external_iface":	{ dvalue: '', type: String },
	"port":				{ dvalue: 5000, type: Number }, 
	"uuid":				{ dvalue: '', type: String },
	"serial_number":	{ dvalue: '', type: String },
	"model":			{ dvalue: '', type: String },
	"notify_interval":	{ dvalue: 30, type: Number },
	"clean_ruleset_threshold": { dvalue: 20, type: Number },
	"clean_ruleset_interval": { dvalue: 600, type: Number },
	"presentation_url":	{ dvalue: '', type: String },
	"upnp_lease_file":	{ dvalue: '', type: String }
}); 

UCI.upnpd.$registerSectionType("perm_rule", {
	"action":		{ dvalue: '', type: String },
	"ext_ports":	{ dvalue: '', type: String },
	"int_addr":		{ dvalue: '', type: String },
	"int_ports":	{ dvalue: '', type: String },
	"comment":		{ dvalue: '', type: String }
});
/*
config perm_rule
	option action		allow
	option ext_ports	1024-65535
	option int_addr		0.0.0.0/0
	option int_ports	1024-65535
	option comment		"Allow high ports"

config perm_rule
	option action		deny
	option ext_ports		0-65535
	option int_addr		0.0.0.0/0
	option int_ports		0-65535
	option comment		"Default deny"
*/

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
.controller("UPNPMainPage", function($scope, $uci, $systemService, $network, $firewall, $upnp, $tr, gettext){
	JUCI.interval.repeat("upnp-status-refresh", 1000, function(done){
		$systemService.find("miniupnpd").done(function(service){
			$scope.service = service;
			$rpc.juci.upnpd.ports().done(function(result){ 
				$scope.upnpOpenPorts = result.ports; 
				$scope.$apply();
				done(); 
			}); 
		}).fail(function(){
			$scope.upnp_not_present = true; 
			$scope.$apply(); 
		});
	}); 
	$scope.networks = [];

	$scope.acls = [];
	$scope.action = [
		{ label: $tr(gettext("Allow")),	value:"allow" },
		{ label: $tr(gettext("Deny")),	value:"deny" }
	];

	$scope.onStartStopService = function(){
		if(!$scope.service) return;
		if($scope.service.running){
			$scope.service.stop().done(function(){
				$scope.$apply();
			});
		} else {
			$scope.service.start().done(function(){
				$scope.$apply();
			});
		}
	}

	$scope.onEnableDisableService = function(){
		if(!$scope.service) return;
		if($scope.service.enabled){
			$scope.service.disable().done(function(){
				$scope.$apply();
			});
		} else {
			$scope.service.enable().done(function(){
				$scope.$apply();
			});
		}
	}

	$upnp.getConfig().done(function(config){
		$scope.upnp = config;
		$scope.acls = $uci.upnpd["@perm_rule"];
		$network.getNetworks().done(function(data){
			$scope.networks = data.map(function(x){
				return {
					label: String(x[".name"]).toUpperCase(),
					value: x[".name"]
				}
			});
			$scope.$apply();
		});
	});

	$scope.onAclMoveUp = function(acl){
		var arr = $uci.upnpd["@perm_rule"]; 
		var idx = arr.indexOf(acl); 
		// return if either not found or already at the top
		if(idx == -1 || idx == 0) return; 
		arr.splice(idx, 1); 
		arr.splice(idx - 1, 0, acl); 
		$uci.upnpd.$save_order("perm_rule"); 
	}

	$scope.onAclMoveDown = function(acl){
		var arr = $uci.upnpd["@perm_rule"]; 
		var idx = arr.indexOf(acl); 
		// return if either not found or already at the bottom
		if(idx == -1 || idx == arr.length - 1) return;
		arr.splice(idx, 1); 
		arr.splice(idx + 1, 0, acl); 
		$uci.upnpd.$save_order("perm_rule"); 
	}

	$scope.onAclAdd = function(){
		$uci.upnpd.$create({
			".type": "perm_rule"
		}).done(function(){
			$scope.$apply(); 
		}); 
	}

	$scope.onAclRemove = function(acl){
		if(!acl) return; 
		acl.$delete().done(function(){
			$scope.$apply(); 
		}); 
	}
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
.controller("UPNPStatusPage", function($scope, $rpc){	
	$rpc.juci.upnpd.ports().done(function(result){
		$scope.upnpOpenPorts = result.ports; 
		$scope.loaded = true; 
		$scope.$apply(); 
	}); 
}); 

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"UPNP Settings":"UPNP Settings","internet.services.upnp.info":"Configure UPNP and ports","Enable":"","UPnP Open Ports":"","No UPnP ports currently in use":"","Packets cnt.":"","Bytes":"","Target":"","Proto":"","Opt":"","Source":"","Dest.":"","upnpd-settings-title":"UPNP Settings","upnpd-status-title":"UPNP Status","menu-upnpd-settings-title":"UPNP","menu-upnpd-status-title":"UPNP"});
	gettextCatalog.setStrings('fi', {"UPNP Settings":"UPNP asetukset","internet.services.upnp.info":"UPnP","Enable":"Ota käyttöön","UPnP Open Ports":"Käyttää UPnP:tä avaamaan automaattisesti tarvittavat portit reititimestäsi","No UPnP ports currently in use":"Ei käytössä olevia UPnP-porttteja","Packets cnt.":"Packets cnt.","Bytes":"Bytes","Target":"Kohde","Proto":"Proto","Opt":"Opt","Source":"Source","Dest.":"Dest.","upnpd-settings-title":"UPNP","upnpd-status-title":"UPNP asetukset","menu-upnpd-settings-title":"UPNP","menu-upnpd-status-title":"PuhelinUPNP"});
	gettextCatalog.setStrings('sv-SE', {"UPNP Settings":"UPNP Inställningar","internet.services.upnp.info":"Konfigurera UPNP för att kunna automatiskt öppna port-forwarding på boxen (användbart för spel och annat) ","Enable":"Aktivera","UPnP Open Ports":"UPnP öppna portar","No UPnP ports currently in use":"Inga portar används för tillfället","Packets cnt.":"Antal paket","Bytes":"Bytes","Target":"Mål","Proto":"Protokoll","Opt":"Opt","Source":"Källa","Dest.":"Dest.","upnpd-settings-title":"UHTTPD","upnpd-status-title":"UHTTPD","menu-upnpd-settings-title":"UHTTPD","menu-upnpd-status-title":"UHTTPD"});
}]);

