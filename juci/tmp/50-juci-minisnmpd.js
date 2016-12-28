
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

UCI.$registerConfig("snmpd"); 
UCI.snmpd.$registerSectionType("mini_snmpd", {
	"enabled":			{ dvalue: false, type: Boolean }, 	
	"community":		{ dvalue: "", type: String }, 	
	"location":			{ dvalue: "", type: String }, 	
	"contact":			{ dvalue: "", type: String }, 	
	"disks":			{ dvalue: "", type: String }, 	
	"interfaces":		{ dvalue: "", type: String }, 	
	"manager_ip":		{ dvalue: "", type: String }, 	
	"name":				{ dvalue: "", type: String }, 	
	"read_community": 	{ dvalue: "", type: String }, 	
	"set_community": 	{ dvalue: "", type: String }
}); 

UCI.snmpd.$registerSectionType("system", {
	"enabled":			{ dvalue: "", type: String },
	"contact":			{ dvalue: "", type: String }, 	
	"manager_ip":		{ dvalue: "", type: String }, 	
	"read_community": 	{ dvalue: "", type: String }, 	
	"set_community": 	{ dvalue: "", type: String },
	"sysLocation": 		{ dvalue: "", type: String }, 
	"sysName":	 		{ dvalue: "", type: String }, 
	"sysContact": 		{ dvalue: "", type: String }, 
	"sysDescr": 		{ dvalue: "", type: String } 
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
.controller("MiniSNMPDConfigPage", function($scope, $uci){
	$uci.$sync("snmpd").done(function(){
		if(!$uci.snmpd || !$uci.snmpd["@system"].length) return; 
		$scope.config = $uci.snmpd["@system"][0]; 
		$scope.$apply(); 
	}); 
}); 

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"Enabled":"","Read Community":"","Community":"","Set Community":"","System Name":"","Name":"","System Location":"","Location":"","System Contact":"","E-Mail":"","Trap Manager IP":"","snmp-config-title":"SNMP","menu-snmp-config-title":"SNMP"});
}]);

