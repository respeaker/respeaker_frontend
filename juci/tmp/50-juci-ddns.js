
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

UCI.$registerConfig("ddns");
UCI.ddns.$registerSectionType("service", {
	"enabled":              { dvalue: false, type: Boolean },
	"label": 				{ dvalue: "my ddns", type: String }, // gui label for this entry
	"interface":            { dvalue: "", type: String },
	"use_syslog":           { dvalue: false, type: Boolean },
	"service_name":         { dvalue: "", type: String },
	"domain":               { dvalue: "", type: String },
	"username":             { dvalue: "", type: String },
	"password":             { dvalue: "", type: String },
	"use_https": 			{ dvalue: false, type: Boolean },
	"force_interval": 		{ dvalue: 72, type: Number }, 
	"force_unit": 			{ dvalue: "hours", type: String },
	"check_interval": 		{ dvalue: 10, type: Number },
	"check_unit": 			{ dvalue: "minutes", type: String }, 
	"retry_interval": 		{ dvalue: 60, type: Number },
	"retry_unit":			{ dvalue: "seconds", type: String },
	"ip_source": 			{ dvalue: "interface", type: String },
	"ip_network": 			{ dvalue: "", type: String },
	"ip_script": 			{ dvalue: "", type: String },
	"ip_url": 				{ dvalue: "", type: String },
	"update_url": 			{ dvalue: "", type: String }
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
.controller("DDNSPage", function ($scope, $uci, $network) {
	$scope.data = {}; 
	$uci.$sync(["ddns"]).done(function () {
		$scope.ddns_not_installed = !$uci.ddns._exists; 
		$scope.ddns_list = $uci.ddns["@service"]; 
		$scope.$apply(); 
	}); 

	function nextNumber(){
		var i; 
		for(i = 0; i < $scope.ddns_list.length; i++){
			if(!$scope.ddns_list.find(function(x){ return x[".name"] == "DDNS_"+i; })) return i; 
		}
		return i; 
	}

	$scope.onAddDdnsSection = function(){
		var name = "DDNS_"+nextNumber(); 
		$uci.ddns.$create({
			".type": "service", 
			".name": name, 
			"label": name,
			"enabled": true
		}).done(function(ddns){
			$scope.$apply(); 
		}); 
	} 
	
	$scope.onRemoveDdnsSection = function(ddns){
		if(!ddns) return; 
		ddns.$delete().done(function(){
			$scope.$apply(); 
		});  
	}

	$scope.getItemTitle = function(item){
		return item[".name"]; 
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
.directive("ddnsNetworkSettingsEdit", function($compile){
	return {
		scope: {
			ddns: "=ngModel"
		}, 
		templateUrl: "/widgets/ddns-network-settings-edit.html", 
		controller: "ddnsNetworkSettingsEdit"
	};
})
.controller("ddnsNetworkSettingsEdit", function($scope, $rpc, $tr, gettext, $ethernet, $network){
	$scope.allSourceTypes = [
		{ label: $tr(gettext("Interface")), value: "interface" }, 
		{ label: $tr(gettext("Network")), value: "network" }, 
		{ label: $tr(gettext("Script")), value: "script" }, 
		{ label: $tr(gettext("Web")), value: "web" }
	]; 
	$ethernet.getAdapters().done(function(adapters){
		$scope.allSourceDevices = adapters.map(function(a){
			return { label: a.name, value: a.device }; 
		}); 
		$scope.$apply(); 
	});
	$network.getNetworks().done(function(nets){
		$scope.allSourceNetworks = nets.map(function(n){
			return { label: n[".name"], value: n[".name"] }; 
		}); 
		$scope.$apply(); 
	}); 
	$rpc.juci.ddns.providers().done(function(result){
		if(!result || !result.providers) return; 
		$scope.allServices = result.providers.map(function(p){ return { label: p, value: p }}); 
		$scope.$apply(); 
	});
}); 

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"Interface":"","Network":"","Script":"","Web":"","Enabled":"","Label":"","IP Retreival Method":"","Pick Connection":"","Pick Interface":"","Enter website to poll for ip address":"","Script Path":"","Enter path to script on router":"","Provider":"","Choose DNS Provider":"","Domain name":"","Username":"","Password":"","Use HTTPS":"","Enter DDNS Provider":"","DDNS (Dynamic DNS)":"","ddns.config.info":"DDNS allows you to access your router from the Internet using a domain name instead of IP address. You will need an account on a DDNS service provider.","internet-services-ddns-title":"DDNS","menu-internet-services-ddns-title":"DDNS"});
	gettextCatalog.setStrings('fi', {"Interface":"Fyysinen liitäntä","Network":"Verkko","Script":"Skripti","Web":"Web","Enabled":"Käytössä","Label":"Nimi","IP Retreival Method":"IP Retreival Method","Pick Connection":"Valitse yhteys","Pick Interface":"Valitse fyysinen liitäntä","Enter website to poll for ip address":"Syötä verkkosivun osoite IP-kyselyä varten","Script Path":"Script Path","Enter path to script on router":"Anna komentosarjalle kuvaava nimi","Provider":"Palveluntarjoaja","Choose DNS Provider":"Valitse DNS-palveluntarjoaja","Domain name":"Toimialue","Username":"Käyttäjänimi","Password":"Salasana","Use HTTPS":"Käytä HTTPS:ää (salattu HTTP)","Enter DDNS Provider":"Valitse DNS-palveluntarjoaja","DDNS (Dynamic DNS)":"DDNS (Dynaaminen DNS)","ddns.config.info":"DDNS mahdollistaa yhteydenottamisen laitteeseen Internetistä isäntänimeä käyttämällä IP-osoitteen sijaan. Tarvitset tätä varten tilin DDNS palveluntarjoajaltasi.","internet-services-ddns-title":"DDNS","menu-internet-services-ddns-title":"DDNS"});
	gettextCatalog.setStrings('sv-SE', {"Interface":"Interface","Network":"Nätverk","Script":"Skript","Web":"Web","Enabled":"Aktiv","Label":"Namn","IP Retreival Method":"IP Uppslagningsmetod","Pick Connection":"Välj uppkoppling","Pick Interface":"Välj enhet","Enter website to poll for ip address":"Ange hemsida att använda för att ta reda på IP adressen","Script Path":"Skriptets sökväg","Enter path to script on router":"Ange sökväg till skriptet du vill köra på boxen","Provider":"Leverantör","Choose DNS Provider":"Välj DNS server","Domain name":"Domännamn","Username":"Användarnamn","Password":"Lösenord","Use HTTPS":"Använd HTTPS","Enter DDNS Provider":"Ange DDNS Provider","DDNS (Dynamic DNS)":"DDNS (Dynamisk DNS)","ddns.config.info":"Konfigurera dymanisk DNS","internet-services-ddns-title":"DDNS","menu-internet-services-ddns-title":"DDNS"});
}]);

