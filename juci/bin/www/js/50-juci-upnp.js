
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

JUCI.style({"css":"\n\n\n"});
JUCI.template("pages/upnpd-settings.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"UPNPMainPage\">\n<juci-config-heading>{{ 'UPNP Settings' | translate }}</juci-config-heading>\n<juci-config-info>{{ 'internet.services.upnp.info' | translate }}</juci-config-info>\n<div ng-show=\"upnp_not_present\" class=\"alert alert-danger\" translate>miniupnpd is not installed on this system!</div>\n<div ng-show=\"!upnp_not_present\">\n<juci-config-section title=\"{{'Open Ports'|translate}}\">\n<span ng-show=\"!upnpOpenPorts.length\" translate>No UPnP ports currently in use</span>\n<table class=\"table\" ng-show=\"upnpOpenPorts.length\">\n<tr>\n<th>#</th>\n<th translate>Pkts. cnt.</th>\n<th translate>Bytes</th>\n<th translate>Target</th>\n<th translate>Proto.</th>\n<th translate>Opt</th>\n<th translate>Source</th>\n<th translate>Dest.</th>\n</tr>\n<tr ng-repeat=\"port in upnpOpenPorts track by $index\">\n<td>{{port.num}}</td>\n<td>{{port.packets}}</td>\n<td>{{port.bytes}}</td>\n<td>{{port.target}}</td>\n<td>{{port.proto}}</td>\n<td>{{port.opt}}</td>\n<td>{{port.src}} {{port.src_port}}</td>\n<td>{{port.dst}} {{port.dst_port}}</td>\n</tr>\n</table>\n</juci-config-section>\n<juci-config-section title=\"{{'General Settings'|translate}}\">\n<juci-config-lines>\n<juci-config-line title=\"{{'Automatically Start Service At Bootup'|translate}}\" help=\"{{'Enable upnp daemon at boot time'|translate}}\">\n<switch ng-model=\"service.enabled\" ng-change=\"onEnableDisableService()\"></switch>\n</juci-config-line>\n<juci-config-line title=\"{{'Start / Stop Service'|translate}}\" ng-show=\"upnp\" help=\"{{'Start/stop upnp daemon (make sure you have WAN connection!)'|translate}}\">\n<button class=\"btn btn-default\" ng-click=\"onStartStopService()\"><i class=\"fa\" ng-class=\"{'fa-play':!service.running,'fa-stop':service.running}\"></i></button>\n</juci-config-line>\n<juci-config-line title=\"{{'Enable UPNP'|translate}}\" ng-show=\"upnp\" help=\"{{'Enable UPNP protocol'|translate}}\">\n<switch ng-model=\"upnp.enable_upnp.value\"></switch>\n</juci-config-line>\n<juci-config-line title=\"{{'Enable NAT-PMP'|translate}}\" ng-show=\"upnp\" help=\"{{'Enable NAT-PMP protocol'|translate}}\">\n<switch ng-model=\"upnp.enable_natpmp.value\"></switch>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Enable secure mode' | translate }}\" help=\"{{ 'Allow adding forwards only to requesting ip addresses' | translate }}\">\n<switch ng-model=\"upnp.secure_mode.value\"></switch>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Enable additional logging' | translate }}\" help=\"{{ 'Puts extra debugging information into the system log' | translate }}\">\n<switch ng-model=\"upnp.log_output.value\"></switch>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Downlink' | translate }}\" help=\"{{ 'Value in KByte/s, informational only' | translate }}\">\n<input type=\"number\" class=\"form-control\" ng-model=\"upnp.download.value\" />\n</juci-config-line>\n<juci-config-line title=\"{{ 'Uplink' | translate }}\" help=\"{{ 'Value in KByte/s, informational only' | translate }}\">\n<input type=\"number\" class=\"form-control\" ng-model=\"upnp.upload.value\" />\n</juci-config-line>\n<juci-config-line title=\"{{ 'Port' | translate }}\">\n<input type=\"number\" class=\"form-control\" ng-model=\"upnp.port.value\" />\n</juci-config-line>\n<juci-config-line title=\"{{ 'External Interface' | translate }}\">\n<juci-select ng-items=\"networks\" ng-model=\"upnp.external_iface.value\"></juci-select>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Internal Interface' | translate }}\">\n<juci-select ng-items=\"networks\" ng-model=\"upnp.internal_iface.value\"></juci-select>\n</juci-config-line>\n</juci-config-lines>\n</juci-config-section>\n<juci-config-section title=\"{{'Advanced Settings'|translate}}\">\n<juci-config-lines>\n<juci-config-line title=\"{{ 'Device UUID' | translate }}\">\n<input type=\"text\" class=\"form-control\" ng-model=\"upnp.uuid.value\" placeholder=\"UUID\"/>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Announced serial number' | translate }}\">\n<input type=\"text\" class=\"form-control\" ng-model=\"upnp.serial_number.value\" placeholder=\"{{'Serial Number'|translate}}\"/>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Announced model number' | translate }}\">\n<input type=\"text\" class=\"form-control\" ng-model=\"upnp.model.value\" placeholder=\"{{'Model Number'|translate}}\"/>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Notify interval' | translate }}\">\n<input type=\"number\" class=\"form-control\" ng-model=\"upnp.notify_interval.value\"/>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Clean rules threshold' | translate }}\">\n<input type=\"number\" class=\"form-control\" ng-model=\"upnp.clean_ruleset_threshold.value\"/>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Clean rules interval' | translate }}\">\n<input type=\"number\" class=\"form-control\" ng-model=\"upnp.clean_ruleset_interval.value\"/>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Presentation URL' | translate }}\">\n<input type=\"text\" class=\"form-control\" placeholder=\"https://presentation.html\" ng-model=\"upnp.presentation_url.value\"/>\n</juci-config-line>\n<juci-config-line title=\"{{ 'UPnP lease file' | translate }}\">\n<input type=\"text\" class=\"form-control\" placeholder=\"/var/upnp.lease\" ng-model=\"upnp.upnp_lease_file.value\"/>\n</juci-config-line>\n</juci-config-lines>\n</juci-config-section>\n<juci-config-section title=\"{{'UPnP ACLs'|translate}}\">\n<table class=\"table table-hover\">\n<thead>\n<tr>\n<th translate>Comment</th>\n<th translate>External ports</th>\n<th translate>Internal addresses</th>\n<th translate>Internal ports</th>\n<th translate>Action</th>\n<th translate>Sort</th><th></th>\n</tr>\n</thead>\n<tbody>\n<tr ng-repeat=\"acl in acls track by $index\">\n<td><input type=\"text\" class=\"form-control\" ng-model=\"acl.comment.value\"/></td>\n<td><input type=\"text\" class=\"form-control\" ng-model=\"acl.ext_ports.value\"/></td>\n<td><input type=\"text\" class=\"form-control\" ng-model=\"acl.int_addr.value\"/></td>\n<td><input type=\"text\" clasS=\"form-control\" ng-model=\"acl.int_ports.value\"/></td>\n<td><juci-select ng-items=\"action\" ng-model=\"acl.action.value\"></juci-select></td>\n<td><button class=\"btn btn-default\" ng-click=\"onAclMoveUp(acl)\"><i class=\"fa fa-arrow-up\"></i></button>\n<button class=\"btn btn-default\" ng-click=\"onAclMoveDown(acl)\"><i class=\"fa fa-arrow-down\"></i></button></td>\n<td><button class=\"btn btn-default\" ng-click=\"onAclRemove(acl)\" translate>Delete</button>\n</tr>\n<tr><td/><td/><td/><td/><td/><td/><td><button class=\"btn btn-default\" ng-click=\"onAclAdd()\" translate>Add ACL</button></td></tr>\n</tbody>\n</table>\n</juci-config-section>\n</div><!-- upnp not installed -->\n</div>\n</juci-layout-with-sidebar>\n");JUCI.template("pages/upnpd-status.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"UPNPStatusPage\">\n<h2 translate>UPnP Open Ports</h2>\n<div class=\"alert alert-info\" ng-show=\"loaded && !upnpOpenPorts.length\" translate>No UPnP ports currently in use</div>\n<table class=\"table\" ng-show=\"loaded && upnpOpenPorts.length\">\n<thead>\n<th>#</th>\n<th translate>Packets cnt.</th>\n<th translate>Bytes</th>\n<th translate>Target</th>\n<th translate>Proto</th>\n<th translate>Opt</th>\n<th translate>Source</th>\n<th translate>Dest.</th>\n</thead>\n<tr ng-repeat=\"port in upnpOpenPorts track by $index\">\n<td>{{port.num}}</td>\n<td>{{port.packets}}</td>\n<td>{{port.bytes}}</td>\n<td>{{port.target}}</td>\n<td>{{port.proto}}</td>\n<td>{{port.opt}}</td>\n<td>{{port.src}}</td>\n<td>{{port.dst}}</td>\n</tr>\n</table>\n</div>\n</juci-layout-with-sidebar>\n");