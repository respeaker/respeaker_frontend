
/*	
	This file is part of JUCI (https://github.com/mkschreder/juci.git)

	Copyright (c) 2015 Reidar Cederqvist <reidar.cederqvist@gmail.com>

	This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
*/ 

UCI.$registerConfig("cwmp");
UCI.cwmp.$registerSectionType("cwmp", {
	"url":						{ dvalue: '', type: String },
	"userid":					{ dvalue: '', type: String },
	"passwd":					{ dvalue: '', type: String },
	"periodic_inform_enable":	{ dvalue: true, type: Boolean },
	"periodic_inform_interval":	{ dvalue: 1800, type: Number },
	"periodic_inform_time":		{ dvalue: 0, type: Number },
	"dhcp_discovery":			{ dvalue: 'enable', type: String },
	"default_wan_interface":	{ dvalue: '', type: String },
	"log_to_console":			{ dvalue: 'disable', type: String },
	"log_to_file":				{ dvalue: 'enable', type: String },
	"log_severity":				{ dvalue: 'INFO', type: String },
	"log_max_size":				{ dvalue: 102400, type: Number },
	"port":						{ dvalue: 7547, type: Number },
	"provisioning_code":		{ dvalue: '', type: String }
});

/*	
	This file is part of JUCI (https://github.com/mkschreder/juci.git)

	Copyright (c) 2015 Reidar Cederqvist <reidar.cederqvist@gmail.com>

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
.controller("icwmpConfigPage", function($scope, $uci, $tr, gettext, $network){
	$uci.$sync(["cwmp"]).done(function(){
		$scope.acs = $uci.cwmp.acs;
		$scope.cpe = $uci.cwmp.cpe;
	});
	$network.getWanNetworks().done(function(networks){
		$scope.wan_interfaces = networks.map(function(n){
			return { label: String(n[".name"]).toUpperCase(), value: n[".name"] };
		});
		$scope.$apply();
	});
	$scope.bool = [
		{ label: $tr(gettext("Enabled")), 	value: 'enable' },
		{ label: $tr(gettext("Disabled")),	value: 'disable' }
	];
	$scope.severity_levels = [
		{ label: $tr(gettext("Emergency")),	value: 'EMERG' },
		{ label: $tr(gettext("Alert")),		value: 'ALERT' },
		{ label: $tr(gettext("Critical")),	value: 'CRITIC' },
		{ label: $tr(gettext("Error")),		value: 'ERROR' },
		{ label: $tr(gettext("Warning")),	value: 'WARNING' },
		{ label: $tr(gettext("Notice")),	value: 'NOTICE' },
		{ label: $tr(gettext("Info")),		value: 'INFO' },
		{ label: $tr(gettext("Debug")),		value: 'DEBUG' }
	];
});

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"Enabled":"","Disabled":"","Emergency":"","Alert":"","Critical":"","Error":"","Warning":"","Notice":"","Info":"","Debug":"","ACS User Name":"","ACS Password":"","URL":"","Periodic Inform Enable":"","Periodic Inform Interval":"","Periodic Inform Time":"","DHCP Discovery":"","WAN Interface":"","Connection Request User Name":"","Connection Request Password":"","Port":"","Log Severity Level":"","Log to console":"","Log to file":"","Log file max size":"","Provisioning Code":"","TR-069":"","Configure ACS specific settings":"","Configure CPE specific settings":"","icwmp-config-title":"ICWMP Settings","menu-icwmp-config-title":"ICWMP Settings"});
}]);

