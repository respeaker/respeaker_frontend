
//! Author: Martin K. Schröder <mkschreder.uk@gmail.com>
/*
JUCI.app
.config(function($stateProvider) {
	$stateProvider.state("status", {
		url: "/status", 
		onEnter: function($state){
			$juci.redirect("status-status"); 
		},
	}); 
}); 
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
.controller("StatusRestartPageCtrl", function($scope, $rpc){
	$scope.onRestart = function(){
		$scope.showConfirmation = 1; 
		/*$rpc.juci.system.reboot().done(function(){
			console.log("Restarting the system..."); 
		}); */
	}
	
	function waitUntilDown(){
		var deferred = $.Deferred(); 
		var rpc = false; 
		var interval = setInterval(function(){
			if(!rpc){
				rpc = true; 
				$rpc.session.access().done(function(){
					
				}).fail(function(){
					clearInterval(interval); 
					deferred.resolve(); 
				}).always(function(){
					rpc = false; 
				}); 
			}
		}, 1000); 
		return deferred.promise(); 
	}
	$scope.onConfirmRestart = function(){
		$scope.showRestartProgress = 1; 
		$scope.showConfirmation = 0; 
		$scope.progress = 0; 
		$rpc.juci.system.reboot().done(function(){
			var rpc = true; 
			$scope.message = "Waiting for reboot..."; 
			$scope.$apply(); 
			var interval = setInterval(function(){
				$scope.progress++; 
				$scope.$apply(); 
				if(!rpc){
					rpc = true; 
					$rpc.$authenticate().done(function(){
						// it will not succeed anymore because box is rebooting
					}).fail(function(){
						//$scope.showConfirmation = 0; 
						$scope.$apply(); 
						window.location.reload(); 
					}).always(function(){
						rpc = false; 
					}); 
				}
			}, 1000); 
			
			waitUntilDown().done(function(){
				$scope.message = "Host is rebooting..."; 
				$scope.$apply(); 
				rpc = false; 
			}); 
			console.log("Restarting the system..."); 
		});
	}
	$scope.onCancelRestart = function(){
		$scope.showConfirmation = 0; 
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
.controller("StatusNetworkPage", function ($scope, $rootScope, $rpc, gettext, $tr) {
	$scope.systemConnectionsTbl = {
		rows: [["", ""]]
	}; 
	$scope.systemDHCPLeasesTbl = {
		columns: [gettext("Hostname"), gettext("IPv4-Address"), gettext("MAC-Address"), gettext("Leasetime remaining")], 
		rows: [
			[gettext("No active leases"), '', '', '']
		]
	}; 
	$scope.systemStationsTbl = {
		columns: [gettext("IPv4-Address"), gettext("MAC address"), gettext("Signal"), gettext("Noise"), gettext("RX Rate"), gettext("TX Rate")], 
		rows: []
	};
	var conntrack = {}; 
	var clients = {}; 
	var leases = {}; 
	
	JUCI.interval.repeat("status.system.refresh", 1000, function(resume){
		async.parallel([
			function (cb){$rpc.juci.network.conntrack_count().done(function(res){conntrack = res; cb();}).fail(function(res){cb();});},
			function (cb){$rpc.juci.network.clients().done(function(res){clients = res.clients; cb();}).fail(function(res){cb();});},
			function (cb){$rpc.juci.network.dhcp_leases().done(function(res){leases = res.leases || []; cb();}).fail(function(res){cb();});}
		], function(err, next){
			$scope.systemConnectionsTbl.rows = [
				[$tr(gettext("Active Connections")), '<juci-progress value="'+ conntrack.count +'" total="'+conntrack.limit+'"></juci-progress>']
			]; 
			if(leases.length){
				$scope.systemDHCPLeasesTbl.rows = []; 
				leases.map(function(lease){
					var date = new Date(null);
					date.setSeconds(lease.expires); // specify value for SECONDS here
					var time = date.toISOString().substr(11, 8);
					$scope.systemDHCPLeasesTbl.rows.push(
						[lease.hostname, lease.ipaddr, lease.macaddr, time]
					);  
				}); 
			} else {
				$scope.systemDHCPLeasesTbl.rows = [
					[$tr(gettext("No active leases")), '', '', '']
				]; 
			}
			if(Object.keys(clients).length){
				$scope.systemStationsTbl.rows = []; 
				Object.keys(clients).map(function(id){
					var cl = clients[id]; 
					$scope.systemStationsTbl.rows.push(
						[cl.ipaddr, cl.macaddr, 0, 0, cl.rx_rate || 0, cl.tx_rate || 0]
					); 
				}); 
			} else {
				$scope.systemStationsTbl.rows = [
					[$tr(gettext("No active stations")), '', '', '', '', '']
				]; 
			}
			$scope.$apply(); 
		}, function(){
			resume(); 
		});
	}); 
}); 

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"Hostname":"","IPv4-Address":"","MAC-Address":"","Leasetime remaining":"","No active leases":"","MAC address":"","Signal":"","Noise":"","RX Rate":"","TX Rate":"","Active Connections":"","No active stations":"","Event Log":"","status.eventlog.info":"Here you can view system event log (Note: only latest 20 lines are shown) ","Select events to show":"","Log":"","Date":"","Type":"","Source":"","Message":"","Restart":"","status.restart.info":"This page allows to restart your Internet connection and reboot your router. Please note that for the entire process all phone, internet and TV services will be temporarily unavailable. ","Click here to restart your device":"","Restart takes about 3 minutes. When restart is completed the page will reload automatically. ":"","Connections":"","DHCP Leases":"","Active Stations":"","status-title":"Status","status-restart-title":"Restart","status-events-title":"Event Log","status-status-network-title":"Network Status","menu-status-title":"Status","menu-status-restart-title":"Restart","menu-status-events-title":"Event Log","menu-status-status-network-title":"Network Status"});
	gettextCatalog.setStrings('fi', {"Hostname":"Isäntäkoneen nimi","IPv4-Address":"IPv4-osoite","MAC-Address":"MAC Osoite","Leasetime remaining":"Leasetime - jäljellä oleva aika","No active leases":"Ei aktiivisia leaseja","MAC address":"MAC-osoite","Signal":"Signaali","Noise":"Kohina","RX Rate":"RX Nopeus","TX Rate":"TX Nopeus","Active Connections":"Aktiivisia yhteyksiä","No active stations":"Ei aktiivisia tukiasemia","Event Log":"Tapahtumaloki","status.eventlog.info":"Valitse kategoriat, jotka haluat nähdä tapahtumalokissa.","Log":"Loki","Date":"Päivämäärä","Type":"Tyyppi","Source":"Lähde","Message":"Viesti","Restart":"Käynnistä uudelleen","status.restart.info":"Tällä sivulla voit yhdistää Internetiin uudelleen ja käynnistää modeemin uudelleen. Huomioi, että puhelin, Internet ja TV palvelut ovat poissa käytöstä prosessin aikana.","Click here to restart your device":"Paina tästä käynnistääksesi laitteesi uudelleen","Restart takes about 3 minutes. When restart is completed the page will reload automatically. ":"Uudelleenkäynnistys kestää noin 3 minuuttia. Kun uudelleenkäynnistys on valmis, sivu latautuu automaattisesti uudelleen.","Connections":"Yhteydet","DHCP Leases":"DHCP-varaukset","Active Stations":"Aktiivisia tukiasemia","status-title":"Status","status-restart-title":"Käynnistä uudelleen","status-events-title":"Tapahtumat","status-status-network-title":"Verkko","menu-status-title":"Status","menu-status-restart-title":"Uudelleenkäynnistys","menu-status-events-title":"Tapahtumat","menu-status-status-network-title":"Verkko"});
	gettextCatalog.setStrings('sv-SE', {"Hostname":"Datornamn","IPv4-Address":"IPv4-Adress","MAC-Address":"MAC-Adress","Leasetime remaining":"Återstående lease-tid","No active leases":"Inga aktiva leasar","MAC address":"MAC-adress","Signal":"Signal","Noise":"Brus","RX Rate":"RX","TX Rate":"TX","Active Connections":"Aktiva uppkopplingar","No active stations":"Inga aktiva klienter","Event Log":"Händelselogg","status.eventlog.info":"Händelseflöde","Log":"Logg","Date":"Datum","Type":"Typ","Source":"Källa","Message":"Meddelande","Restart":"Starta om","status.restart.info":"Starta om din router","Click here to restart your device":"Klicka här för att starta om din gateway.","Restart takes about 3 minutes. When restart is completed the page will reload automatically. ":"Omstart tar cirka 3 minuter. När omstarted är klar så laddas sidan om automatiskt.","Connections":"Uppkopplingar","DHCP Leases":"DHCP Leasar","Active Stations":"Aktiva klienter","status-title":"Status","status-restart-title":"Omstart","status-events-title":"Logghändelser","status-status-network-title":"Nätverk","menu-status-title":"Status","menu-status-restart-title":"Omstart","menu-status-events-title":"Events","menu-status-status-network-title":"Nätverk"});
}]);

JUCI.style({"css":"\n\n\n"});
JUCI.template("pages/status-restart.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"StatusRestartPageCtrl\">\n<juci-config title=\"{{'Restart'|translate}}\">\n<juci-config-info>{{ 'status.restart.info' | translate }}</juci-config-info>\n<div class=\"alert alert-default\"></div>\n<juci-config-lines>\n<juci-config-line title=\"{{'Click here to restart your device'|translate}}\">\n<button class=\"btn btn-lg btn-default\" ng-click=\"onRestart()\">Restart</button>\n</juci-config-line>\n</juci-config-lines>\n</juci-config>\n<modal title=\"Are you sure you want to restart?\" ng-show=\"showConfirmation\" on-accept=\"onConfirmRestart()\" on-dismiss=\"onCancelRestart()\" accept-label=\"Reboot\" dismiss-label=\"Cancel\">\n<p translate>Restart takes about 3 minutes. When restart is completed the page will reload automatically. </p>\n</modal>\n<modal title=\"Restarting...\" ng-show=\"showRestartProgress\">\n<p style=\"text-align: center;\">{{message}} ({{progress}}s)<br/><br/><i class=\"fa fa-spinner fa-spin fa-4x\"></i></p>\n</modal>\n</div>\n</juci-layout-with-sidebar>\n");JUCI.template("pages/status-status-network.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"StatusNetworkPage\">\n<juci-table\ntitle=\"{{'Connections'|translate}}\"\ndata=\"systemConnectionsTbl\"></juci-table>\n<juci-table\ntitle=\"{{'DHCP Leases'|translate}}\"\ndata=\"systemDHCPLeasesTbl\"></juci-table>\n<juci-table\ntitle=\"{{'Active Stations'|translate}}\"\ndata=\"systemStationsTbl\"></juci-table>\n</div>\n</juci-layout-with-sidebar>\n");