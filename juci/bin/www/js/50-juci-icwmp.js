
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

JUCI.style({"css":"\n\n\n"});
JUCI.template("pages/icwmp-config.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"icwmpConfigPage\">\n<h2 translate>TR-069</h2>\n<juci-config-section title=\"{{'ACS Settings'|translate}}\">\n<juci-config-lines>\n<juci-config-line title=\"{{ 'ACS User Name' | translate }}\">\n<input type=\"text\" class=\"form-control\" ng-model=\"acs.userid.value\">\n</juci-config-line>\n<juci-config-line title=\"{{ 'ACS Password' | translate }}\">\n<input type=\"text\" class=\"form-control\" ng-model=\"acs.passwd.value\">\n</juci-config-line>\n<juci-config-line title=\"{{ 'URL' | translate }}\">\n<input type=\"text\" class=\"form-control\" ng-model=\"acs.url.value\">\n</juci-config-line>\n<juci-config-line title=\"{{ 'Periodic Inform Enable' | translate }}\">\n<switch class=\"green\" ng-model=\"acs.periodic_inform_enable.value\">\n</juci-config-line>\n<juci-config-line title=\"{{ 'Periodic Inform Interval' | translate }}\">\n<input type=\"number\" min=\"0\" step=\"100\" class=\"form-control\" ng-model=\"acs.periodic_inform_interval.value\">\n</juci-config-line>\n<juci-config-line title=\"{{ 'Periodic Inform Time' | translate }}\">\n<input type=\"number\" min=\"0\" class=\"form-control\" ng-model=\"acs.periodic_inform_time.value\">\n</juci-config-line>\n<juci-config-line title=\"{{ 'DHCP Discovery' | translate }}\">\n<juci-select ng-items=\"bool\" ng-model=\"acs.dhcp_discovery.value\"></juci-select>\n</juci-config-line>\n</juci-config-lines>\n</juci-config-section>\n<juci-config-section title=\"{{'CPE Settings'|translate}}\">\n<juci-config-lines>\n<juci-config-line title=\"{{ 'WAN Interface' | translate }}\">\n<juci-select ng-items=\"wan_interfaces\" ng-model=\"cpe.default_wan_interface.value\"></juci-select>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Connection Request User Name' | translate }}\">\n<input type=\"text\" class=\"form-control\" ng-model=\"cpe.userid.value\">\n</juci-config-line>\n<juci-config-line title=\"{{ 'Connection Request Password' | translate }}\">\n<input type=\"text\" class=\"form-control\" ng-model=\"cpe.passwd.value\">\n</juci-config-line>\n<juci-config-line title=\"{{ 'Port' | translate }}\">\n<input type=\"number\" min=\"0\" max=\"65535\" class=\"form-control\" ng-model=\"cpe.port.value\">\n</juci-config-line>\n<juci-config-line title=\"{{ 'Log Severity Level' | translate }}\">\n<juci-select ng-items=\"severity_levels\" ng-model=\"cpe.log_severity.value\"></juci-select>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Log to console' | translate }}\">\n<juci-select ng-items=\"bool\" ng-model=\"cpe.log_to_console.value\"></juci-select>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Log to file' | translate }}\">\n<juci-select ng-items=\"bool\" ng-model=\"cpe.log_to_file.value\"></juci-select>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Log file max size' | translate }}\">\n<input type=\"number\" min=\"0\" step=\"1600\" class=\"form-control\" ng-model=\"cpe.log_max_size.value\">\n</juci-config-line>\n<juci-config-line title=\"{{ 'Provisioning Code' | translate }}\">\n<input type=\"text\" class=\"form-control\" ng-model=\"cpe.provisioning_code.value\">\n</juci-config-line>\n</juci-config-lines>\n</juci-config-section>\n</div>\n</juci-layout-with-sidebar>\n");